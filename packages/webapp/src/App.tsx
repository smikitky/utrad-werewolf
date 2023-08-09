import { UserEntry } from '@/game-data.js';
import Alert from '@/ui/Alert .js';
import GameStage from '@/ui/GameStage.js';
import Icon from '@/ui/Icon.js';
import { BasicLangResource } from '@/ui/LangResource.js';
import { LoginUserLangSwitch } from '@/ui/LangSwitch.js';
import {
  Messages,
  MessagesContext,
  MessagesDispatchContext,
  messagesReducer
} from '@/ui/Messages.js';
import { auth, database } from '@/utils/firebase.js';
import { ApiCaller, ApiContext } from '@/utils/useApi.js';
import useFirebaseSubscription from '@/utils/useFirebaseSubscription.js';
import {
  LoginType,
  LoginUser,
  LoginUserContext,
  useLoginUser
} from '@/utils/user.js';
import { getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import * as db from 'firebase/database';
import { FC, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Link,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  useRouteError
} from 'react-router-dom';
import styled from 'styled-components';

import LoginScreen from '@/routes/LoginScreen.js';
import Menu from '@/routes/Menu.js';
import Profile from '@/routes/Profile.js';
import GodAllUsers from '@/routes/god/GodAllUsers';
import GodGlobalLog from '@/routes/god/GodGlobalLog';
import GodMenu from '@/routes/god/GodMenu';
import GodModeGame from '@/routes/god/GodModeGame';
import GodSettings from '@/routes/god/GodSettings';

const Layout: FC = props => {
  const user = useLoginUser();

  return (
    <>
      <header>
        <div>
          <Link to="/">
            <Icon icon="home" />
            <BasicLangResource id="home" />
          </Link>
        </div>
        <div>
          {user.status === 'loggedIn' && user.data.canBeGod === true && (
            <>
              <Link to="/god/all-users">
                <Icon icon="policy" />
                <BasicLangResource id="godMode" />
              </Link>{' '}
              |{' '}
            </>
          )}
          {user.status === 'loggedIn' ? (
            <>
              <LoginUserLangSwitch />|
              <Link to={`/profile/${user.uid}`}>
                <Icon icon="person" /> <b>{user.data.name}</b>
              </Link>
            </>
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
      <Messages />
    </>
  );
};

const ErrorMessage = () => {
  const err = useRouteError() as any;
  return (
    <Alert>
      Applicatin Error
      {err?.statusText && (
        <div>
          ({err.status} {err.statusText})
        </div>
      )}
    </Alert>
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
      {
        path: 'god',
        element: <GodMenu />,
        children: [
          { path: 'all-users', element: <GodAllUsers /> },
          { path: 'all-games', element: <GodGlobalLog /> },
          { path: 'settings', element: <GodSettings /> }
        ]
      },
      { path: 'god/:gameId', element: <GodModeGame /> }
    ],
    errorElement: <ErrorMessage />
  }
]);

const App: FC = () => {
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  const [loginType, setLoginType] = useState<LoginType | undefined>(undefined);
  const [linkErrorCode, setLinkErrorCode] = useState<string | undefined>(
    undefined
  );
  const getTokenRef = useRef<null | (() => Promise<string>)>(null);
  const [messages, dispatch] = useReducer(messagesReducer, []);

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
        dispatch({
          type: 'add',
          payload: {
            type: 'error',
            content: (
              <>
                <b>Error:</b> {data.message}
              </>
            )
          }
        });
      }
      return { ok: res.ok, status: res.status, data };
    };
    return callApi;
  }, []);

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
      apiCaller('setProfile', { updates: {} });
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
        <MessagesContext.Provider value={messages}>
          <MessagesDispatchContext.Provider value={dispatch}>
            <StyledDiv>
              {linkErrorCode && <div>Error {linkErrorCode}</div>}
              <RouterProvider router={router} />
            </StyledDiv>
          </MessagesDispatchContext.Provider>
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
    border-bottom: 1px solid #bbbbbb;
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
`;

export default App;
