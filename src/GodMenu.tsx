import * as db from 'firebase/database';
import { FC, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import Alert from './Alert ';
import { GlobalGameHistory, UserEntries, UserEntry } from './game-data';
import { teamTextMap } from './game-utils';
import OnlineUsers from './OnlineUsers';
import { database } from './utils/firebase.js';
import { useApi } from './utils/useApi';
import useFirebaseSubscription from './utils/useFirebaseSubscription';
import { useLoginUser } from './utils/user';
import formatDate from './utils/formatDate';

const GodMenu: FC = () => {
  const [newUid, setNewUid] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const users = useFirebaseSubscription<UserEntries>('/users');
  const api = useApi();
  const navigate = useNavigate();
  const globalGameHistory =
    useFirebaseSubscription<GlobalGameHistory>('/globalHistory');
  const loginUser = useLoginUser();

  if (!users.data) return null;
  if (loginUser.status !== 'loggedIn') return null;
  if (!loginUser.data.canBeGod) return <Alert>あなたは神にはなれません</Alert>;

  const addUserClick = async () => {
    const res = await api('addUser', { newUid });
    const item = res;
    setResults([item, ...results]);
  };

  const handleUserClick = async (uid: string, user: UserEntry) => {
    if (user.currentGameId) {
      navigate(`/god/${user.currentGameId}`);
    } else {
      const ref = db.ref(database, `users/${uid}/ready`);
      await db.set(ref, !user.ready);
    }
  };

  return (
    <StyledDiv>
      <h1>God Mode Menu</h1>
      <section>
        <h2>ユーザー</h2>
        <OnlineUsers onUserClick={handleUserClick} />
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
      </section>
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  section {
    padding: 10px;
  }
  .recent {
    list-style: disc;
    padding-left: 20px;
    max-height: 10em;
    overflow-y: auto;
    a {
      text-decoration: none;
      .game-id {
        color: gray;
        font-size: 80%;
      }
    }
  }
`;

export default GodMenu;
