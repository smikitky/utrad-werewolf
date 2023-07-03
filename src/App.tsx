import { getRedirectResult, onAuthStateChanged } from 'firebase/auth';
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
import { auth, database } from './utils/firebase.js';
import { ApiCaller, ApiContext } from './utils/useApi.js';
import useFirebaseSubscription from './utils/useFirebaseSubscription.js';
import {
  LoginType,
  LoginUser,
  LoginUserContext,
  useLoginUser
} from './utils/user.js';

import GameStage from './GameStage.js';
import GodMenu from './GodMenu.js';
import GodMode from './GodMode.js';
import LoginScreen from './LoginScreen.js';
import Menu from './Menu.js';
import Profile from './Profile.js';
import Icon from './Icon.js';
import Switch from './Switch.js';
import useLang, {
  Lang,
  LangContext,
  SetLangContext,
  useSetLang
} from './utils/useLang.js';

const MessagesContext = createContext<{
  list: (ReactNode | string)[];
  dismiss: (index: number) => void;
}>({ list: [], dismiss: () => {} });

const Layout: FC = props => {
  const user = useLoginUser();
  const messages = useContext(MessagesContext);
  const lang = useLang();
  const setLang = useSetLang();

  return (
    <>
      <header>
        <div>
          <Link to="/">
            <Icon icon="home" />
            トップへ
          </Link>
        </div>
        <div>
          <Switch
            leftLabel="EN"
            rightLabel="JA"
            value={lang === 'en' ? 'left' : 'right'}
            onChange={s => setLang(s === 'right' ? 'ja' : 'en')}
          />
          |
          {user.status === 'loggedIn' && user.data.canBeGod === true && (
            <>
              <Link to="/god">
                <Icon icon="policy" />
                神になる
              </Link>{' '}
              |{' '}
            </>
          )}
          {user.status === 'loggedIn' ? (
            <Link to={`/profile/${user.uid}`}>
              <Icon icon="person" /> <b>{user.data.name}</b>
            </Link>
          ) : user.status === 'indeterminate' ? (
            '...'
          ) : (
            'Logged out'
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
      { path: 'login', element: <LoginScreen /> },
      { path: 'game/:gameId', element: <GameStage /> },
      { path: 'profile/:uid', element: <Profile /> },
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

  const [lang, setLang] = useState<Lang>('ja');

  const userProfile = useFirebaseSubscription<UserEntry | null>(
    uid ? `/users/${uid}` : undefined
  );

  const user = useMemo<LoginUser>(() => {
    // console.log('USER', { uid, loginType, userProfile });
    return uid && loginType && userProfile.data
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
      // console.log('AUTH STATE CHANGED', user);
      setUid(user ? user.uid : null);
      setLoginType(
        user ? (user.isAnonymous ? 'anonymous' : 'google') : undefined
      );
      getTokenRef.current = user ? user.getIdToken.bind(user) : null;
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (uid && !userProfile?.data?.createdAt) {
      apiCaller('setProfile', {});
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
    <LoginUserContext.Provider value={user}>
      <ApiContext.Provider value={apiCaller}>
        <MessagesContext.Provider value={messageList}>
          <LangContext.Provider value={lang}>
            <SetLangContext.Provider value={setLang}>
              <StyledDiv>
                {linkErrorCode && <div>Error {linkErrorCode}</div>}
                <RouterProvider router={router} />
              </StyledDiv>
            </SetLangContext.Provider>
          </LangContext.Provider>
        </MessagesContext.Provider>
      </ApiContext.Provider>
    </LoginUserContext.Provider>
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
    padding: 0 0.5em;
    display: flex;
    flex-flow: row wrap;
    justify-content: space-between;
    background: #eeeeee;
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
