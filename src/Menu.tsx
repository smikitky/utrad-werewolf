import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import OnlineUsers from './OnlineUsers.js';
import { useApi } from './utils/useApi.js';
import { useLoginManager, useLoginUser } from './utils/user.js';

const Menu: FC = () => {
  const loginManager = useLoginManager();
  const loginUser = useLoginUser();
  const api = useApi();
  const navigate = useNavigate();

  const handleLoginClick = async () => {
    await loginManager.login('google');
  };

  const handleLogoutClick = async () => {
    await loginManager.logout();
  };

  const handleStartNewGame = async () => {
    await api('matchNewGame', {});
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
        <button
          onClick={handleProfileClick}
          disabled={loginUser.status !== 'loggedIn'}
        >
          プロフィールを編集
        </button>
      </nav>
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  > nav {
    display: grid;
    gap: 10px;
    padding: 0 15px;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    button {
      padding: 15px 0;
    }
  }
`;

export default Menu;
