import * as db from 'firebase/database';
import { FC, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import Icon from './Icon';
import { makeLangResource } from './LangResource';
import { TeamDisplay } from './RoleDisplay';
import Toggle from './Toggle';
import UserList, { UserListCommand } from './UserList';
import {
  GlobalGameHistory,
  GlobalGameHistoryEntry,
  Mark,
  UserEntry,
  marks
} from './game-data';
import { database } from './utils/firebase.js';
import formatDate from './utils/formatDate';
import { useApi } from './utils/useApi';
import useTitle from './utils/useTitle';
import withLoginBoundary from './withLoginBoundary';
import { useMessageAdder } from './Messages';

const LangResource = makeLangResource({
  allUsers: { en: 'All Users', ja: '全ユーザー' },
  addNpcAccount: { en: 'Add NPC Account', ja: 'NPCアカウントを追加' },
  npcDesc: {
    en: 'NPC accounts are controlled in God mode or by API.',
    ja: 'NPC アカウントは、ゴッドモードか API で操作します。'
  },
  userAdded: {
    en: ({ name }) => (
      <>
        New NPC user <b>"{name}"</b> added.
      </>
    ),
    ja: ({ name }) => (
      <>
        NPC ユーザ <b>"{name}"</b> を追加しました。
      </>
    )
  },
  allLog: { en: 'Full Game Log', ja: '全ゲーム一覧' },
  recentGames: { en: 'Recent Games', ja: '最近のゲーム' },
  showFullLog: { en: 'Show Full Log', ja: '全ログを表示' },
  aborted: { en: '(Aborted)', ja: '(中断)' },
  won: { en: ' Won', ja: '勝利' },
  settings: { en: 'Settings', ja: '設定' }
});

const GodMenu: FC = () => {
  const [selected, setSelected] = useState(0);
  useTitle('God Mode Menu');

  const choices = [
    <>
      <Icon icon="group" /> <LangResource id="allUsers" />
    </>,
    <>
      <Icon icon="history" /> <LangResource id="recentGames" />
    </>,
    <>
      <Icon icon="settings" /> <LangResource id="settings" />
    </>
  ];

  return (
    <StyledDiv>
      <h1>God Mode</h1>
      <Toggle choices={choices} value={selected} onChange={setSelected} />
      {selected === 0 && <GodAllUsers />}
      {selected === 1 && <GodGlobalLog />}
      {selected === 2 && <GodSettings />}
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  padding: 10px;
`;

export default withLoginBoundary({ mustBeGod: true })(GodMenu);

const GodAllUsers: FC = () => {
  const api = useApi();

  const handleUserCommand = async (
    uid: string,
    user: UserEntry,
    command: UserListCommand
  ) => {
    switch (command) {
      case 'toggleReady': {
        const ref = db.ref(database, `users/${uid}/ready`);
        await db.set(ref, !user.ready);
        break;
      }
      case 'toggleOnline': {
        const ref = db.ref(database, `users/${uid}/onlineStatus`);
        await db.set(ref, !user.onlineStatus);
        break;
      }
      case 'toggleGod':
        await api('setProfile', {
          target: uid,
          updates: { canBeGod: !user.canBeGod }
        });
        break;
    }
  };

  return (
    <>
      <h2>
        <LangResource id="allUsers" />
      </h2>
      <UserList
        onUserCommand={handleUserCommand}
        onlineOnly={false}
        showAdminMenu={true}
      />
    </>
  );
};

const GodGlobalLog: FC = () => {
  const api = useApi();
  const [gameLog, setGameLog] = useState<GlobalGameHistory | Error>();
  const [showFullLog, setShowFullLog] = useState(false);
  const [filter, setFilter] = useState<number>(-1); // index of Mark

  const logRef = useMemo(
    () =>
      filter === -1
        ? db.query(
            db.ref(database, 'globalHistory'),
            ...(showFullLog ? [] : [db.limitToLast(20)])
          )
        : db.query(
            db.ref(database, 'globalHistory'),
            db.orderByChild('mark'),
            db.startAt(marks[filter]),
            db.endAt(marks[filter]),
            ...(showFullLog ? [] : [db.limitToLast(20)])
          ),
    [showFullLog, filter]
  );

  useEffect(() => {
    const unsubscribe = db.onValue(
      logRef,
      snapshot => setGameLog(snapshot.val()),
      err => setGameLog(err)
    );
    return unsubscribe;
  }, [logRef]);

  const handleDownloadLog = async (gameId: string) => {
    const ref = db.ref(database, `/games/${gameId}`);
    const data = (await db.get(ref)).val();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${gameId}.json`;
    a.click();
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm(`Delete game ${gameId} permanently? You cannot undo this.`))
      return;
    await api('deleteGame', { gameId });
  };

  const handleMarkGame = async (gameId: string, mark: Mark | null) => {
    await api('setGameAttributes', { gameId, mark });
  };

  return (
    <StyledGlobalLogDiv>
      <h2>
        {showFullLog ? (
          <LangResource id="allLog" />
        ) : (
          <>
            <LangResource id="recentGames" />{' '}
            <button onClick={() => setShowFullLog(true)}>
              <LangResource id="showFullLog" />
            </button>
          </>
        )}
      </h2>
      <Toggle
        choices={['ALL', ...marks.map(mark => <Icon icon={mark} />)]}
        value={filter + 1}
        onChange={index => setFilter(index - 1)}
      />
      <table className="recent">
        <tbody>
          {gameLog &&
            !(gameLog instanceof Error) &&
            Object.entries(gameLog)
              .sort(
                ([a], [b]) => b.localeCompare(a) // sort by gameId
              )
              .map(([gameId, game]) => (
                <GodGameLogItem
                  key={gameId}
                  gameId={gameId}
                  game={game}
                  onDownloadLogClick={handleDownloadLog}
                  onDeleteGameClick={handleDeleteGame}
                  onStarGameClick={handleMarkGame}
                />
              ))}
        </tbody>
      </table>
    </StyledGlobalLogDiv>
  );
};

