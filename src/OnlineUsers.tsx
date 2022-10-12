import { FC } from 'react';
import { UserEntry } from './game-data';
import useFirebaseSubscription from './utils/useFirebaseSubscription';
import classNames from 'classnames';
import styled from 'styled-components';

const OnlineUsers: FC<{
  onUserClick?: (uid: string, user: UserEntry) => void;
}> = props => {
  const { onUserClick } = props;
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
            online: !!user.onlineStatus,
            ready: !!user.ready,
            'in-game': user.currentGameId,
            clickable: !!onUserClick
          })}
          onClick={() => onUserClick && onUserClick(uid, user)}
        >
          {user.onlineStatus && user.ready ? '✅ ' : '❌ '}
          {user.name}
          {user.currentGameId && <span> (In game)</span>}
        </li>
      ))}
    </StyledList>
  );
};

const StyledList = styled.ul`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  list-style: none;
  li {
    border-radius: 4px;
    background-color: silver;
    padding: 0 10px;
    user-select: none;
    &.online {
      background-color: #aaffaa;
    }
    &.in-game {
      background-color: #ffffaa;
    }
    &.clickable {
      cursor: pointer;
      &:hover {
        filter: brightness(1.2);
      }
    }
  }
`;

export default OnlineUsers;
