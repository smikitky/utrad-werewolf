import classNames from 'classnames';
import { FC, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { BaseVoteLogEntry, Game } from './game-data';
import {
  Action,
  agentAction,
  extractLogOfPeriod,
  roleTextMap
} from './game-utils';
import { useApi } from './utils/useApi';
import useFirebaseSubscription from './utils/useFirebaseSubscription';

const actionTextMap: Record<Action, string> = {
  attackVote: '襲撃投票中',
  protect: '護衛先選択中',
  divine: '占い先選択中',
  vote: '追放投票中',
  talk: '話し合い中（発話終了待ち）',
  whisper: '囁き中（発話終了待ち）',
  finish: 'ゲーム終了',
  wait: '他のユーザの行動待ち'
};

const GodMode: FC = () => {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAction, setSelectedAction] = useState('talk');
  const [param, setParam] = useState('');
  const [apiResponses, setApiResponses] = useState<any[]>([]);
  const [showDebugLog, setShowDebugLog] = useState(false);

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
        case 'protect':
          return { gameId, target: Number(param) };
        default:
          return { gameId };
      }
    })();
    const res = await api(selectedAction, payload, {
      asUser: selectedUser,
      noError: true
    });
    const item = {
      action: selectedAction,
      payload,
      status: res.status,
      result: res.data
    };
    setApiResponses([item, ...apiResponses]);
  };

  const handleClearLog = () => {
    setApiResponses([]);
  };

  const handleAbortClick = async () => {
    if (!confirm('強制中断しますか？')) return;
    await api('abortGame', { gameId });
  };

  return (
    <StyledDiv>
      <h1>
        <Link to="/god">God Mode</Link>
      </h1>
      <div>ゲーム ID: {gameId}</div>
      <h2>ゲーム状況</h2>
      <ul>
        {game.finishedAt ? (
          <b>
            ゲーム終了（
            {game.wasAborted
              ? '強制中断'
              : game.winner === 'villagers'
              ? '村人陣営の勝利'
              : '人狼陣営の勝利'}
            ）
          </b>
        ) : (
          <>
            日付：{game.status.day}、時間帯：{game.status.period}
            、投票ラウンド：
            {game.status.votePhase}
          </>
        )}
      </ul>
      <div>開始時刻：{new Date(game.startedAt as number).toLocaleString()}</div>
      {game.finishedAt && (
        <div>
          終了時刻：{new Date(game.finishedAt as number).toLocaleString()}
        </div>
      )}
      <h2>プレーヤーの状況</h2>
      <table className="players">
        <thead>
          <tr>
            <th>ID</th>
            <th>名前</th>
            <th>役割</th>
            <th>生死</th>
            <th>現在の行動</th>
            <th>UID</th>
          </tr>
        </thead>
        <tbody>
          {game.agents.map(agent => {
            const action = agentAction(game, agent);
            const voteTarget = extractLogOfPeriod(game).find(
              l =>
                (l.type === 'vote' || l.type === 'attackVote') &&
                l.agent === agent.agentId &&
                l.votePhase === game.status.votePhase
            ) as BaseVoteLogEntry | undefined;
            const voteTargetAgent = game.agents.find(
              a => a.agentId === voteTarget?.target
            );
            return (
              <tr
                key={agent.agentId}
                className={classNames({ dead: agent.life === 'dead' })}
                onClick={() => setSelectedUser(agent.userId)}
              >
                <td>{agent.agentId}</td>
                <td>{agent.name}</td>
                <td>{roleTextMap[agent.role]}</td>
                <td>{agent.life === 'alive' ? '生存' : '死亡'}</td>
                <td className={classNames('action', action)}>
                  {actionTextMap[action]}
                  {voteTargetAgent && <> 投票先: {voteTargetAgent.name}</>}
                </td>
                <td>{agent.userId}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h2>行動命令</h2>
      <div className="action-pane">
        <select
          name="user"
          value={selectedUser}
          onChange={e => setSelectedUser(e.target.value)}
        >
          {game.agents.map(agent => {
            return (
              <option key={agent.userId} value={agent.userId}>
                {agent.name} ({roleTextMap[agent.role]}, {agent.life}){' '}
                {agent.userId}
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
          <option value="protect">protect</option>
        </select>
        <input
          type="text"
          value={param}
          onChange={e => setParam(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && actionClick()}
        />
        <button onClick={actionClick}>Go</button>
      </div>
      <ul className="log">
        {apiResponses.map((result, i) => (
          <li key={i} className={result.status === 200 ? 'ok' : 'error'}>
            {JSON.stringify(result)}
          </li>
        ))}
      </ul>
      <div>
        <button onClick={handleClearLog} disabled={apiResponses.length === 0}>
          ログ消去
        </button>
      </div>
      <h2>ゲーム強制中断</h2>
      <button
        onClick={handleAbortClick}
        disabled={typeof game.finishedAt === 'number'}
      >
        強制中断
      </button>
      <h2>ゲーム生ログ</h2>
      <button onClick={() => setShowDebugLog(!showDebugLog)}>
        {showDebugLog ? '隠す' : '表示'}
      </button>
      {showDebugLog && (
        <pre className="debug-log">{JSON.stringify(game, null, 2)}</pre>
      )}
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  position: relative;
  padding: 10px;
  table.players {
    border-collapse: collapse;
    tr {
      border-top: 1px solid silver;
      border-bottom: 1px solid silver;
      &.dead {
        color: silver;
      }
    }
    tbody > tr:hover {
      cursor: pointer;
      background-color: #eeeeee;
    }
    td {
      padding: 3px 10px;
      &.action {
        &:not(.wait):not(.finish) {
          color: brown;
          font-weight: bold;
        }
        &.wait {
          color: gray;
        }
      }
    }
  }
  ul.log {
    li {
      &.ok {
        color: green;
      }
      &.error {
        color: red;
      }
    }
  }
  .action-pane {
    display: flex;
    flex-flow: row wrap;
    padding: 10px;
    margin-bottom: 10px;
    background: #dddddd;
    > button {
      margin-left: 10px;
    }
  }
  .debug-log {
    border: 1px solid silver;
    background: white;
    overflow: scroll;
    width: 100%;
    max-height: 800px;
    resize: vertical;
  }
`;

export default GodMode;