const StyledGlobalLogDiv = styled.div`
  .recent {
    margin-top: 10px;
    tr:hover {
      background: #eeeeee;
    }
    td {
      padding: 0 5px;
    }
  }
`;

const GodGameLogItem: FC<{
  gameId: string;
  game: GlobalGameHistoryEntry;
  onDownloadLogClick: (gameId: string) => void;
  onDeleteGameClick: (gameId: string) => void;
  onStarGameClick: (gameId: string, mark: Mark | null) => void;
}> = props => {
  const {
    gameId,
    game,
    onDownloadLogClick,
    onDeleteGameClick,
    onStarGameClick
  } = props;
  return (
    <StyledLogTr key={gameId}>
      <td className="mark">
        <Icon icon={game.mark ?? 'star_border'} />
        <div className="dropdown">
          {marks.map(mark => (
            <button
              className="menu"
              key={mark}
              onClick={() => onStarGameClick(gameId, mark)}
            >
              <Icon icon={mark} />
            </button>
          ))}
          <button
            className="menu remove"
            onClick={() => onStarGameClick(gameId, null)}
          >
            <Icon icon="close" />
          </button>
        </div>
      </td>
      <td>
        <Link to={`/god/${gameId}`}>
          {formatDate(game.finishedAt as number)} {game.numAgents}P{' '}
        </Link>
      </td>
      <td>
        {game.wasAborted ? (
          <LangResource id="aborted" />
        ) : (
          <>
            <TeamDisplay team={game.winner!} />
            <LangResource id="won" />
          </>
        )}
      </td>
      <td>
        <button className="menu" onClick={() => onDownloadLogClick(gameId)}>
          <Icon icon="download" />
        </button>
        <button className="menu" onClick={() => onDeleteGameClick(gameId)}>
          <Icon icon="delete_forever" />
        </button>
      </td>
      <td className="game-id" role="button">
        {gameId}
      </td>
    </StyledLogTr>
  );
};

const StyledLogTr = styled.tr`
  .mark {
    color: orange;
    cursor: pointer;
    position: relative;
    .dropdown {
      background: white;
      border: 1px solid gray;
      position: absolute;
      display: none;
      top: 50%;
      left: 50%;
      z-index: 1;
    }
    &:hover {
      .dropdown {
        display: grid;
        grid-template-columns: repeat(6, auto);
      }
    }
    button.menu {
      color: orange;
      &:hover {
        background: #eeeeee;
      }
      &.remove {
        color: black;
      }
    }
  }

  a {
    text-decoration: none;
  }
  .game-id {
    color: gray;
    font-size: 80%;
  }
  .menu {
    color: green;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
  }
`;

const GodSettings: FC = () => {
  const api = useApi();
  const [newUid, setNewUid] = useState('');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const addMessage = useMessageAdder();

  const addUserClick = async () => {
    if (!newUid || !newName) return;
    setBusy(true);
    const { ok } = await api('addUser', { newUid, name: newName });
    setBusy(false);
    if (ok) {
      addMessage('info', <LangResource id="userAdded" name={newName} />);
      setNewUid('');
      setNewName('');
    }
  };

  return (
    <>
      <h2>
        <LangResource id="addNpcAccount" />
      </h2>
      <p>
        <LangResource id="npcDesc" />
      </p>
      <div>
        <input
          type="text"
          placeholder="UID"
          value={newUid}
          onChange={e => setNewUid(e.target.value)}
        />
        <input
          type="text"
          placeholder="user name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <button onClick={addUserClick} disabled={!newUid || !newName || busy}>
          <Icon icon="smart_toy" /> Add
        </button>
      </div>
    </>
  );
};
