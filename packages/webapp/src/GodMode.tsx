import classNames from 'classnames';
import { ReactNode, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import Alert from './Alert ';
import Icon from './Icon';
import { BasicLangResource, makeLangResource } from './LangResource';
import RoleDisplay from './RoleDisplay';
import RoleTip from './RoleTip';
import Toggle from './Toggle';
import {
  AgentId,
  AgentInfo,
  BaseVoteLogEntry,
  DivineLogEntry,
  Game,
  GameStatus,
  GuardLogEntry,
  OverLogEntry,
  UserEntries
} from './game-data';
import { agentAction, extractLogOfPeriod } from './game-utils';
import GameLog from './game/GameLog';
import formatDate from './utils/formatDate';
import { useApi } from './utils/useApi';
import useFirebaseSubscription from './utils/useFirebaseSubscription';
import useTitle from './utils/useTitle';
import withLoginBoundary, { Page } from './withLoginBoundary';

const LangResource = makeLangResource({
  gameId: { en: 'Game ID', ja: 'ゲーム ID' },
  startedAt: { en: 'Started at', ja: '開始' },
  finished: { en: 'Finished', ja: 'ゲーム終了' },
  aborted: { en: 'Aborted', ja: '強制中断' },
  villagesWon: { en: 'Villagers Team won', ja: '村人陣営の勝利' },
  werewolvesWon: { en: 'Werewolves Team won', ja: '人狼陣営の勝利' },
  gameStatus: {
    en: (props: { status: GameStatus }) => (
      <>
        Day {props.status.day}, Period: {props.status.period}, Vote Phase:{' '}
        {props.status.votePhase}
      </>
    ),
    ja: (props: { status: GameStatus }) => (
      <>
        日付：{props.status.day}、時間帯：{props.status.period}、投票ラウンド：
        {props.status.votePhase}
      </>
    )
  },
  finishedAt: { en: 'Finished at', ja: '終了時刻' },
  attackVote: { en: 'Voting to attack', ja: '襲撃投票中' },
  guard: { en: 'Choosing guard target', ja: '護衛先選択中' },
  divine: { en: 'Choosing divine target', ja: '占い先選択中' },
  vote: { en: 'Voting to expel', ja: '追放投票中' },
  talk: { en: 'In talk', ja: '話し合い中（発話終了待ち）' },
  whisper: { en: 'In whisper chat', ja: '囁き中（発話終了待ち）' },
  finish: { en: 'Finished', ja: 'ゲーム終了' },
  wait: { en: 'Waiting', ja: '他のユーザの行動待ち' },
  name: { en: 'name', ja: '名前' },
  role: { en: 'role', ja: '役割' },
  life: { en: 'life', ja: '生死' },
  currentAction: { en: 'action', ja: '現在の行動' },
  user: { en: 'user', ja: 'ユーザ' },
  details: { en: 'Details', ja: '詳細' },
  abort: { en: 'Abort Game', ja: '強制中断' },
  fullLog: { en: 'Complete Log', ja: '完全ログ' },
  personLog: {
    en: ({ children }) => <>{children} log</>,
    ja: ({ children }) => <>{children}のログ</>
  },
  apiLog: { en: 'API response log', ja: 'APIログ' },
  emptyApiLog: { en: 'No API response log yet', ja: 'APIログなし' },
  debugLog: { en: 'Debug log', ja: 'デバッグ生ログ' }
});

const lastAction = (game: Game, agent: AgentInfo) => {
  if (agent.life === 'dead') return '(dead)';
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
    return `(${
      voteEntry.type === 'vote' ? 'expel-voted to' : 'attack-voted to'
    }: ${targetName(voteEntry.target)})`;
  const abilityEntry = periodLog.find(
    l =>
      (l.type === 'divine' || l.type === 'guard') && l.agent === agent.agentId
  ) as DivineLogEntry | GuardLogEntry | undefined;
  if (abilityEntry)
    return `(${
      abilityEntry.type === 'divine' ? 'divined' : 'guarded'
    }: ${targetName(abilityEntry.target)})`;
  const overEntry = periodLog.find(
    l => l.type === 'over' && l.agent === agent.agentId
  ) as OverLogEntry | undefined;
  if (overEntry) return '(over)';
};

type ShowLogType = 'game' | 'debug' | 'api' | 'off' | AgentId;

const GodMode: Page = () => {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedAction, setSelectedAction] = useState('talk');
  const [param, setParam] = useState('');
  const [apiResponses, setApiResponses] = useState<any[]>([]);
  const [showLogType, setShowLogType] = useState<ShowLogType>('game');

  const gameId = useParams().gameId as string;
  const gameData = useFirebaseSubscription<Game>(`/games/${gameId}`);
  const userData = useFirebaseSubscription<UserEntries>(`/users`);
  const game = gameData.data;
  const api = useApi();

  useTitle(
    !game
      ? '??'
      : 'Werewolf: ' +
          (game.finishedAt
            ? 'Finshed'
            : `Day ${game.status.day}, ${
                game.status.period === 'day' ? 'daytime' : 'night'
              }${
                typeof game.status.votePhase === 'number' &&
                game.status.votePhase > 0
                  ? 'voting '
                  : ' '
              } ${
                game?.agents.filter(a => a.life === 'alive').length
              } players alive`)
  );

  useEffect(() => {
    if (!selectedAgent && game?.agents[0]) {
      setSelectedAgent(game.agents[0].userId);
    }
  }, [selectedAgent, game]);

  if (game === null)
    return (
      <Alert>
        <BasicLangResource id="gameDataNotFound" />
      </Alert>
    );
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
    if (res.status !== 200) setShowLogType('api');
    setApiResponses(arr => [item, ...arr]);
  };

  const handleClearLog = () => {
    setApiResponses([]);
  };

  const handleAbortClick = async () => {
    if (!confirm('Forcibly abort this game?')) return;
    await api('abortGame', { gameId });
  };

  const handleLogTypeSelect = (index: number) => {
    if (index === 0) setShowLogType('game');
    else if (index === logTypeOptions.length - 1) setShowLogType('debug');
    else if (index === logTypeOptions.length - 2) setShowLogType('api');
    else setShowLogType(game.agents[index - 1].agentId);
  };

  const logTypeOptions: ReactNode[] = [
    <Icon icon="all_inclusive" />,
    ...game.agents.map(a => (
      <>
        {a.agentId} <RoleTip role={a.role} />
      </>
    )),
    <span title="API Log">
      <Icon icon="compare_arrows" />
    </span>,
    <span title="Debug Log">
      <Icon icon="data_object" />
    </span>
  ];

  return (
    <StyledDiv>
      <div className="status-pane">
        <div className="status-main">
          <div>
            <b>
              <LangResource id="gameId" />
            </b>
            : {gameId} (
            <b>
              <LangResource id="startedAt" />
            </b>
            : {formatDate(game.startedAt as number)})
          </div>
          {game.finishedAt ? (
            <div>
              <LangResource id="finished" />（
              {game.wasAborted ? (
                <LangResource id="aborted" />
              ) : game.winner === 'villagers' ? (
                <LangResource id="villagesWon" />
              ) : (
                <LangResource id="werewolvesWon" />
              )}
              ）
            </div>
          ) : (
            <div>
              <LangResource id="gameStatus" status={game.status} />
            </div>
          )}
          {game.finishedAt && (
            <div>
              <LangResource id="finishedAt" />:{' '}
              {formatDate(game.finishedAt as number)}
            </div>
          )}
        </div>
        <div className="commands">
          <button
            onClick={handleAbortClick}
            disabled={typeof game.finishedAt === 'number'}
          >
            <LangResource id="abort" />
          </button>
        </div>
      </div>
      <div className="log-pane">
        <Toggle
          choices={logTypeOptions}
          value={
            showLogType === 'game'
              ? 0
              : showLogType === 'debug'
              ? logTypeOptions.length - 1
              : showLogType === 'api'
              ? logTypeOptions.length - 2
              : game.agents.findIndex(a => a.agentId === showLogType) + 1
          }
          onChange={handleLogTypeSelect}
        />
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
        ) : showLogType === 'api' ? (
          <div className="api-log-pane">
            <button
              onClick={handleClearLog}
              disabled={apiResponses.length === 0}
            >
              <Icon icon="playlist_remove" />
            </button>
            <ul className="api-log">
              {apiResponses.map((result, i) => (
                <li key={i} className={result.status === 200 ? 'ok' : 'error'}>
                  {JSON.stringify(result)}
                </li>
              ))}
            </ul>
            {apiResponses.length === 0 && (
              <div className="empty-log">
                <LangResource id="emptyApiLog" />
              </div>
            )}
          </div>
        ) : (
          <div>(Log turned off)</div>
        )}
      </div>
      <details className="foot" open>
        <summary>
          <LangResource id="details" />
        </summary>
        <div className="table-wrapper">
          <table className="players">
            <thead>
              <tr>
                <th>ID</th>
                <th>
                  <LangResource id="name" />
                </th>
                <th>
                  <LangResource id="role" />
                </th>
                <th>
                  <LangResource id="life" />
                </th>
                <th>
                  <LangResource id="currentAction" />
                </th>
                <th>
                  <LangResource id="user" />
                </th>
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
                    <td>
                      <RoleDisplay role={agent.role} />
                    </td>
                    <td>
                      {agent.life === 'alive' ? (
                        <BasicLangResource id="alive" />
                      ) : (
                        <BasicLangResource id="dead" />
                      )}
                    </td>
                    <td className={classNames('action', action)}>
                      {<LangResource id={action} />}
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
                  {agent.name} (<RoleDisplay role={agent.role} />)
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
    flex: 1 1 60%;
    display: flex;
    gap: 5px;
    flex-direction: column;
    min-height: 0;
    padding-left: 5px;
  }
  ul.api-log {
    li {
      &.ok {
        color: green;
      }
      &.error {
        color: red;
      }
      border-bottom: 1px solid silver;
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
  .api-log-pane {
    overflow-y: auto;
  }
  small {
    color: silver;
  }
`;

export default withLoginBoundary({ mustBeGod: true })(GodMode);
