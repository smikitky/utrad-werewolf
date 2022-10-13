import classNames from 'classnames';
import {
  FC,
  KeyboardEventHandler,
  MouseEventHandler,
  useEffect,
  useRef,
  useState
} from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  AgentId,
  AgentInfo,
  AgentRole,
  agentRoles,
  BaseVoteLogEntry,
  ChatLogEntry,
  DivineLogEntry,
  DivineResultLogEntry,
  Game,
  KillLogEntry,
  LogType,
  MediumResultLogEntry,
  OverLogEntry,
  GuardLogEntry,
  ResultLogEntry,
  StatusLogEntry,
  team
} from './game-data.js';
import {
  Action,
  agentAction,
  extractLogOfPeriod,
  lastVoteEntries,
  roleTextMap,
  teamTextMap
} from './game-utils.js';
import Icon from './Icon.js';
import { useApi } from './utils/useApi.js';
import useFirebaseSubscription from './utils/useFirebaseSubscription.js';
import { useLoginUser } from './utils/user.js';

const RoleDisplay: FC<{ role: AgentRole }> = props => {
  const { role } = props;
  return <>{roleTextMap[role]}</>;
};

const Player: FC<{
  agent: AgentInfo;
  isMe: boolean;
  revealRole?: boolean;
  onClick?: MouseEventHandler;
  active?: boolean;
  disabled?: boolean;
}> = props => {
  const { agent, isMe, revealRole, onClick, active, disabled } = props;
  return (
    <StyledPlayerDiv
      className={classNames({
        me: isMe,
        dead: agent.life === 'dead',
        clickable: !!onClick,
        active,
        disabled
      })}
      onClick={onClick ?? (() => {})}
    >
      <img src={`/agent${agent.agentId}.jpg`} alt="" />
      <div className="indicators">
        <div>{agent.name}</div>
        {isMe && <div>あなた</div>}
        {revealRole && <div>{roleTextMap[agent.role]}</div>}
      </div>
    </StyledPlayerDiv>
  );
};

const StyledPlayerDiv = styled.div`
  display: flex;
  border: 2px solid gray;
  background: white;
  &.me {
    border-color: blue;
    color: blue;
  }
  &.dead {
    border-color: brown;
    color: red;
    background: #cccccc;
    img {
      filter: grayscale(100%) brightness(0.3);
    }
  }
  img {
    width: 40px;
    aspect-ratio: 3/4;
  }
  &.clickable {
    cursor: pointer;
    transition: 0.2s;
    &.active {
      box-shadow: 0 0 0 2px blue;
      transform: scale(1.05);
    }
    &:hover:not(.disabled) {
      transform: scale(1.05);
    }
    &.disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }
  .indicators {
    flex: 1 1;
    padding: 0 5px;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    font-size: 80%;
    line-height: 17px;
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
              agent={agent}
              isMe={agent.agentId === myAgent.agentId}
              revealRole={agent.role === 'werewolf' && showWerewolf}
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

const VoteDetails: FC<{
  game: Game;
  voteEntries: BaseVoteLogEntry[];
}> = props => {
  const { game, voteEntries } = props;
  const agentName = (agentId: AgentId) =>
    game.agents.find(a => a.agentId === agentId)?.name;
  const sorted = [...voteEntries].sort((a, b) => a.agent - b.agent);
  return (
    <StyledVotes>
      <div>
        <Icon icon="how_to_vote" />
        投票結果
      </div>
      <ul>
        {sorted.map((entry, i) => {
          return (
            <li key={i}>
              {agentName(entry.agent)}
              <Icon icon="arrow_right" />
              {agentName(entry.target)}
            </li>
          );
        })}
      </ul>
    </StyledVotes>
  );
};

const StyledVotes = styled.div`
  font-size: 80%;
  ul {
    display: grid;
    gap: 0 5px;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }
