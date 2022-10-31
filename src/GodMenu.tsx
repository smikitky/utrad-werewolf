import * as db from 'firebase/database';
import { FC, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { GlobalGameHistory, UserEntries, UserEntry } from './game-data';
import { teamTextMap } from './game-utils';
import OnlineUsers from './OnlineUsers';
import { database } from './utils/firebase.js';
import { useApi } from './utils/useApi';
import useFirebaseSubscription from './utils/useFirebaseSubscription';
import { useLoginUser } from './utils/user';

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
  if (!loginUser.data.canBeGod) return <div>あなたは神にはなれません</div>;

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
        <OnlineUsers onUserClick={handleUserClick} />
        <h2>Add NPC User</h2>
        <div>
          <input
            type="text"
            placeholder="uid"
            value={newUid}
            onChange={e => setNewUid(e.target.value)}
          />
          <button onClick={addUserClick}>Add</button>
        </div>
        <h2>Recent Games</h2>
        <ul className="recent">
          {globalGameHistory.data &&
            Object.entries(globalGameHistory.data)
              .slice(-15)
              .map(([gameId, game]) => (
                <li key={gameId}>
                  <Link to={`/god/${gameId}`}>
                    {new Date(game.finishedAt as number).toLocaleString()}{' '}
                    (Winner: {teamTextMap[game.winner!]}){' '}
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
