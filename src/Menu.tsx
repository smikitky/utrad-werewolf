import { signOut } from 'firebase/auth';
import * as db from 'firebase/database';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import AgentCountEditor from './AgentCountEditor.js';
import { AgentCount, defaultAgentCount } from './game-data.js';
import { agentTotalCount } from './game-utils.js';
import Icon from './Icon.js';
import UserList from './UserList.js';
import { auth, database } from './utils/firebase.js';
import { useApi } from './utils/useApi.js';
import withLoginBoundary, { Page } from './withLoginBoundary.js';
import { makeLangResource } from './LangResource.js';

const LangResource = makeLangResource({
  start: { en: '-player Werewolf', ja: '人で新規ゲームを開始' },
  ready: { en: "I'm Ready!", ja: '準備OK!' },
  pause: { en: 'Not Ready', ja: '一時的に不参加' },
  profile: { en: 'Profile', ja: 'プロフィール' },
  logout: { en: 'Log Out', ja: 'ログアウト' },
  customizeMembers: {
    en: 'Customize Members',
    ja: 'メンバー構成をカスタマイズする'
  },
  onlineUsers: { en: 'Online Users', ja: 'オンラインのユーザー' }
});

const Menu: Page = ({ loginUser }) => {
  const api = useApi();
  const navigate = useNavigate();

  const [customMode, setCustomMode] = useState(false);
  const [agentCount, setAgentCount] = useState<AgentCount>(defaultAgentCount);

  const handleLogoutClick = async () => {
    await signOut(auth);
  };

  const handleStartNewGame = async () => {
    await api('matchNewGame', customMode ? { agentCount } : {});
  };

  const handleReadyClick = async () => {
    if (loginUser.status !== 'loggedIn') return;
    const ready = !loginUser.data.ready;
    const ref = db.ref(database, 'users/' + loginUser.uid);
    await db.update(ref, { ready });
  };

  const handleProfileClick = async () => {
    navigate(`/profile/${loginUser.uid}`);
  };

  useEffect(() => {
    // Navigate to the game screen if the user is (already) in a game
    if (loginUser.data.currentGameId) {
      navigate(`/game/${loginUser.data.currentGameId}`);
    }
  }, [loginUser]);

  return (
    <StyledDiv>
      <h1>UTRAD Werewolf</h1>
      <nav>
        <button
          onClick={handleStartNewGame}
          disabled={!loginUser.data.ready}
          className="start"
        >
          <Icon icon="play_arrow" />
          <big>
            {agentTotalCount(customMode ? agentCount : defaultAgentCount)}
          </big>
          <LangResource id="start" />
        </button>
        <div className="sub">
          <button onClick={handleReadyClick}>
            {loginUser.data.ready ? (
              <>
                <Icon icon="pause" />
                <LangResource id="pause" />
              </>
            ) : (
              <>
                <Icon icon="play_circle" />
                <LangResource id="ready" />
              </>
            )}{' '}
          </button>
          <button onClick={handleProfileClick}>
            <Icon icon="person" />
            <LangResource id="profile" />
          </button>
          <button onClick={handleLogoutClick}>
            <Icon icon="logout" />
            <LangResource id="logout" />
          </button>
        </div>
      </nav>
      <div className="custom">
        <label>
          <input
            type="checkbox"
            checked={customMode}
            onChange={e => setCustomMode(e.target.checked)}
          />{' '}
          <LangResource id="customizeMembers" />
        </label>
        {customMode && (
          <>
            <AgentCountEditor value={agentCount} onChange={setAgentCount} />
            <div className="menu">
              (合計: {agentTotalCount(agentCount)}人)&ensp;
              <button onClick={() => setAgentCount(defaultAgentCount)}>
                リセット
              </button>
            </div>
          </>
        )}
      </div>
      <h2>
        <LangResource id="onlineUsers" />
      </h2>
      <UserList onlineOnly={true} />
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  padding: 10px;
  > nav {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    .start {
      min-height: 50px;
      font-size: 120%;
    }
    .sub {
      display: flex;
      flex-flow: column;
      gap: 10px;
    }
  }
  .custom {
    user-select: none;
    margin: 20px 0;
    border: 1px solid silver;
    padding: 5px;
    > .menu {
      margin-top: 10px;
    }
  }
`;

export default withLoginBoundary({ redirect: true })(Menu);