`;

const StatusLogItem: FC<{
  game: Game;
  myAgent: AgentInfo;
  entry: StatusLogEntry;
}> = props => {
  const { game, myAgent, entry } = props;

  const content = (() => {
    switch (entry.event) {
      case 'periodStart': {
        const counts = agentRoles
          .map(role => {
            const count = game.agents.filter(
              a =>
                a.role === role &&
                entry.agents.find(a2 => a2.agentId === a.agentId)?.life ===
                  'alive'
            ).length;
            return [role, count] as [AgentRole, number];
          })
          .filter(([role, count]) => count > 0);
        const totalAlive = entry.agents.filter(a => a.life === 'alive').length;
        const countsText = counts
          .map(([role, count]) => `${count}人の${roleTextMap[role]}`)
          .join('、');
        if (entry.day === 0) {
          return (
            <>
              この村には <strong>{countsText}</strong> がいるらしい。
              <br />
              村人による人狼対策会議が始まった。今日は、追放の投票および襲撃は行われない。
            </>
          );
        } else {
          const icon = entry.period === 'day' ? 'wb_twilight' : 'nightlight';
          return (
            <>
              <Icon icon={icon} /> {entry.day} 日目の
              {entry.period === 'day' ? '昼' : '夜'}が始まった。現在
              {totalAlive} 人生き残っている。
            </>
          );
        }
      }
      case 'voteStart': {
        const type = entry.period === 'day' ? '追放' : '襲撃';
        if (entry.period === 'night' && myAgent.role !== 'werewolf')
          return null;
        if (entry.votePhase === 1)
          return `村の誰を${type}するかの投票が始まった。`;
        else {
          const voteEntries = lastVoteEntries(
            extractLogOfPeriod(game, { day: entry.day, period: entry.period }),
            entry.period === 'day' ? 'vote' : 'attackVote'
          );
          return (
            <>
              <VoteDetails game={game} voteEntries={voteEntries} />
              <hr />
              {type}の投票は決着しなかったため、{entry.votePhase}{' '}
              回目の投票が始まった。
              <br />
              再投票は 1
              回のみで、次も決着が付かない場合は最多得票者からランダムで犠牲者が選ばれる。
            </>
          );
        }
      }
      case 'voteSettle': {
        const voteEntries = lastVoteEntries(
          extractLogOfPeriod(game, { day: entry.day, period: entry.period }),
          entry.period === 'day' ? 'vote' : 'attackVote'
        );
        if (voteEntries.length === 0) return null;
        return <VoteDetails game={game} voteEntries={voteEntries} />;
      }
      default:
        return null;
    }
  })();

  if (!content) return null;
  return <li className={classNames('status', entry.event)}>{content}</li>;
};

const ChatLogItem: FC<{
  game: Game;
  myAgent: AgentInfo;
  entry: ChatLogEntry;
}> = props => {
  const { game, myAgent, entry } = props;
  const invisible = myAgent.role !== 'werewolf' && entry.type === 'whisper';
  if (invisible) return null;
  const agent = game.agents.find(a => a.agentId === entry.agent)!;
  return (
    <li className={entry.type}>
      <span className="speaker">{agent.name}</span> {entry.content}
    </li>
  );
};

const AbilityLogItem: FC<{
  game: Game;
  myAgent: AgentInfo;
  entry: DivineLogEntry | GuardLogEntry;
}> = props => {
  const { game, myAgent, entry } = props;
  if (myAgent.agentId !== entry.agent) return null;
  const target = game.agents.find(a => a.agentId === entry.target)!;
  return (
    <li className="ability">
      {entry.type === 'divine' ? (
        <>
          あなたは <b>{target.name}</b>{' '}
          の正体を占った。結果は翌朝に分かるだろう。
        </>
      ) : (
        <>
          あなたは <b>{target.name}</b> を人狼の襲撃から守るために護衛した。
        </>
      )}
    </li>
  );
};

const AbilityResultLogItem: FC<{
  game: Game;
  myAgent: AgentInfo;
  entry: DivineResultLogEntry | MediumResultLogEntry;
}> = props => {
  const { game, myAgent, entry } = props;
  if (myAgent.agentId !== entry.agent) return null;
  const target = game.agents.find(a => a.agentId === entry.target)!;
  const result = target.role === 'werewolf' ? '人狼だった' : '人狼ではなかった';
  return (
    <li className="ability">
      {entry.type === 'divineResult' ? (
        <>
          あなたの占いの結果、
          <strong>
            {target.name} は{result}
          </strong>
          。
        </>
      ) : (
        <>
          あなたの霊媒師としての能力が発動した。さきほど追放された{' '}
          <strong>
            {target.name} は{result}
          </strong>
          。
        </>
      )}
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
  const invisible = myAgent.role !== 'werewolf' && entry.chatType === 'whisper';
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
  const invisible = myAgent.role !== 'werewolf' && entry.type === 'attackVote';
  if (invisible) return null;
  const agent = game.agents.find(a => a.agentId === entry.agent)!;
  const targetAgent = game.agents.find(a => a.agentId === entry.target)!;
  return (
    <li className="over">
      <span className="speaker">{agent.name}</span> (投票終了)
      {myAgent.agentId === entry.agent && <> 投票先: {targetAgent.name}</>}
    </li>
  );
};

const KillLogItem: FC<{
  game: Game;
  myAgent: AgentInfo;
  entry: KillLogEntry;
}> = props => {
  const { game, myAgent, entry } = props;
  const agent = game.agents.find(a => a.agentId === entry.target);
  const message =
    entry.target === 'NOBODY' ? (
      <>今回の人狼による襲撃では誰も死ななかった。</>
    ) : entry.type === 'execute' ? (
      <>
        <Icon icon="new_releases" /> <strong>{agent!.name}</strong>{' '}
        は村人達によって追放された。
      </>
    ) : (
      <>
        <Icon icon="new_releases" /> <strong>{agent!.name}</strong>{' '}
        は人狼によって襲撃された。
      </>
    );
  return <li className={entry.type}>{message}</li>;
};

const ResultLogItem: FC<{
  game: Game;
  myAgent: AgentInfo;
  entry: ResultLogEntry;
}> = props => {
  const {
    game,
    myAgent,
    entry: { survivingVillagers, survivingWerewolves, winner }
  } = props;
  const text = winner === 'villagers' ? '村人陣営の勝利。' : '人狼陣営の勝利。';
  return (
    <li className="result">
      <div className="winner">{text}</div>
      <div className="details">
        {winner === 'werewolves' ? (
          <>
            生き残っている人狼の数（{survivingWerewolves} 名）が村人陣営の人数（
            {survivingVillagers} 名）以上となったため、人狼陣営の勝利となった。
          </>
        ) : (
          <>
            この村からはすべての人狼が追放された。
            <br />
            村人陣営からは {survivingVillagers} 名の村人が生き残った。
          </>
        )}
      </div>
      <div className="players">
        {game.agents.map(agent => (
          <Player
            key={agent.agentId}
            agent={agent}
            isMe={agent.agentId === myAgent.agentId}
            revealRole={true}
          />
        ))}
      </div>
      <div className="your-result">
        あなたが味方した陣営（{teamTextMap[team(myAgent.role)]}）
        {winner === team(myAgent.role) ? 'の勝利' : 'の敗北'}。
      </div>
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
          divine: AbilityLogItem,
          guard: AbilityLogItem,
          divineResult: AbilityResultLogItem,
          mediumResult: AbilityResultLogItem,
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
  > li {
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
      &.periodStart {
        background: #ccccdd;
        border: 2px solid #aaaaaa;
        padding: 7px 3px;
        &:not(:first-child) {
          margin-top: 20px;
        }
      }
      background: #dddddd;
      margin: 5px 0;
      border-radius: 10px;
      padding: 3px;
      text-align: center;
    }
    &.result {
      background: #ffddaa;
      text-align: center;
      border-radius: 10px;
      padding: 5px;
      > .winner {
        font-size: 120%;
        font-weight: bold;
      }
      > .players {
        display: flex;
        gap: 5px;
        justify-content: center;
      }
      > .your-result {
        font-weight: bold;
        background: white;
        margin: 5px auto;
      }
    }
    &.ability {
      color: green;
      background: #eeffee;
    }
    &.over,
    &.vote {
      font-size: 80%;
      color: gray;
    }
    &.attack,
    &.execute {
      padding: 0 5px;
      color: red;
      font-weight: bold;
      background: #ffdddd;
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
        {game.finishedAt ? (
          <big>ゲーム{game.wasAborted ? '中断' : '終了'}</big>
        ) : (
          <>
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
          </>
        )}
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
    background: linear-gradient(to bottom, #8888ff, #aaaaaa);
  }
  .status {
    display: flex;
    justify-content: center;
    gap: 15px;
  }
  big {
    font-size: 180%;
    font-weight: bolder;
  }
`;

