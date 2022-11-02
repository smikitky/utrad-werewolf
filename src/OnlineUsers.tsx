import { FC, useMemo } from 'react';
import { UserEntry } from './game-data';
import useFirebaseSubscription from './utils/useFirebaseSubscription';
import classNames from 'classnames';
import styled from 'styled-components';
import Icon from './Icon';

const OnlineUsers: FC<{
  onUserClick?: (uid: string, user: UserEntry) => void;
}> = props => {
  const { onUserClick } = props;
  const users = useFirebaseSubscription<{
    [uid: string]: UserEntry;
  }>('/users');

  const sorted = useMemo(() => {
    if (!users.data) return [];
    return Object.entries(users.data).sort(([aUid, aUser], [bUid, bUser]) => {
      const ao = aUser.onlineStatus ? 1 : 0;
      const bo = bUser.onlineStatus ? 1 : 0;
      if (ao !== bo) return bo - ao;

      const ar = aUser.ready ? 1 : 0;
      const br = bUser.ready ? 1 : 0;
      if (ar !== br) return br - ar;

      if (aUser.name < bUser.name) return -1;
      if (aUser.name > bUser.name) return 1;
      return 0;
    });
  }, [users.data]);

  if (!users.data) return null;

  return (
    <StyledList>
      {sorted.map(([uid, user]) => (
        <li
          key={uid}
          className={classNames({
            online: !!user.onlineStatus,
            ready: !!user.ready,
            'in-game': user.currentGameId,
            clickable: !!onUserClick
          })}
          onClick={() => onUserClick && onUserClick(uid, user)}
          title={uid}
        >
          <span className="status">
            <Icon
              icon={
                !user.onlineStatus
                  ? 'no_accounts'
                  : user.ready
                  ? 'check_circle'
                  : 'hourglass_empty'
              }
            />
          </span>
          <span className="name">{user.name}</span>
          {user.currentGameId && <Icon icon="play_arrow" />}
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
    height: 2em;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 4px;
    background-color: silver;
    padding: 0 10px;
    user-select: none;
    .name {
      flex: 1;
    }
    &.online {
      background-color: #aaffaa;
    }
    &.in-game {
      background-color: #ffffaa;
    }
    &.ready .status .material-icons {
      color: green;
    }
    &:not(.ready) .status .material-icons {
      color: brown;
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
