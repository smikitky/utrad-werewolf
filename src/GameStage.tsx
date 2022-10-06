import classNames from 'classnames';
import { FC, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  AgentId,
  AgentInfo,
  AgentRole,
  agentRoles,
  BaseTalkLogEntry,
  Game,
  LogEntries,
  LogEntry,
  LogType,
  ResultLogEntry,
  StatusLogEntry,
  TalkLogEntry
} from './game-data.js';
import { useApi } from './utils/useApi.js';
import useFirebaseSubscription from './utils/useFirebaseSubscription.js';
import { useLoginUser } from './utils/user.js';

const roleTextMap: { [key in AgentRole]: string } = {
  villager: '村人',
  werewolf: '人狼',
  seer: '占い師',
  possessed: '裏切り者'
};

const RoleDisplay: FC<{ role: AgentRole }> = props => {
  const { role } = props;
  return <>{roleTextMap[role]}</>;
};

const Players: FC<{ game: Game; myAgent: AgentInfo }> = props => {
  const { game, myAgent } = props;
  const iAmWarewolf = myAgent.role === 'werewolf';
  return (
    <StyledPlayers>
      {game.agents.map(agent => {
        const showWarewolf =
          iAmWarewolf || (iAmWarewolf && agent.role === 'werewolf');
        return (
          <li
            key={agent.agentId}
            className={classNames({
              me: agent.agentId === myAgent.agentId,
              warewolf: showWarewolf,
              dead: agent.life === 'dead'
            })}
          >
            {agent.name}
            {showWarewolf && <span className="warewolf">🐺</span>}
          </li>
        );
      })}
    </StyledPlayers>
  );
};

const StyledPlayers = styled.ul`
  list-style: none;
  display: flex;
  flex-flow: row wrap;
  gap: 10px;
  margin: 10px;
  li {
    border: 2px solid black;
    width: 80px;
    height: 100px;
    &.me {
      border-color: blue;
    }
    &.dead {
      opacity: 0.5;
      border-color: red;
    }
  }
`;

const StatusLogItem: FC<{ game: Game; entry: StatusLogEntry }> = props => {
  const { game, entry } = props;

  const counts = agentRoles
    .map(role => {
      const count = game.agents.filter(
        a =>
          a.role === role &&
          entry.agents.find(a2 => a2.agentId === a.agentId)?.life === 'alive'
      ).length;
      return [role, count] as [AgentRole, number];
    })
    .filter(([role, count]) => count > 0);
  const totalAlive = entry.agents.filter(a => a.life === 'alive').length;

  const countsText = counts
    .map(([role, count]) => `${count}人の${roleTextMap[role]}`)
    .join('、');

  const content = (() => {
    switch (entry.event) {
      case 'periodStart':
        if (entry.day === 0) {
          return (
            <>
              この村には {countsText} がいるらしい。
              <br />
              村人による人狼対策会議が始まった。今日は、追放の投票および襲撃は行われない。
            </>
          );
        } else {
          return `${entry.day}日目の${
            entry.period === 'day' ? '昼' : '夜'
          }が始まった。現在生き残っているのは${totalAlive}人だ。`;
        }
      default:
        return entry.event;
    }
  })();

  return <li className="status">{content}</li>;
};

const ChatLogItem: FC<{ entry: BaseTalkLogEntry }> = props => {
  const { entry } = props;
  return (
    <li>
      <span className="speaker">{entry.agent}</span> {entry.content}
    </li>
  );
};

const ResultLogItem: FC<{ entry: ResultLogEntry }> = props => {
  const {
    entry: { survivingVillagers, survivingWerewolves, winner }
  } = props;
  const text = winner === 'villagers' ? '村人陣営の勝利。' : '人狼陣営の勝利。';
  const survivors =
    `${survivingVillagers}人の村人と` +
    `${survivingWerewolves}人の人狼が生き残った。`;
  return (
    <li className="result">
      <strong>{text}</strong>
      {survivors}
    </li>
  );
};

const GameLog: FC<{ game: Game }> = props => {
  const { game } = props;
  const { log } = game;
  const filteredLog = Object.values(log);
  return (
    <StyledGameLog>
      {filteredLog.map((entry, i) => {
        const itemMap: { [type in LogType]?: FC<any> } = {
          status: StatusLogItem,
          talk: ChatLogItem,
          result: ResultLogItem
        };
        const Item = itemMap[entry.type] ?? (() => null);
        return <Item key={i} game={game} entry={entry as any} />;
      })}
    </StyledGameLog>
  );
};

const StyledGameLog = styled.ul`
  margin: 10px;
  li {
    border: 1px solid #eeeeee;
    .speaker {
      font-weight: bold;
      margin-right: 15px;
    }
    &.status {
      background: #bbbbff;
    }
    &.result {
      background: yellow;
    }
  }
`;

const Status: FC<{ game: Game; myAgent: AgentInfo }> = props => {
  const { game, myAgent } = props;
  return (
    <StyledStatus>
      <div className="day">
        <big>{game.status.day}</big> 日目
      </div>
      <div className="time">
        <big>{game.status.period === 'day' ? '昼' : '夜'}</big>
      </div>
      <div className="my-role">
        あなた:{' '}
        <big>
          <RoleDisplay role={myAgent.role} />
        </big>{' '}
        ({myAgent.life === 'alive' ? '生存' : '死亡'})
      </div>
    </StyledStatus>
  );
};

const StyledStatus = styled.div`
  padding: 15px;
  background: #eeeeee;
  border: 1px solid silver;
  display: flex;
  gap: 15px;
  big {
    font-size: 180%;
  }
`;

