import { signOut } from 'firebase/auth';
import * as db from 'firebase/database';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import AgentCountEditor from './AgentCountEditor.js';
import { AgentCount, defaultAgentCount } from './game-data.js';
import { agentTotalCount } from './game-utils.js';
import UserList from './UserList.js';
import { auth, database } from './utils/firebase.js';
import { useApi } from './utils/useApi.js';
import withLoginBoundary, { Page } from './withLoginBoundary.js';

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
      <h2>メニュー</h2>
      <nav>
        <button onClick={handleStartNewGame} disabled={!loginUser.data.ready}>
          新規ゲームを始める
        </button>
        <button onClick={handleReadyClick}>準備状態の切り替え</button>
        <button onClick={handleProfileClick}>プロフィールを編集</button>
        <button onClick={handleLogoutClick}>ログアウト</button>
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
      <h2>オンラインのユーザー</h2>
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

export default withLoginBoundary({ redirect: true })(Menu);
