import * as db from 'firebase/database';
import { FC, MouseEventHandler, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import Icon from './Icon';
import { makeLangResource } from './LangResource';
import { TeamDisplay } from './RoleDisplay';
import UserList, { UserListCommand } from './UserList';
import {
  GlobalGameHistory,
  GlobalGameHistoryEntry,
  Mark,
  UserEntries,
  UserEntry,
  marks
} from './game-data';
import { database } from './utils/firebase.js';
import formatDate from './utils/formatDate';
import { useApi } from './utils/useApi';
import useFirebaseSubscription from './utils/useFirebaseSubscription';
import useTitle from './utils/useTitle';
import withLoginBoundary from './withLoginBoundary';

const LangResource = makeLangResource({
  allUsers: { en: 'All Users', ja: '全ユーザー' },
  addNpcAccount: { en: 'Add NPC Account', ja: 'NPCアカウントを追加' },
  allLog: { en: 'Full Game Log', ja: '全ゲーム一覧' },
  recentGames: { en: 'Recent Games', ja: '最近のゲーム' },
  showFullLog: { en: 'Show Full Log', ja: '全ログを表示' },
  aborted: { en: '(Aborted)', ja: '(中断)' },
  won: { en: ' Won', ja: '勝利' }
});

const GodMenu: FC = () => {
  const [newUid, setNewUid] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const users = useFirebaseSubscription<UserEntries>('/users');
  const api = useApi();
  const [gameLog, setGameLog] = useState<GlobalGameHistory | Error>();
  const [showFullLog, setShowFullLog] = useState(false);

  const logRef = useMemo(
    () =>
      db.query(
        db.ref(database, 'globalHistory'),
        db.orderByChild('finishedAt'),
        ...(showFullLog ? [] : [db.limitToLast(20)])
      ),
    [showFullLog]
  );

  useEffect(() => {
    const unsubscribe = db.onValue(
      logRef,
      snapshot => setGameLog(snapshot.val()),
      err => setGameLog(err)
    );
    return unsubscribe;
  }, [logRef]);

  useTitle('God Mode Menu');

  if (!users.data) return null;

  const addUserClick = async () => {
    const res = await api('addUser', { newUid });
    const item = res;
    setResults([item, ...results]);
  };

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
    <StyledDiv>
      <h1>God Mode Menu</h1>
      <h2>
        <LangResource id="allUsers" />
      </h2>
      <UserList
        onUserCommand={handleUserCommand}
        onlineOnly={false}
        showAdminMenu={true}
      />
      <h2>
        <LangResource id="addNpcAccount" />
      </h2>
      <div>
        <input
          type="text"
          placeholder="uid"
          value={newUid}
          onChange={e => setNewUid(e.target.value)}
        />
        <button onClick={addUserClick}>Add</button>
      </div>
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
      <ul className="recent">
        {gameLog &&
          !(gameLog instanceof Error) &&
          Object.entries(gameLog)
            .sort(
              (a, b) =>
                (b[1].finishedAt as number) - (a[1].finishedAt as number)
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
      </ul>
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  padding: 10px;
  height: 100%;
  display: flex;
  flex-flow: column;
  .recent {
    flex: 1 1 auto;
    min-height: 20em;
    overflow-y: auto;
    list-style: disc;
    padding-left: 20px;
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
    <StyledLi key={gameId}>
      <span className="mark">
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
      </span>
      <Link to={`/god/${gameId}`}>
        {formatDate(game.finishedAt as number)} {game.numAgents}P{' '}
        {game.wasAborted ? (
          <LangResource id="aborted" />
        ) : (
          <>
            <TeamDisplay team={game.winner!} />
            <LangResource id="won" />
          </>
        )}{' '}
      </Link>
      <button className="menu" onClick={() => onDownloadLogClick(gameId)}>
        <Icon icon="download" />
      </button>
      <button className="menu" onClick={() => onDeleteGameClick(gameId)}>
        <Icon icon="delete_forever" />
      </button>
      <span className="game-id" role="button">
        {gameId}
      </span>
    </StyledLi>
  );
};

const StyledLi = styled.li`
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
        display: flex;
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
`;

export default withLoginBoundary({ mustBeGod: true })(GodMenu);
