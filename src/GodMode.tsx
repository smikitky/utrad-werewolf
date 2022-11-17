import classNames from 'classnames';
import { FC, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import Alert from './Alert ';
import {
  AgentId,
  AgentInfo,
  BaseVoteLogEntry,
  DivineLogEntry,
  Game,
  GuardLogEntry,
  OverLogEntry,
  UserEntries
} from './game-data';
import {
  Action,
  agentAction,
  extractLogOfPeriod,
  roleTextMap
} from './game-utils';
import GameLog from './game/GameLog';
import Icon from './Icon';
import withLoginBoundary, { Page } from './withLoginBoundary';
import formatDate from './utils/formatDate';
import { useApi } from './utils/useApi';
import useFirebaseSubscription from './utils/useFirebaseSubscription';
import { useLoginUser } from './utils/user';
import useTitle from './utils/useTitle';

const actionTextMap: Record<Action, string> = {
  attackVote: '襲撃投票中',
  guard: '護衛先選択中',
  divine: '占い先選択中',
  vote: '追放投票中',
  talk: '話し合い中（発話終了待ち）',
  whisper: '囁き中（発話終了待ち）',
  finish: 'ゲーム終了',
  wait: '他のユーザの行動待ち'
};

const lastAction = (game: Game, agent: AgentInfo) => {
  if (agent.life === 'dead') return '(死亡)';
  const periodLog = extractLogOfPeriod(game);
  const targetName = (agentId: AgentId) =>
    game.agents.find(a => a.agentId === agentId)!.name;
  const voteEntry = periodLog.find(
    l =>
      (l.type === 'vote' || l.type === 'attackVote') &&
      l.agent === agent.agentId &&
      l.votePhase === game.status.votePhase
  ) as BaseVoteLogEntry | undefined;
  if (voteEntry)
    return `${
      voteEntry.type === 'vote' ? '追放投票先' : '襲撃投票先'
    }: ${targetName(voteEntry.target)}`;
  const abilityEntry = periodLog.find(
    l =>
      (l.type === 'divine' || l.type === 'guard') && l.agent === agent.agentId
  ) as DivineLogEntry | GuardLogEntry | undefined;
  if (abilityEntry)
    return `${
      abilityEntry.type === 'divine' ? '占い対象' : '護衛対象'
    }: ${targetName(abilityEntry.target)}`;
  const overEntry = periodLog.find(
    l => l.type === 'over' && l.agent === agent.agentId
  ) as OverLogEntry | undefined;
  if (overEntry) return '(発話終了)';
};

type ShowLogType = 'game' | 'debug' | 'off' | AgentId;

const GodMode: Page = () => {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedAction, setSelectedAction] = useState('talk');
  const [param, setParam] = useState('');
  const [apiResponses, setApiResponses] = useState<any[]>([]);
  const [showLogType, setShowLogType] = useState<ShowLogType>('game');
  const [apiLogOpen, setApiLogOpen] = useState<boolean>(false);

  const gameId = useParams().gameId as string;
  const gameData = useFirebaseSubscription<Game>(`/games/${gameId}`);
  const userData = useFirebaseSubscription<UserEntries>(`/users`);
  const game = gameData.data;
  const api = useApi();

  useTitle(
    !game
      ? '??'
      : '人狼: ' +
          (game.finishedAt
            ? '終了'
            : `${game.status.day}日目${
                game.status.period === 'day' ? '昼' : '夜'
              }${game.status.votePhase > 0 ? '投票中 ' : ' '} ${
                game?.agents.filter(a => a.life === 'alive').length
              }人生存`)
  );

  useEffect(() => {
    if (!selectedAgent && game?.agents[0]) {
      setSelectedAgent(game.agents[0].userId);
    }
  }, [selectedAgent, game]);

  if (game === null) return <Alert>該当ゲームデータは存在しません</Alert>;
  if (!game) return null;

  const actionClick = async () => {
    if (!selectedAgent) return;
    const payload = (() => {
      switch (selectedAction) {
        case 'talk':
        case 'whisper':
          return { gameId, content: param };
        case 'vote':
        case 'attackVote':
        case 'divine':
        case 'guard':
          return { gameId, target: Number(param) };
        default:
          return { gameId };
      }
    })();
    const res = await api(selectedAction, payload, {
      asUser: selectedAgent,
      noError: true
    });
    const item = {
      action: selectedAction,
      payload,
      status: res.status,
      result: res.data
    };
    if (res.status !== 200) setApiLogOpen(true);
    setApiResponses([...apiResponses, item]);
  };

  const handleClearLog = () => {
    setApiResponses([]);
  };

  const handleAbortClick = async () => {
    if (!confirm('強制中断しますか？')) return;
    await api('abortGame', { gameId });
  };

  const handleLogTypeSelect: React.ChangeEventHandler<
    HTMLSelectElement
  > = e => {
    const val = e.target.value;
    if (/\d+/.test(val)) {
      setShowLogType(Number(val) as AgentId);
    } else {
      setShowLogType(e.target.value as ShowLogType);
    }
  };

  return (
    <StyledDiv>
      <div className="status-pane">
        <div className="status-main">
          <div>
            <b>ゲーム ID</b>: {gameId} (<b>開始</b>:{' '}
            {formatDate(game.startedAt as number)})
          </div>
          {game.finishedAt ? (
            <div>
              ゲーム終了（
              {game.wasAborted
                ? '強制中断'
                : game.winner === 'villagers'
                ? '村人陣営の勝利'
                : '人狼陣営の勝利'}
              ）
            </div>
          ) : (
            <div>
              <b>日付</b>: {game.status.day}、<b>時間帯</b>:{' '}
              {game.status.period}、<b>投票ラウンド</b>: {game.status.votePhase}
            </div>
          )}
          {game.finishedAt && (
            <div>終了時刻：{formatDate(game.finishedAt as number)}</div>
          )}
        </div>
        <div className="commands">
          <button
            onClick={handleAbortClick}
            disabled={typeof game.finishedAt === 'number'}
          >
            強制中断
          </button>
        </div>
      </div>
      <div className="log-pane">
        <div className="game-log-pane">
          <select
            name="logtype"
            value={String(showLogType)}
            onChange={handleLogTypeSelect}
          >
            <option value="game">完全ログ</option>
            {game.agents.map(a => (
              <option key={a.agentId} value={a.agentId}>
                {a.name} のログ
              </option>
            ))}
            <option value="debug">デバッグ生ログ</option>
          </select>
          {showLogType === 'game' || typeof showLogType === 'number' ? (
            <GameLog
              game={game}
              myAgent={
                showLogType === 'game'
                  ? 'god'
                  : game.agents.find(a => a.agentId === showLogType)!
              }
            />
          ) : showLogType === 'debug' ? (
            <pre className="debug-log">{JSON.stringify(game, null, 2)}</pre>
          ) : (
            <div>(Log turned off)</div>
          )}
        </div>
        <div className={classNames('api-log-pane', { open: apiLogOpen })}>
          {apiLogOpen ? (
            <>
              <div>
                <button
                  onClick={handleClearLog}
                  disabled={apiResponses.length === 0}
                >
                  <Icon icon="playlist_remove" />
                </button>
                <button onClick={() => setApiLogOpen(false)}>
                  <Icon icon="arrow_right" />
                </button>
              </div>
              <ul className="api-log">
                {apiResponses.map((result, i) => (
                  <li
                    key={i}
                    className={result.status === 200 ? 'ok' : 'error'}
                  >
                    {JSON.stringify(result)}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <button onClick={() => setApiLogOpen(true)}>
              <Icon icon="arrow_left" />
            </button>
          )}
        </div>
      </div>
      <details className="foot" open>
        <summary>詳細</summary>
        <div className="table-wrapper">
          <table className="players">
            <thead>
              <tr>
                <th>ID</th>
                <th>名前</th>
                <th>役割</th>
                <th>生死</th>
                <th>現在の行動</th>
                <th>ユーザー</th>
              </tr>
            </thead>
            <tbody>
              {game.agents.map(agent => {
                const action = agentAction(game, agent);
                return (
                  <tr
                    key={agent.agentId}
                    className={classNames({
                      dead: agent.life === 'dead',
                      active: agent.userId === selectedAgent
                    })}
                    onClick={() => setSelectedAgent(agent.userId)}
                  >
                    <td>{agent.agentId}</td>
                    <td>{agent.name}</td>
                    <td>{roleTextMap[agent.role]}</td>
                    <td>{agent.life === 'alive' ? '生存' : '死亡'}</td>
                    <td className={classNames('action', action)}>
                      {actionTextMap[action]}
                      {action === 'wait' && <> {lastAction(game, agent)}</>}
                    </td>
                    <td>
                      {userData.data?.[agent.userId].name}{' '}
                      <small>{agent.userId.slice(0, 5)}</small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="action-pane">
          <select
            name="user"
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
          >
            {game.agents.map(agent => {
              return (
                <option key={agent.userId} value={agent.userId}>
                  {agent.name} ({roleTextMap[agent.role]})
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
            <option value="guard">guard</option>
          </select>
          <input
            type="text"
            value={param}
            onChange={e => setParam(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && actionClick()}
          />
          <button onClick={actionClick}>Go</button>
        </div>
      </details>
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  position: relative;
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 5px;
  .table-wrapper {
    overflow-x: auto;
  }
  table.players {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
    border-collapse: collapse;
    tr {
      border-top: 1px solid silver;
      border-bottom: 1px solid silver;
      &.dead {
        color: silver;
      }
      &.active {
        background-color: #ffff00;
      }
    }
    tbody {
      cursor: pointer;
    }
    td {
      padding: 0 10px;
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
  .status-pane {
    background: #eeeef5;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px;
  }
  .log-pane {
    min-height: 0;
    display: flex;
    gap: 5px;
  }
  .game-log-pane {
    // left
    flex: 1 1 60%;
    display: flex;
    gap: 5px;
    flex-direction: column;
    min-height: 0;
    padding-left: 5px;
  }
  .api-log-pane {
    // right
    flex-basis: 50px;
    &.open {
      flex-basis: 40%;
    }
    overflow-y: auto;
    border-left: 1px solid silver;
    padding-left: 5px;
  }
  ul.api-log {
    font-size: 10px;
    li {
      &.ok {
        color: green;
      }
      &.error {
        color: red;
      }
    }
  }
  .foot {
    padding: 5px 0;
    min-width: 0;
    summary {
      cursor: pointer;
      background: #555555;
      font-weight: bold;
      color: white;
      padding: 5px 10px;
    }
  }
  .action-pane {
    display: flex;
    flex-flow: row wrap;
    padding: 10px;
    gap: 5px 0;
    margin-bottom: 10px;
    > input {
      flex-grow: 1;
    }
    > button {
      margin-left: 10px;
    }
  }
  .debug-log {
    margin: 0;
    background: white;
    overflow-y: scroll;
    white-space: pre-wrap;
  }
  small {
    color: silver;
  }
`;

export default withLoginBoundary({ mustBeGod: true })(GodMode);
