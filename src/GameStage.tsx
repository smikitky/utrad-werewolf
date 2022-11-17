import classNames from 'classnames';
import { FC, KeyboardEventHandler, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import Alert from './Alert .js';
import { AgentId, AgentInfo, AgentRole, Game } from './game-data.js';
import {
  Action,
  agentAction,
  extractLogOfPeriod,
  roleTextMap
} from './game-utils.js';
import GameLog from './game/GameLog.js';
import Player from './game/Player.js';
import { useApi } from './utils/useApi.js';
import useFirebaseSubscription from './utils/useFirebaseSubscription.js';
import { useLoginUser } from './utils/user.js';
import withLoginBoundary, { Page } from './withLoginBoundary.js';

const RoleDisplay: FC<{ role: AgentRole }> = props => {
  const { role } = props;
  return <>{roleTextMap[role]}</>;
};

const Players: FC<{
  game: Game;
  myAgent: AgentInfo;
  revealAll: boolean;
}> = props => {
  const { game, myAgent, revealAll } = props;
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
              revealRole={
                revealAll || (agent.role === 'werewolf' && showWerewolf)
              }
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
  gap: 5px;
`;

const Status: FC<{
  game: Game;
  myAgent: AgentInfo;
  revealAll: boolean;
  onRevealAll: () => void;
}> = props => {
  const { game, myAgent, revealAll, onRevealAll } = props;

  return (
    <StyledStatus
      className={classNames({ night: game.status.period === 'night' })}
    >
      <div className="status">
        {game.finishedAt ? (
          <>
            <big>ゲーム{game.wasAborted ? '中断' : '終了'}</big>
            <button onClick={onRevealAll} disabled={revealAll}>
              完全ログを見る
            </button>
          </>
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
      <Players game={game} myAgent={myAgent} revealAll={revealAll} />
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
    align-items: center;
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
  revealAll: boolean;
  onRevealAll: () => void;
}>;

const ChatAction: ActionComp = props => {
  const { gameId, game, myAgent, action } = props;

  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const api = useApi();

  if (action !== 'talk' && action !== 'whisper') return null;
  const actionName = action === 'talk' ? '発言' : '囁き';

  const handleSend = async () => {
    if (!content || busy) return;
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

  const remaining =
    10 -
    extractLogOfPeriod(game).filter(
      l => l.type === action && l.agent === myAgent.agentId
    ).length;

  return (
    <StyledChatAction>
      <span className="title">
        {actionName} <small>(残{remaining}/10)</small>
      </span>
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
  const { game, onRevealAll, revealAll } = props;
  return (
    <div>
      このゲームは{game.wasAborted ? '中断されました' : '終了しました'}。
      <button onClick={onRevealAll} disabled={revealAll}>
        完全ログを表示する
      </button>
    </div>
  );
};

const WaitAction: ActionComp = props => {
  const { myAgent, revealAll, onRevealAll } = props;
  if (myAgent.life === 'alive') {
    return <div>他のプレーヤーの行動をお待ちください</div>;
  } else {
    return (
      <div>
        あなたは死亡してしまった。
        <button disabled={revealAll} onClick={onRevealAll}>
          残りを完全ログで観戦
        </button>
      </div>
    );
  }
};

const ActionPane: FC<{
  gameId: string;
  game: Game;
  myAgent: AgentInfo;
  revealAll: boolean;
  onRevealAll: () => void;
}> = props => {
  const { gameId, game, myAgent, revealAll, onRevealAll } = props;
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
          revealAll={revealAll}
          onRevealAll={onRevealAll}
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

const GameStage: Page = ({ loginUser }) => {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: game } = useFirebaseSubscription<Game>(`/games/${gameId}`);
  const [revealAll, setRevealAll] = useState(false);

  const api = useApi();

  if (game === null) return <Alert>該当ゲームデータは存在しません</Alert>;
  if (!game) return null;

  const myAgent = game.agents.find(a => a.userId === loginUser.uid);

  if (!myAgent) {
    return (
      <Alert>
        <div>
          あなたはこのゲームに参加していません
          {loginUser.data.canBeGod && (
            <div>
              <Link to={`/god/${gameId}`}>
                <button>God Mode で見る</button>
              </Link>
            </div>
          )}
        </div>
      </Alert>
    );
  }

  const handleRevealAll = () => setRevealAll(true);

  return (
    <StyledGameStage>
      <Status
        game={game}
        myAgent={myAgent}
        revealAll={revealAll}
        onRevealAll={handleRevealAll}
      />
      <GameLog game={game} myAgent={revealAll ? 'god' : myAgent} />
      <ActionPane
        gameId={gameId!}
        game={game}
        myAgent={myAgent}
        revealAll={revealAll}
        onRevealAll={handleRevealAll}
      />
    </StyledGameStage>
  );
};

const StyledGameStage = styled.div`
  display: grid;
  height: 100%;
  position: relative;
  grid-template-rows: auto 1fr auto auto;
`;

export default withLoginBoundary()(GameStage);
