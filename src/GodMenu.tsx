import { FC, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { GlobalGameHistory, UserEntries, UserEntry } from './game-data';
import OnlineUsers from './OnlineUsers';
import { useApi } from './utils/useApi';
import useFirebaseSubscription from './utils/useFirebaseSubscription';
import { database } from './utils/firebase.js';
import * as db from 'firebase/database';

const GodMenu: FC = () => {
  const [newUid, setNewUid] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const users = useFirebaseSubscription<UserEntries>('/users');
  const api = useApi();
  const navigate = useNavigate();
  const globalGameHistory =
    useFirebaseSubscription<GlobalGameHistory>('/globalHistory');

  if (!users.data) return null;

  const addUserClick = async () => {
    const res = await api('addUser', { newUid });
    const item = res;
    setResults([item, ...results]);
  };

  const handleUserClick = async (uid: string, user: UserEntry) => {
    if (user.currentGameId) {
      navigate(`/god/${user.currentGameId}`);
    } else {
      const ref = db.ref(database, 'users/' + uid);
      await db.update(ref, { ready: !user.ready });
    }
  };

  return (
    <StyledDiv>
      <h1>God Mode Menu</h1>
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
      <h2>All Game History</h2>
      <ul>
        {globalGameHistory.data &&
          Object.entries(globalGameHistory.data).map(([gameId, game]) => (
            <li key={gameId}>
              <Link to={`/god/${gameId}`}>
                {new Date(game.finishedAt as number).toLocaleString()} {gameId}{' '}
                (Winner: {game.winner})
              </Link>
            </li>
          ))}
      </ul>
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  padding: 10px;
`;

export default GodMenu;
