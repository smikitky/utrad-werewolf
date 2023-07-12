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
import { BasicLangResource, makeLangResource } from './LangResource';

export type UserListCommand = 'toggleReady' | 'toggleOnline' | 'toggleGod';

const LangResource = makeLangResource({
  goToGame: { en: 'Go to This Game', ja: 'ゲームへ' },
  makeReady: { en: 'Make Ready', ja: '準備OKにする' },
  makeUnready: { en: 'Make Unready', ja: '一時待機中にする' },
  forceOnline: { en: 'Force Online', ja: '強制オンライン化' },
  forceOffline: { en: 'Force Offline', ja: '強制オフライン化' },
  turnToAdmin: { en: 'Turn to Admin', ja: '管理者にする' },
  revokeAdmin: { en: 'Revoke Admin', ja: '管理者を取り消す' }
});

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
              {user.isNpc && (
                <span title="NPC" className="account-type npc">
                  <Icon icon="smart_toy" />
                </span>
              )}
              {user.canBeGod && (
                <span title="Admin" className="account-type god">
                  <Icon icon="stars" />
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
                <Link to={`/god/${selectedUser.currentGameId}`}>
                  <LangResource id="goToGame" />
                </Link>
              </li>
            )}
            {selectedUser.onlineStatus && !selectedUser.currentGameId && (
              <li data-command="toggleReady">
                {selectedUser.ready ? (
                  <LangResource id="makeUnready" />
                ) : (
                  <LangResource id="makeReady" />
                )}
              </li>
            )}
            <li data-command="profile">
              <Link to={`/profile/${menu.target}`}>
                <BasicLangResource id="profile" />
              </Link>
            </li>
            <li data-command="toggleOnline">
              {selectedUser.onlineStatus ? (
                <LangResource id="forceOffline" />
              ) : (
                <LangResource id="forceOnline" />
              )}
            </li>
            {menu.target !== loginUser.uid && (
              <li data-command="toggleGod">
                {selectedUser.canBeGod ? (
                  <LangResource id="revokeAdmin" />
                ) : (
                  <LangResource id="turnToAdmin" />
                )}
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
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    list-style: none;
    li {
      height: 25px;
      display: flex;
      align-items: center;
      gap: 4px;
      border-radius: 13px;
      background-color: #aaaaaa;
      padding: 0 2px;
      user-select: none;
      border: 1px solid #888888;
      color: #555555;
      .status {
        height: 21px;
        background: #ffffffbb;
        border-radius: 50%;
        display: flex;
        align-items: center;
      }
      .name {
        flex: 1;
        display: flex;
        align-items: center;
        height: 25px;
        font-size: 90%;
        line-height: 25px;
        font-weight: bold;
      }
      .account-type {
        font-size: 80%;
        margin-left: 4px;
        color: #0000ff66;
        &.god {
          color: #a16100aa;
        }
      }
      &.online {
        background-color: #aaffaa;
        border-color: #88cc88;
        color: black;
      }
      &.in-game {
        border-color: #ffcc00;
        background-color: #fff56b;
      }
      &.online.ready .status {
        color: #00aa00;
      }
      &.online:not(.ready) {
        background-color: #9dc694;
        .status {
          color: brown;
        }
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
