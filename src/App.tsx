import {
  getRedirectResult,
  linkWithRedirect,
  onAuthStateChanged,
  signInAnonymously,
  signInWithRedirect,
  signOut
} from 'firebase/auth';
import * as db from 'firebase/database';
import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  createBrowserRouter,
  Link,
  Outlet,
  RouterProvider
} from 'react-router-dom';
import styled from 'styled-components';
import { UserEntry } from './game-data.js';
import { auth, database, googleAuthProvider } from './utils/firebase.js';
import { ApiCaller, ApiContext } from './utils/useApi.js';
import useFirebaseSubscription from './utils/useFirebaseSubscription.js';
import {
  LoginManager,
  LoginManagerContext,
  LoginType,
  LoginUser,
  LoginUserContext,
  useLoginUser
} from './utils/user.js';

import GameStage from './GameStage.js';
import GodMenu from './GodMenu.js';
import GodMode from './GodMode.js';
import Menu from './Menu.js';

const MessagesContext = createContext<{
  list: (ReactNode | string)[];
  dismiss: (index: number) => void;
}>({ list: [], dismiss: () => {} });

const Layout: FC = props => {
  const user = useLoginUser();
  const messages = useContext(MessagesContext);

  return (
    <>
      <header>
        <div>
          <Link to="/">UTRAD Werewolf</Link>
        </div>
        <div>
          User:{' '}
          {user.status === 'loggedIn' ? (
            <>
              <b>{user.data.name}</b> ({user.uid})
            </>
          ) : (
            'logged out'
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <div className="messages">
        {messages.list.map((message, i) => (
          <div className="message" key={i} onClick={() => messages.dismiss(i)}>
            {message}
          </div>
        ))}
      </div>
    </>
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: <Menu /> },
      { path: 'game/:gameId', element: <GameStage /> },
      { path: 'god', element: <GodMenu /> },
      { path: 'god/:gameId', element: <GodMode /> }
    ]
  }
]);

const App: FC = () => {
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  const [loginType, setLoginType] = useState<LoginType | undefined>(undefined);
  const [linkErrorCode, setLinkErrorCode] = useState<string | undefined>(
    undefined
  );
  const getTokenRef = useRef<null | (() => Promise<string>)>(null);
  const [messages, setMessages] = useState<(string | ReactNode)[]>([]);

  const userProfile = useFirebaseSubscription<UserEntry | null>(
    uid ? `/users/${uid}` : undefined
  );

  const loginManager = useMemo<LoginManager>(() => {
    return {
      login: async (method: LoginType) => {
        if (method === 'anonymous') {
          await signInAnonymously(auth);
        } else {
          await signInWithRedirect(auth, googleAuthProvider);
        }
      },
      link: async () => {
        const user = auth.currentUser;
        if (!user) throw new Error('Not singed in');
        await linkWithRedirect(user, googleAuthProvider);
      },
      logout: async () => {
        await signOut(auth);
      }
    };
  }, []);

  const user = useMemo<LoginUser>(() => {
    console.log('USER', { uid, loginType, userProfile });
    return uid && loginType && userProfile.data?.createdAt
      ? {
          status: 'loggedIn',
          uid,
          loginType,
          data: userProfile.data
        }
      : uid === undefined || (uid && userProfile.data === undefined)
      ? { status: 'indeterminate' }
      : { status: 'loggedOut' };
  }, [uid, loginType, userProfile]);

  const apiCaller = useMemo<ApiCaller>(() => {
    const callApi = async (
      type: string,
      payload: any,
      options: { asUser?: string; noError?: boolean } = {}
    ) => {
      const { asUser, noError } = options;
      if (!getTokenRef.current) throw new Error('Not signed in');
      const idToken = await getTokenRef.current();
      const res = await fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
          ...(asUser ? { 'X-Godmode-UID-Override': asUser } : {})
        },
        body: JSON.stringify({ type, payload })
      });
      const data = await res.json();
      if (!res.ok && !noError) {
        setMessages(messages => [
          ...messages,
          <div>
            <b>エラー:</b> {data.message}
          </div>
        ]);
      }
      return { ok: res.ok, status: res.status, data };
    };
    return callApi;
  }, []);

  const dismissMessage = useCallback((index: number) => {
    setMessages(messages => messages.filter((_, i) => i !== index));
  }, []);

  const messageList = useMemo(
    () => ({ list: messages, dismiss: dismissMessage }),
    [messages, dismissMessage]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setUid(user ? user.uid : null);
      setLoginType(
        user ? (user.isAnonymous ? 'anonymous' : 'google') : undefined
      );
      getTokenRef.current = user ? user.getIdToken.bind(user) : null;
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (uid && userProfile?.data === null) {
      userProfile.update({
        createdAt: new Date().getTime(),
        name: 'new user',
        ready: true
      });
    }
  }, [uid, userProfile]);

  useEffect(() => {
    // Save online status to firebase
    if (!uid) return;
    const connRef = db.ref(database, '.info/connected');
    const unsubscribe = db.onValue(connRef, snapshot => {
      if (!snapshot.val()) return;
      const statusRef = db.ref(database, `/users/${uid}/onlineStatus`);
      db.onDisconnect(statusRef)
        .set(false)
        .then(() => db.set(statusRef, true));
    });
    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    // Check redirect result after redirection
    (async () => {
      try {
        await getRedirectResult(auth);
      } catch (err: any) {
        const code = err.code;
        setLinkErrorCode(code);
      }
    })();
  }, []);

  return (
    <LoginManagerContext.Provider value={loginManager}>
      <LoginUserContext.Provider value={user}>
        <ApiContext.Provider value={apiCaller}>
          <MessagesContext.Provider value={messageList}>
            <StyledDiv>
              {linkErrorCode && <div>Error {linkErrorCode}</div>}
              <RouterProvider router={router} />
            </StyledDiv>
          </MessagesContext.Provider>
        </ApiContext.Provider>
      </LoginUserContext.Provider>
    </LoginManagerContext.Provider>
  );
};

const StyledDiv = styled.div`
  position: relative;
  height: 100vh;
  width: 100vw;
  margin: 0 auto;
  max-width: 1024px;
  display: flex;
  flex-direction: column;
  background: white;
  header {
    padding: 0.5em;
    display: flex;
    justify-content: space-between;
    background: silver;
    border-bottom: 1px solid gray;
    a {
      font-weight: bold;
      color: inherit;
      text-decoration: none;
    }
  }
  main {
    flex: 1;
    overflow: auto;
  }
  .messages {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 100;
    > .message {
      padding: 10px 15px;
      border: 1px solid orange;
      margin-bottom: 10px;
      background: pink;
    }
  }
`;

export default App;
