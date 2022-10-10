import { FC, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Game } from './game-data';
import { useApi } from './utils/useApi';
import useFirebaseSubscription from './utils/useFirebaseSubscription';
import styled from 'styled-components';

const GodMode: FC = () => {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAction, setSelectedAction] = useState('talk');
  const [param, setParam] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const gameId = useParams().gameId as string;
  const gameData = useFirebaseSubscription<Game>(`/games/${gameId}`);
  const game = gameData.data;
  const api = useApi();

  useEffect(() => {
    if (!selectedUser && game?.agents[0]) {
      setSelectedUser(game.agents[0].userId);
    }
  }, [selectedUser, game]);

  if (!game) return null;

  const actionClick = async () => {
    if (!selectedUser) return;
    const payload = (() => {
      switch (selectedAction) {
        case 'talk':
        case 'whisper':
          return { gameId, content: param };
        case 'vote':
        case 'attackVote':
        case 'divine':
          return { gameId, target: Number(param) };
        default:
          return { gameId };
      }
    })();
    const res = await api(selectedAction, payload, selectedUser);
    const item = {
      action: selectedAction,
      payload,
      status: res.status,
      result: await res.json()
    };
    setResults([item, ...results]);
  };

  const handleClearLog = () => {
    setResults([]);
  };

  return (
    <StyledDiv>
      <h1>
        <Link to="/god">God Mode</Link>
      </h1>
      <div>Game ID: {gameId}</div>
      <h2>Game Status</h2>
      <div>
        Day: {game.status.day}, Period: {game.status.period}, VotePhase:{' '}
        {game.status.votePhase}
      </div>
      <hr />
      <ul>
        {game.agents.map((agent, i) => (
          <li key={i}>
            <b>{agent.name}</b> ({agent.role}) {agent.life} {agent.userId}
          </li>
        ))}
      </ul>
      <h2>Action</h2>
      <div>
        <select
          name="user"
          value={selectedUser}
          onChange={e => setSelectedUser(e.target.value)}
        >
          {game.agents.map(agent => {
            return (
              <option key={agent.userId} value={agent.userId}>
                {agent.name} ({agent.role}, {agent.life}) {agent.userId}
              </option>
            );
          })}
        </select>
        <select
          name="action"
          value={selectedAction}
          onChange={e => setSelectedAction(e.target.value)}
        >
          <option value="talk">talk</option>
          <option value="whisper">whisper</option>
          <option value="over">over</option>
          <option value="vote">vote</option>
          <option value="attackVote">attackVote</option>
          <option value="divine">divine</option>
        </select>
        <input
          type="text"
          value={param}
          onChange={e => setParam(e.target.value)}
        />
        <button onClick={actionClick}>Go</button>
      </div>
      <ul>
        {results.map((result, i) => (
          <li key={i} className={result.status === 200 ? 'ok' : 'error'}>
            {JSON.stringify(result)}
          </li>
        ))}
      </ul>
      <div>
        <button onClick={handleClearLog}>Clear Log</button>
      </div>
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  ul {
    li {
      &.ok {
        color: green;
      }
      &.error {
        color: red;
      }
    }
  }
`;

export default GodMode;
