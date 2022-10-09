import { FC } from 'react';
import { UserEntry } from './game-data';
import useFirebaseSubscription from './utils/useFirebaseSubscription';
import classNames from 'classnames';
import styled from 'styled-components';

const OnlineUsers: FC = () => {
  const users = useFirebaseSubscription<{
    [uid: string]: UserEntry;
  }>('/users');

  if (!users.data) return null;

  return (
    <StyledList>
      {Object.entries(users.data).map(([uid, user]) => (
        <li
          key={uid}
          className={classNames({
            online: user.onlineStatus,
            'in-game': user.currentGameId
          })}
        >
          {user.name}
          {user.currentGameId && <span>(In game)</span>}
        </li>
      ))}
    </StyledList>
  );
};

const StyledList = styled.ul`
  display: grid;
  gap: 10px;
  padding: 0 15px;
  grid-template-columns: repeat(auto-fit, minmax(150px, 200px));
  list-style: none;
  li {
    border-radius: 4px;
    background-color: silver;
    padding: 0 10px;
    &.online {
      background-color: #aaffaa;
    }
    &.in-game {
      background-color: #ffffaa;
    }
  }
`;

export default OnlineUsers;