type ActionComp = FC<{
  gameId: string;
  game: Game;
  myAgent: AgentInfo;
  action: Action;
}>;

const ChatAction: ActionComp = props => {
  const { gameId, game, myAgent, action } = props;

  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const api = useApi();

  if (action !== 'talk' && action !== 'whisper') return null;
  const actionName = action === 'talk' ? '発言' : '囁き';

  const handleSend = async () => {
    if (!content) return;
    setBusy(true);
    try {
      const res = await api(action, { gameId, content });
      if (res.ok) setContent('');
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown: KeyboardEventHandler = event => {
    if (event.key === 'Enter') handleSend();
  };

  const handleOver = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api('over', { gameId });
    } finally {
      setBusy(false);
    }
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
      <button onClick={handleSend} disabled={busy || !content}>
        {actionName}
      </button>
      <button onClick={handleOver} disabled={busy}>
        会話を終了
      </button>
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
  const [target, setTarget] = useState<AgentId | null>(null);
  const [busy, setBusy] = useState(false);

  if (
    action !== 'vote' &&
    action !== 'attackVote' &&
    action !== 'divine' &&
    action !== 'guard'
  )
    return null;

  const prompt = {
    vote: (
      <>
        誰を<strong>追放する</strong>か投票してください
      </>
    ),
    attackVote: (
      <>
        誰を<strong>襲撃する</strong>か選択してください
      </>
    ),
    divine: (
      <>
        誰を<strong>占う</strong>か選択してください
      </>
    ),
    guard: (
      <>
        誰を<strong>襲撃から守る</strong>か選択してください
      </>
    )
  }[action];
  const api = useApi();

  const handleVote = async () => {
    if (typeof target === 'number') {
      setBusy(true);
      await api(action, { gameId, type: action, target });
      setBusy(false);
    }
  };

  return (
    <StyledChooseDiv>
      <div className="prompt">{prompt}</div>
      <div className="panel">
        <ul className="choices">
          {game.agents.map(agent => {
            const canVote =
              agent.life === 'alive' &&
              agent.agentId !== myAgent.agentId &&
              !(action === 'attackVote' && agent.role === 'werewolf');
            return (
              <li key={agent.agentId}>
                <Player
                  agent={agent}
                  isMe={agent.userId === myAgent.userId}
                  onClick={() => canVote && setTarget(agent.agentId)}
                  active={canVote && target === agent.agentId}
                  disabled={!canVote}
                />
              </li>
            );
          })}
        </ul>
        <button disabled={target === null || busy} onClick={handleVote}>
          決定
        </button>
      </div>
    </StyledChooseDiv>
  );
};

const StyledChooseDiv = styled.div`
  > .prompt strong {
    color: brown;
  }
  > .panel {
    display: flex;
    gap: 15px;
    align-items: center;
    > .choices {
      flex: 1 1;
      display: flex;
      flex-flow: row wrap;
      justify-content: space-around;
      gap: 5px;
      button:disabled {
        opacity: 0.5;
      }
    }
    > button {
      font-size: 150%;
      width: 120px;
      height: 60px;
    }
  }
`;

const FinishAction: ActionComp = props => {
  const { game } = props;
  return (
    <div>このゲームは{game.wasAborted ? '中断されました' : '終了しました'}</div>
  );
};

const WaitAction: ActionComp = props => {
  const { myAgent } = props;
  if (myAgent.life === 'alive') {
    return <div>他のプレーヤーの行動をお待ちください</div>;
  } else {
    return <div>あなたは死亡してしまった</div>;
  }
};

const ActionPane: FC<{
  gameId: string;
  game: Game;
  myAgent: AgentInfo;
}> = props => {
  const { gameId, game, myAgent } = props;
  const action = agentAction(game, myAgent);

  const actionMap: {
    [key in Action]: ActionComp;
  } = {
    wait: WaitAction,
    finish: FinishAction,
    divine: ChooseAction,
    guard: ChooseAction,
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
  border: 3px inset #770000;
  border-radius: 5px;
  margin-top: 15px;
  position: relative;
  > .title {
    position: relative;
    width: 120px;
    text-align: center;
    left: 20px;
    top: -13px;
    font-weight: bolder;
    background: white;
  }
  > .body {
    padding: 0px 15px 15px 15px;
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

  return (
    <StyledGameStage>
      <Status game={game} myAgent={myAgent} />
      <GameLog game={game} />
      <ActionPane gameId={gameId!} game={game} myAgent={myAgent} />
    </StyledGameStage>
  );
};

const StyledGameStage = styled.div`
  display: grid;
  height: 100%;
  position: relative;
  grid-template-rows: auto 1fr auto auto;
`;

export default GameStage;
