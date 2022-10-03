import classNames from 'classnames';
import { FC, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  AgentId,
  AgentInfo,
  AgentRole,
  Game,
  LogEntries,
  TalkLogEntry
} from './game-data.js';
import { useApi } from './utils/useApi.js';
import useFirebaseSubscription from './utils/useFirebaseSubscription.js';
import { useLoginUser } from './utils/user.js';

const RoleDisplay: FC<{ role: AgentRole }> = props => {
  const { role } = props;
  const roleTextMap: { [key in AgentRole]: string } = {
    villager: '村人',
    werewolf: '人狼',
    seer: '占い師',
    possessed: '裏切り者'
  };
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

const ChatLog: FC<{ log: LogEntries }> = props => {
  const { log } = props;
  const filteredLog = Object.values(log).filter(
    entry => entry.type === 'talk' || entry.type === 'whisper'
  ) as TalkLogEntry[];
  return (
    <StyledChatLog>
      {filteredLog.map((entry, i) => (
        <li key={i}>
          <span className="speaker">{entry.agent}</span> {entry.content}
        </li>
      ))}
    </StyledChatLog>
  );
};

const StyledChatLog = styled.ul`
  list-style: none;
  li {
    border: 1px solid #eeeeee;
    .speaker {
      font-weight: bold;
      margin-right: 15px;
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

type Action = 'wait' | 'divine' | 'vote' | 'attackVote' | 'talk' | 'whisper';

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
    <>
      <div>
        <input
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
        />
        <button onClick={handleSend}>発話</button>
      </div>
      <button onClick={handleOver}>発話終了</button>
    </>
  );
};

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
  const action = ((): Action => {
    if (myAgent.life === 'dead') return 'wait';
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
    divine: ChooseAction,
    vote: ChooseAction,
    attackVote: ChooseAction,
    talk: ChatAction,
    whisper: ChatAction
  };
  const ActionComp = actionMap[action];

  return (
    <div>
      <h2>あなたの行動</h2>
      <ActionComp
        gameId={gameId}
        game={game}
        myAgent={myAgent}
        action={action}
      />
    </div>
  );
};

const GameStage: FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: game } = useFirebaseSubscription<Game>(`/games/${gameId}`);

  const api = useApi();
  const loginUser = useLoginUser();

  if (loginUser.status !== 'loggedIn') return null;

  if (!game) return <div>Not Found</div>;

  const myAgent = game.agents.find(a => a.userId === loginUser.uid)!;

  return (
    <div>
      Game {gameId}
      <pre>{JSON.stringify(game, null, 2)}</pre>
      <Status game={game} myAgent={myAgent} />
      <Players game={game} myAgent={myAgent} />
      <ChatLog log={game.log} />
      <ActionPane gameId={gameId!} game={game} myAgent={myAgent} />
    </div>
  );
};

export default GameStage;
