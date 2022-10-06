import {
  getRedirectResult,
  linkWithRedirect,
  onAuthStateChanged,
  signInAnonymously,
  signInWithRedirect,
  signOut
} from 'firebase/auth';
import * as db from 'firebase/database';
import { FC, useEffect, useMemo, useState } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Link,
  Outlet
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
import Menu from './Menu.js';

const Layout: FC = props => {
  const user = useLoginUser();
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
    </>
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: <Menu /> },
      { path: 'game/:gameId', element: <GameStage /> }
    ]
  }
]);

const App: FC = () => {
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  const [loginType, setLoginType] = useState<LoginType | undefined>(undefined);
  const [linkErrorCode, setLinkErrorCode] = useState<string | undefined>(
    undefined
  );
  const [idToken, setIdToken] = useState<string>('');

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
    return uid && loginType && userProfile.data?.createdAt && idToken
      ? {
          status: 'loggedIn',
          uid,
          loginType,
          data: userProfile.data
        }
      : uid === undefined || (uid && userProfile.data === undefined)
      ? { status: 'indeterminate' }
      : { status: 'loggedOut' };
  }, [uid, loginType, userProfile, idToken]);

  const apiCaller = useMemo<ApiCaller>(() => {
    return (type: string, payload: any) => {
      return fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ type, payload })
      });
    };
  }, [idToken]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setUid(user ? user.uid : null);
      setLoginType(
        user ? (user.isAnonymous ? 'anonymous' : 'google') : undefined
      );
      user?.getIdToken().then(setIdToken);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (uid && !userProfile?.data) {
      userProfile.update({
        createdAt: new Date().getTime(),
        name: 'new user'
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
          <StyledDiv>
            {linkErrorCode && <div>Error {linkErrorCode}</div>}
            <RouterProvider router={router} />
          </StyledDiv>
        </ApiContext.Provider>
      </LoginUserContext.Provider>
    </LoginManagerContext.Provider>
  );
};

const StyledDiv = styled.div`
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
  }
  main {
    flex: 1;
    overflow: auto;
  }
`;

export default App;