type Action =
  | 'wait'
  | 'divine'
  | 'vote'
  | 'attackVote'
  | 'talk'
  | 'whisper'
  | 'finish';

type ActionComp = FC<{
  gameId: string;
  game: Game;
  myAgent: AgentInfo;
  action: Action;
}>;

const ChatAction: ActionComp = props => {
  const { gameId, game, myAgent, action } = props;
  const [content, setContent] = useState('');
  const api = useApi();

  if (action !== 'talk' && action !== 'whisper') return null;

  const handleSend = async () => {
    if (!content) return;
    const res = await api(action, { gameId, type: action, content });
    if (res.ok) setContent('');
  };

  const handleOver = async () => {
    const res = await api('over', { gameId });
  };

  return (
    <StyledChatAction>
      <input
        type="text"
        value={content}
        onChange={e => setContent(e.target.value)}
      />
      <button onClick={handleSend}>発話</button>
      <button onClick={handleOver}>会話を終了</button>
    </StyledChatAction>
  );
};

const StyledChatAction = styled.div`
  display: flex;
  gap: 5px;
  input {
    flex: 1;
  }
`;

const ChooseAction: ActionComp = props => {
  const { gameId, game, myAgent, action } = props;
  if (action !== 'vote' && action !== 'attackVote' && action !== 'divine')
    return null;
  const prompt = {
    vote: '誰を追放するか投票してください',
    attackVote: '誰を襲撃するか選択してください',
    divine: '誰を占うか選択してください'
  }[action];
  const api = useApi();

  const handleVote = async (target: AgentId) => {
    const res = await api(action, { gameId, type: action, target });
  };

  return (
    <div>
      <div className="prompt">{prompt}</div>
      {game.agents.map(agent => (
        <button key={agent.agentId} onClick={() => handleVote(agent.agentId)}>
          {agent.name}
        </button>
      ))}
    </div>
  );
};

const FinishAction: ActionComp = () => {
  return <div>このゲームは終了しました</div>;
};

const WaitAction: ActionComp = () => {
  return <div>他のプレーヤーの行動をお待ちください</div>;
};

const ActionPane: FC<{
  gameId: string;
  game: Game;
  myAgent: AgentInfo;
}> = props => {
  const { gameId, game, myAgent } = props;
  const { day, period, votePhase } = game.status;
  const todaysLog = (() => {
    let logDay = 0;
    return Object.values(game.log).filter(l => {
      if (l.type === 'status') logDay = l.day;
      return logDay === game.status.day;
    });
  })();
  const gameFinished = todaysLog.some(l => l.type === 'result');
  const action = ((): Action => {
    if (myAgent.life === 'dead') return 'wait';
    switch (period) {
      case 'day':
        if (gameFinished) return 'finish';
        if (typeof votePhase === 'number') {
          return todaysLog.some(
            l => l.type === 'vote' && l.agent === myAgent.agentId
          )
            ? 'wait'
            : 'vote';
        } else {
          return 'talk';
        }
      case 'night':
        switch (myAgent.role) {
          case 'villager':
          case 'possessed':
            return 'wait';
          case 'seer':
            return todaysLog.some(
              l => l.type === 'divine' && l.agent === myAgent.agentId
            )
              ? 'wait'
              : 'divine';
          case 'werewolf':
            if (typeof votePhase === 'number') {
              return todaysLog.some(
                l => l.type === 'attackVote' && l.agent === myAgent.agentId
              )
                ? 'wait'
                : 'attackVote';
            } else if (votePhase === 'settled') {
              return 'wait';
            } else {
              return 'whisper';
            }
        }
    }
  })();

  const actionMap: {
    [key in Action]: ActionComp;
  } = {
    wait: WaitAction,
    finish: FinishAction,
    divine: ChooseAction,
    vote: ChooseAction,
    attackVote: ChooseAction,
    talk: ChatAction,
    whisper: ChatAction
  };
  const ActionComp = actionMap[action];

  return (
    <StyledActionPane>
      <div className="title">あなたの行動</div>
      <div className="body">
        <ActionComp
          gameId={gameId}
          game={game}
          myAgent={myAgent}
          action={action}
        />
      </div>
    </StyledActionPane>
  );
};

const StyledActionPane = styled.div`
  margin: 10px;
  border: 1px solid silver;
  margin-top: 15px;
  .title {
    background: #eeeeee;
  }
  .body {
    padding: 15px;
  }
`;

const GameStage: FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: game } = useFirebaseSubscription<Game>(`/games/${gameId}`);

  const api = useApi();
  const loginUser = useLoginUser();

  if (loginUser.status !== 'loggedIn') return null;

  if (!game) return <div>Not Found</div>;

  const myAgent = game.agents.find(a => a.userId === loginUser.uid)!;

  const handleAbortClick = async () => {
    await api('abortGame', { gameId });
  };

  return (
    <div>
      <div>Game {gameId}</div>
      <Status game={game} myAgent={myAgent} />
      <Players game={game} myAgent={myAgent} />
      <GameLog game={game} />
      <ActionPane gameId={gameId!} game={game} myAgent={myAgent} />
      <pre style={{ maxHeight: '100px', overflowY: 'auto' }}>
        {JSON.stringify(game, null, 2)}
      </pre>
      {!game.finishedAt && (
        <div>
          <button onClick={handleAbortClick}>Abort</button>
        </div>
      )}
    </div>
  );
};

export default GameStage;
