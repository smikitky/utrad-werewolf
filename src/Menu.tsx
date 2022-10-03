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

  useEffect(() => {
    // Navigate to the game screen if the user is (already) in a game
    if (loginUser.status === 'loggedIn' && loginUser.data.currentGameId) {
      navigate(`/game/${loginUser.data.currentGameId}`);
    }
  }, [loginUser]);

  return (
    <StyledDiv>
      <h2>Users</h2>
      <OnlineUsers />
      <h2>Menu</h2>
      <nav>
        <button
          onClick={handleStartNewGame}
          disabled={loginUser.status !== 'loggedIn'}
        >
          Start New Game
        </button>
        <button
          onClick={handleLoginClick}
          disabled={loginUser.status !== 'loggedOut'}
        >
          Login with Google
        </button>
        <button
          onClick={handleLogoutClick}
          disabled={loginUser.status !== 'loggedIn'}
        >
          Logout
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
