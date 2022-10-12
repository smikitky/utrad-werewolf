import * as db from 'firebase/database';
import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import AgentCountEditor from './AgentCountEditor.js';
import { AgentCount, defaultAgentCount } from './game-data.js';
import { agentTotalCount } from './game-utils.js';
import OnlineUsers from './OnlineUsers.js';
import { database } from './utils/firebase.js';
import { useApi } from './utils/useApi.js';
import { useLoginManager, useLoginUser } from './utils/user.js';

const Menu: FC = () => {
  const loginManager = useLoginManager();
  const loginUser = useLoginUser();
  const api = useApi();
  const navigate = useNavigate();

  const [customMode, setCustomMode] = useState(false);
  const [agentCount, setAgentCount] = useState<AgentCount>(defaultAgentCount);

  const handleLoginClick = async () => {
    await loginManager.login('google');
  };

  const handleLogoutClick = async () => {
    await loginManager.logout();
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
    if (loginUser.status !== 'loggedIn') return;
    const name = prompt('ユーザ名を入力してください', loginUser.data.name);
    if (name === null) return;
    await api('setProfile', { name });
  };

  useEffect(() => {
    // Navigate to the game screen if the user is (already) in a game
    if (loginUser.status === 'loggedIn' && loginUser.data.currentGameId) {
      navigate(`/game/${loginUser.data.currentGameId}`);
    }
  }, [loginUser]);

  return (
    <StyledDiv>
      <h2>登録ユーザー</h2>
      <OnlineUsers />
      <h2>メニュー</h2>
      <nav>
        <button
          onClick={handleStartNewGame}
          disabled={loginUser.status !== 'loggedIn'}
        >
          新規ゲームを始める
        </button>
        <button
          onClick={handleReadyClick}
          disabled={loginUser.status !== 'loggedIn'}
        >
          準備状態の切り替え
        </button>
        <button
          onClick={handleProfileClick}
          disabled={loginUser.status !== 'loggedIn'}
        >
          プロフィールを編集
        </button>
        <button
          onClick={handleLoginClick}
          disabled={loginUser.status !== 'loggedOut'}
        >
          Googleアカウントでログイン
        </button>
        <button
          onClick={handleLogoutClick}
          disabled={loginUser.status !== 'loggedIn'}
        >
          ログアウト
        </button>
      </nav>
      <div className="custom">
        <label>
          <input
            type="checkbox"
            checked={customMode}
            onChange={e => setCustomMode(e.target.checked)}
          />{' '}
          メンバー構成をカスタマイズする
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
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  padding: 10px;
  > nav {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    button {
      padding: 15px 0;
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

export default Menu;
