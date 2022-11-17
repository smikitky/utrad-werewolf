import * as db from 'firebase/database';
import { FC, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { GlobalGameHistory, UserEntries, UserEntry } from './game-data';
import { teamTextMap } from './game-utils';
import UserList, { UserListCommand } from './UserList';
import { database } from './utils/firebase.js';
import formatDate from './utils/formatDate';
import { useApi } from './utils/useApi';
import useFirebaseSubscription from './utils/useFirebaseSubscription';
import useTitle from './utils/useTitle';
import withLoginBoundary from './withLoginBoundary';

const GodMenu: FC = () => {
  const [newUid, setNewUid] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const users = useFirebaseSubscription<UserEntries>('/users');
  const api = useApi();
  const globalGameHistory =
    useFirebaseSubscription<GlobalGameHistory>('/globalHistory');

  useTitle('God Mode メニュー');

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
        await api('editUser', {
          target: uid,
          updates: { canBeGod: !user.canBeGod }
        });
        break;
    }
  };

  return (
    <StyledDiv>
      <h1>God Mode Menu</h1>
      <h2>全ユーザー</h2>
      <UserList
        onUserCommand={handleUserCommand}
        onlineOnly={false}
        showAdminMenu={true}
      />
      <h2>NPCアカウントを追加</h2>
      <div>
        <input
          type="text"
          placeholder="uid"
          value={newUid}
          onChange={e => setNewUid(e.target.value)}
        />
        <button onClick={addUserClick}>Add</button>
      </div>
      <h2>全ゲーム一覧</h2>
      <ul className="recent">
        {globalGameHistory.data &&
          Object.entries(globalGameHistory.data)
            .sort(
              (a, b) =>
                (b[1].finishedAt as number) - (a[1].finishedAt as number)
            )
            .map(([gameId, game]) => (
              <li key={gameId}>
                <Link to={`/god/${gameId}`}>
                  {formatDate(game.finishedAt as number)}{' '}
                  {game.wasAborted ? (
                    '(中断)'
                  ) : (
                    <>{teamTextMap[game.winner!]}勝利</>
                  )}{' '}
                  <span className="game-id">{gameId}</span>
                </Link>
              </li>
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
      .game-id {
        color: gray;
        font-size: 80%;
      }
    }
  }
`;

export default withLoginBoundary({ mustBeGod: true })(GodMenu);
