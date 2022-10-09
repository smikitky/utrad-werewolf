import classNames from 'classnames';
import {
  FC,
  useState,
  KeyboardEvent,
  KeyboardEventHandler,
  useRef,
  useEffect
} from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  AgentId,
  AgentInfo,
  AgentRole,
  agentRoles,
  BaseTalkLogEntry,
  BaseVoteLogEntry,
  DivineLogEntry,
  DivineResultLogEntry,
  Game,
  KillLogEntry,
  LogType,
  OverLogEntry,
  ResultLogEntry,
  StatusLogEntry,
  team
} from './game-data.js';
import { roleTextMap, teamTextMap } from './game-utils.js';
import { useApi } from './utils/useApi.js';
import useFirebaseSubscription from './utils/useFirebaseSubscription.js';
import { useLoginUser } from './utils/user.js';

const RoleDisplay: FC<{ role: AgentRole }> = props => {
  const { role } = props;
  return <>{roleTextMap[role]}</>;
};

const Player: FC<{
  agentId: AgentId;
  name: string;
  isMe: boolean;
  isDead: boolean;
  isWerewolf: boolean;
}> = props => {
  const { agentId, name, isMe, isDead, isWerewolf } = props;
  const text = [isMe ? 'あなた' : null, isWerewolf ? '🐺' : null]
    .filter(Boolean)
    .join('/');
  return (
    <StyledPlayerDiv
      className={classNames({ me: isMe, dead: isDead, werewolf: isWerewolf })}
    >
      <img src={`/public/agent${agentId}.jpg`} alt={`Agent[${agentId}]`} />
      <div className="name">{name}</div>
      <div className="indicator">{text}</div>
    </StyledPlayerDiv>
  );
};

const StyledPlayerDiv = styled.div`
  border: 2px solid black;
  background: white;
  width: 80px;
  &.me {
    border-color: blue;
    color: blue;
  }
  &.dead {
    color: red;
    img {
      filter: grayscale(100%) brightness(0.5);
    }
  }
  img {
    width: 100%;
    aspect-ratio: 3/4;
  }
  > .name,
  > .indicator {
    font-size: 80%;
    height: 1.5em;
    text-align: center;
  }
`;

