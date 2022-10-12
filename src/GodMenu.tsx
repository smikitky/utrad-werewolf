import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { UserEntries, UserEntry } from './game-data';
import OnlineUsers from './OnlineUsers';
import { useApi } from './utils/useApi';
import useFirebaseSubscription from './utils/useFirebaseSubscription';
import { database } from './utils/firebase.js';
import * as db from 'firebase/database';

const GodMenu: FC = () => {
  const [newUid, setNewUid] = useState('');
  const [gameId, setGameId] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const users = useFirebaseSubscription<UserEntries>('/users');
  const api = useApi();
  const navigate = useNavigate();

  if (!users.data) return null;

  const addUserClick = async () => {
    const res = await api('addUser', { newUid });
    const item = { ok: res.ok, status: res.status, data: await res.json() };
    setResults([item, ...results]);
  };

  const handleGoToGame = () => {
    navigate(`/god/${gameId}`);
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
      <h2>See Game</h2>
      <div>
        <input
          type="text"
          value={gameId}
          onChange={e => setGameId(e.target.value)}
        />
        <button onClick={handleGoToGame}>Go</button>
      </div>
      <h2>Add User</h2>
      <p>Users added here will be always online.</p>
      <div>
        <input
          type="text"
          value={newUid}
          onChange={e => setNewUid(e.target.value)}
        />
        <button onClick={addUserClick}>Add</button>
      </div>
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  padding: 10px;
`;

export default GodMenu;
