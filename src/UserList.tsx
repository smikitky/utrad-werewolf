import {
  FC,
  MouseEventHandler,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useState
} from 'react';
import { UserEntry } from './game-data';
import useFirebaseSubscription from './utils/useFirebaseSubscription';
import classNames from 'classnames';
import styled from 'styled-components';
import Icon from './Icon';
import { useLoginUser } from './utils/user';
import { Link } from 'react-router-dom';

export type UserListCommand = 'toggleReady' | 'toggleOnline' | 'toggleGod';

const UserList: FC<{
  onlineOnly?: boolean;
  showAdminMenu?: boolean;
  onUserCommand?: (
    uid: string,
    user: UserEntry,
    command: UserListCommand
  ) => void;
}> = props => {
  const { onlineOnly = false, showAdminMenu, onUserCommand } = props;
  const users = useFirebaseSubscription<{
    [uid: string]: UserEntry;
  }>('/users');
  const loginUser = useLoginUser();

  const [menu, setMenu] = useState<{
    target: string;
    x: number;
    y: number;
    w: number;
  } | null>(null);

  useEffect(() => {
    if (!menu) return;
    const handler = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.user-list-menu')) return;
      setMenu(null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menu]);

  const sorted = useMemo(() => {
    if (!users.data) return [];
    return Object.entries(users.data)
      .filter(([uid, user]) => !onlineOnly || user.onlineStatus === true)
      .sort(([aUid, aUser], [bUid, bUser]) => {
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
  }, [users.data, onlineOnly]);

  const handleUserClick = (
    ev: ReactMouseEvent,
    uid: string,
    user: UserEntry
  ) => {
    if (!showAdminMenu) return;
    if (menu?.target === uid) {
      setMenu(null);
    } else {
      const elem = ev.currentTarget as HTMLElement;
      ev.stopPropagation();
      setMenu({
        target: uid,
        x: elem.offsetLeft,
        y: elem.offsetTop + elem.offsetHeight,
        w: elem.offsetWidth
      });
    }
  };

  const handleMenuSelect: MouseEventHandler = ev => {
    if (!menu || !onUserCommand || !users.data) return;
    const command = (ev.target as HTMLElement).dataset
      .command as UserListCommand;
    const target = menu.target;
    onUserCommand(target, users.data[target], command);
    setMenu(null);
  };

  if (!users.data || loginUser.status !== 'loggedIn') return null;
  const selectedUser = menu ? users.data[menu.target] : null;

  return (
    <StyledDiv>
      <ul>
        {sorted.map(([uid, user]) => (
          <li
            key={uid}
            className={classNames({
              online: !!user.onlineStatus,
              ready: !!user.ready,
              'in-game': user.currentGameId,
              active: menu?.target === uid,
              clickable: showAdminMenu
            })}
            onClick={ev => handleUserClick(ev, uid, user)}
            title={uid}
          >
            <span className="status">
              <Icon
                icon={
                  !user.onlineStatus
                    ? 'no_accounts'
                    : user.ready
                    ? 'check_circle'
                    : 'pause_circle'
                }
              />
            </span>
            <span className="name">
              {user.name}
              {user.canBeGod && (
                <span title="管理者" className="god-indicator">
                  ★
                </span>
              )}
            </span>
            {user.currentGameId && <Icon icon="play_arrow" />}
          </li>
        ))}
      </ul>
      {menu && selectedUser && (
        <div
          className="user-list-menu"
          role="menu"
          style={{ left: menu.x, top: menu.y, width: menu.w }}
        >
          <ul onClick={handleMenuSelect}>
            {selectedUser.currentGameId && (
              <li data-command="goToGame">
                <Link to={`/god/${selectedUser.currentGameId}`}>ゲームへ</Link>
              </li>
            )}
            {selectedUser.onlineStatus && !selectedUser.currentGameId && (
              <li data-command="toggleReady">
                {selectedUser.ready ? '一時待機中にする' : '準備OKにする'}
              </li>
            )}
            <li data-command="profile">
              <Link to={`/profile/${menu.target}`}>プロフィール</Link>
            </li>
            <li data-command="toggleOnline">
              {selectedUser.onlineStatus
                ? '強制オフライン化'
                : '強制オンライン化'}
            </li>
            {menu.target !== loginUser.uid && (
              <li data-command="toggleGod">
                {selectedUser.canBeGod
                  ? '管理者権限を剥奪'
                  : '管理者権限を付与'}
              </li>
            )}
          </ul>
        </div>
      )}
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  position: relative;
  > ul {
    display: grid;
    gap: 5px;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    list-style: none;
    li {
      display: flex;
      align-items: center;
      gap: 4px;
      border-radius: 4px;
      background-color: silver;
      padding: 0 5px;
      user-select: none;
      .name {
        flex: 1;
      }
      .god-indicator {
        color: #915e00;
      }
      &.online {
        background-color: #aaffaa;
      }
      &.in-game {
        background-color: #ffffaa;
      }
      &.online.ready .status .material-icons {
        color: green;
      }
      &.online:not(.ready) .status .material-icons {
        color: brown;
      }
      &.active {
        filter: brightness(1.2);
      }
      &.clickable {
        cursor: pointer;
        &:hover {
          filter: brightness(1.2);
        }
      }
    }
  }
  .user-list-menu {
    position: absolute;
    background-color: white;
    border: 1px solid gray;
    ul {
      list-style: none;
      li {
        padding: 0 5px;
        cursor: pointer;
        &:hover {
          background-color: #eeeeee;
        }
        a {
          display: block;
          color: inherit;
          text-decoration: none;
        }
      }
    }
  }
`;

export default UserList;