const Players: FC<{ game: Game; myAgent: AgentInfo }> = props => {
  const { game, myAgent } = props;
  const iAmWerewolf = myAgent.role === 'werewolf';
  return (
    <StyledPlayers>
      {game.agents.map(agent => {
        const showWerewolf = iAmWerewolf && agent.role === 'werewolf';
        return (
          <li key={agent.agentId}>
            <Player
              agentId={agent.agentId}
              name={agent.name}
              isMe={agent.agentId === myAgent.agentId}
              isDead={agent.life === 'dead'}
              isWerewolf={showWerewolf}
            />
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
  justify-content: center;
  gap: 10px;
`;

const StatusLogItem: FC<{
  game: Game;
  myAgent: AgentInfo;
  entry: StatusLogEntry;
}> = props => {
  const { game, myAgent, entry } = props;

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
          return `${entry.day} 日目の${
            entry.period === 'day' ? '昼' : '夜'
          }が始まった。現在 ${totalAlive} 人生き残っている。`;
        }
      case 'voteStart': {
        const type = entry.period === 'day' ? '追放' : '襲撃';
        if (entry.period === 'night' && team(myAgent.role) !== 'werewolves')
          return null;
        if (entry.votePhase === 1)
          return `村の誰を${type}するかの投票が始まった。`;
        else
          return `${type}の投票は決着しなかったため ${entry.votePhase} 回目の投票が始まった。`;
      }
      default:
        return null;
    }
  })();

  if (!content) return null;
  return <li className="status">{content}</li>;
};

const ChatLogItem: FC<{
  game: Game;
  myAgent: AgentInfo;
  entry: BaseTalkLogEntry;
}> = props => {
  const { game, myAgent, entry } = props;
  const invisible =
    team(myAgent.role) === 'villagers' && entry.type === 'whisper';
  if (invisible) return null;
  const agent = game.agents.find(a => a.agentId === entry.agent)!;
  return (
    <li className={entry.type}>
      <span className="speaker">{agent.name}</span> {entry.content}
    </li>
  );
};

const DivineLogItem: FC<{
  game: Game;
  myAgent: AgentInfo;
  entry: DivineLogEntry;
}> = props => {
  const { game, myAgent, entry } = props;
  if (myAgent.agentId !== entry.agent) return null;
  const target = game.agents.find(a => a.agentId === entry.target)!;
  return (
    <li className="divine">{target.name} を占った。結果は翌朝に分かる。</li>
  );
};

const DivineResultLogItem: FC<{
  game: Game;
  myAgent: AgentInfo;
  entry: DivineResultLogEntry;
}> = props => {
  const { game, myAgent, entry } = props;
  if (myAgent.agentId !== entry.agent) return null;
  const target = game.agents.find(a => a.agentId === entry.target)!;
  const result = target.role === 'werewolf' ? '人狼だった' : '人狼ではなかった';
  return (
    <li className="divine">
      占いの結果、
      <strong>
        {target.name} は{result}
      </strong>
      。
    </li>
  );
};

const OverItem: FC<{
  game: Game;
  myAgent: AgentInfo;
  entry: OverLogEntry;
}> = props => {
  const { game, myAgent, entry } = props;
  const agent = game.agents.find(a => a.agentId === entry.agent)!;
  const invisible =
    team(myAgent.role) === 'villagers' && entry.chatType === 'whisper';
  if (invisible) return null;
  return (
    <li className="over">
      <span className="speaker">{agent.name}</span> (発話終了)
    </li>
  );
};

const VoteLogItem: FC<{
  game: Game;
  myAgent: AgentInfo;
  entry: BaseVoteLogEntry;
}> = props => {
  const { game, myAgent, entry } = props;
  const invisible = myAgent.role === 'villager' && entry.type === 'attackVote';
  if (invisible) return null;
  const agent = game.agents.find(a => a.agentId === entry.agent)!;
  return (
    <li className="over">
      <span className="speaker">{agent.name}</span> (投票終了)
    </li>
  );
};

const KillLogItem: FC<{
  game: Game;
  myAgent: AgentInfo;
  entry: KillLogEntry;
}> = props => {
  const { game, myAgent, entry } = props;
  const agent = game.agents.find(a => a.agentId === entry.target)!;
  const killType =
    entry.type === 'execute'
      ? '村人達によって追放された'
      : '人狼によって襲撃された';
  return (
    <li className={entry.type}>
      {agent.name} は{killType}。
    </li>
  );
};

const ResultLogItem: FC<{ entry: ResultLogEntry }> = props => {
  const {
    entry: { survivingVillagers, survivingWerewolves, winner }
  } = props;
  const text = winner === 'villagers' ? '村人陣営の勝利。' : '人狼陣営の勝利。';
  const survivors =
    `${survivingVillagers} 人の村人と ` +
    `${survivingWerewolves} 人の人狼が生き残った。`;
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
  const divRef = useRef<HTMLUListElement>(null);
  const entries = Object.values(log);
  const user = useLoginUser();
  if (user.status !== 'loggedIn') return null;
  const myAgent = game.agents.find(a => a.userId === user.uid)!;

  useEffect(() => {
    if (divRef.current) {
      divRef.current.scrollTop = divRef.current.scrollHeight;
    }
  });

  return (
    <StyledGameLog ref={divRef}>
      {entries.map((entry, i) => {
        const itemMap: { [type in LogType]?: FC<any> } = {
          status: StatusLogItem,
          talk: ChatLogItem,
          whisper: ChatLogItem,
          divine: DivineLogItem,
          divineResult: DivineResultLogItem,
          vote: VoteLogItem,
          attackVote: VoteLogItem,
          attack: KillLogItem,
          execute: KillLogItem,
          over: OverItem,
          result: ResultLogItem
        };
        const Item = itemMap[entry.type] ?? (() => null);
        return (
          <Item key={i} game={game} myAgent={myAgent} entry={entry as any} />
        );
      })}
    </StyledGameLog>
  );
};

const StyledGameLog = styled.ul`
  margin: 10px;
  padding-right: 5px;
  overflow-y: scroll;
  scroll-behavior: smooth;
  li {
    border: 1px solid #eeeeee;
    .speaker {
      font-weight: bold;
      margin-right: 15px;
    }
    &.talk {
      background: #ffffee;
    }
    &.whisper {
      background: navy;
      color: white;
    }
    &.status {
      background: #bbbbbb;
      border: 2px solid #888888;
      margin: 5px 0;
      border-radius: 10px;
      padding: 3px;
      text-align: center;
    }
    &.result {
      background: yellow;
    }
    &.divine {
      color: green;
    }
    &.divine-result {
      color: green;
    }
    &.over,
    &.vote {
      font-size: 80%;
      color: gray;
    }
    &.attack,
    &.execute {
      color: red;
      font-weight: bold;
      background: #ffbbbb;
    }
  }
`;

const Status: FC<{ game: Game; myAgent: AgentInfo }> = props => {
  const { game, myAgent } = props;
  return (
    <StyledStatus
      className={classNames({ night: game.status.period === 'night' })}
    >
      <div className="status">
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
      </div>
      <Players game={game} myAgent={myAgent} />
    </StyledStatus>
  );
};

const StyledStatus = styled.div`
  padding: 10px;
  background: linear-gradient(to bottom, #ffffaa, #ffff88);
  border: 1px solid silver;
  &.night {
    background: linear-gradient(to bottom, #8888ff, #888888);
  }
  .status {
    display: flex;
    justify-content: center;
    gap: 15px;
  }
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
  const actionName = action === 'talk' ? '発言' : '囁き';

  const handleSend = async () => {
    if (!content) return;
    const res = await api(action, { gameId, content });
    if (res.ok) setContent('');
  };

  const handleKeyDown: KeyboardEventHandler = event => {
    if (event.key === 'Enter') handleSend();
  };

  const handleOver = async () => {
    const res = await api('over', { gameId });
  };

  return (
    <StyledChatAction>
      <span className="title">{actionName}</span>
      <input
        type="text"
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button onClick={handleSend}>{actionName}</button>
      <button onClick={handleOver}>会話を終了</button>
    </StyledChatAction>
  );
};

const StyledChatAction = styled.div`
  display: flex;
  gap: 5px;
  .title {
    font-weight: bold;
  }
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
    await api(action, { gameId, type: action, target });
  };

  return (
    <StyledChooseDiv>
      <div className="prompt">{prompt}</div>
      <div className="choices">
        {game.agents.map(agent => {
          const canVote =
            agent.life === 'alive' && agent.agentId !== myAgent.agentId;
          return (
            <button
              disabled={!canVote}
              key={agent.agentId}
              onClick={() => handleVote(agent.agentId)}
            >
              <Player
                agentId={agent.agentId}
                name={agent.name}
                isDead={agent.life === 'dead'}
                isMe={agent.userId === myAgent.userId}
                isWerewolf={false}
              />
            </button>
          );
        })}
      </div>
    </StyledChooseDiv>
  );
};

const StyledChooseDiv = styled.div`
  .choices {
    display: flex;
    gap: 5px;
    button:disabled {
      opacity: 0.5;
    }
  }
`;

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
  const gameFinished = !!game.finishedAt;
  const action = ((): Action => {
    if (myAgent.life === 'dead') return 'wait';
    if (gameFinished) return 'finish';
    switch (period) {
      case 'day':
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
  border: 3px solid gray;
  margin-top: 15px;
  > .title {
    background: #aaaaaa;
  }
  > .body {
    padding: 15px;
  }
`;

const GameStage: FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: game } = useFirebaseSubscription<Game>(`/games/${gameId}`);
  const [showDebugLog, setShowDebugLog] = useState(false);

  const api = useApi();
  const loginUser = useLoginUser();

  if (loginUser.status !== 'loggedIn') return null;

  if (!game) return <div>Not Found</div>;

  const myAgent = game.agents.find(a => a.userId === loginUser.uid)!;

  const handleAbortClick = async () => {
    await api('abortGame', { gameId });
  };

  return (
    <StyledGameStage>
      <Status game={game} myAgent={myAgent} />
      <GameLog game={game} />
      <ActionPane gameId={gameId!} game={game} myAgent={myAgent} />
      <div>
        <button disabled={!!game.finishedAt} onClick={handleAbortClick}>
          Abort
        </button>
        <button onClick={() => setShowDebugLog(!showDebugLog)}>Debug</button>
        <span>Game: {gameId}</span>
      </div>
      {showDebugLog && (
        <pre className="debug-log">{JSON.stringify(game, null, 2)}</pre>
      )}
    </StyledGameStage>
  );
};

const StyledGameStage = styled.div`
  display: grid;
  height: 100%;
  position: relative;
  grid-template-rows: auto 1fr auto auto;
  .debug-log {
    position: absolute;
    border: 1px solid silver;
    background: white;
    overflow: scroll;
    width: 100%;
    max-height: 90%;
    resize: both;
  }
`;

export default GameStage;
