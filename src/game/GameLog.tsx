import classNames from 'classnames';
import { FC, ReactElement, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import Icon from '../Icon.js';
import { makeLangResource } from '../LangResource.js';
import { TeamDisplay } from '../RoleDisplay.js';
import {
  AgentId,
  AgentInfo,
  AgentRole,
  AttackVoteLogEntry,
  ChatLogEntry,
  DivineLogEntry,
  DivineResultLogEntry,
  Game,
  GameStatus,
  GuardLogEntry,
  GuardResultLogEntry,
  KillLogEntry,
  LogEntry,
  LogType,
  OverLogEntry,
  ResultLogEntry,
  StatusLogEntry,
  VoteLogEntry,
  agentRoles,
  team
} from '../game-data.js';
import { extractLogOfPeriod, roleTextMap, voteEntries } from '../game-utils.js';
import useLang from '../utils/useLang.js';
import Player from './Player.js';

const LangResource = makeLangResource({
  noVote: { en: 'No vote', ja: '投票なし' }
});

const VoteDetails: FC<{
  game: Game;
  targetStatus: Omit<GameStatus, 'votePhae'>;
  targetVotePhase: number | 'last';
}> = props => {
  const { game, targetStatus, targetVotePhase } = props;
  const agentName = (agentId: AgentId) =>
    game.agents.find(a => a.agentId === agentId)?.name;

  const entries = useMemo(() => {
    return voteEntries(
      extractLogOfPeriod(game, targetStatus),
      targetStatus.period === 'day' ? 'vote' : 'attackVote',
      targetVotePhase
    ).sort((a, b) => a.agent - b.agent);
  }, [game, targetStatus, targetVotePhase]);

  if (entries.length === 0)
    return (
      <StyledVotes>
        <Icon icon="how_to_vote" />
        <LangResource id="noVote" />
      </StyledVotes>
    );

  return (
    <StyledVotes>
      <div>
        <Icon icon="how_to_vote" />
        {targetStatus.period === 'day' ? '追放' : '襲撃'}投票結果
      </div>
      <ul>
        {entries.map((entry, i) => {
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

type LogItem<T extends LogEntry> = (props: {
  game: Game;
  myAgent: AgentInfo | 'god';
  entry: T;
}) => ReactElement<any, any> | null;

const StatusLogItem: LogItem<StatusLogEntry> = props => {
  const { game, myAgent, entry } = props;
  const lang = useLang();

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
          .map(([role, count]) => `${count} 人の${roleTextMap[lang][role]}`)
          .join('、');
        if (entry.day === 0) {
          return (
            <>
              この村には <strong>{countsText}</strong> がいるらしい。
              <br />
              村人による人狼対策会議が始まった。
              <br />
              今日は、追放の投票および襲撃は行われない。
            </>
          );
        } else {
          const icon = entry.period === 'day' ? 'wb_twilight' : 'nightlight';
          return (
            <>
              <Icon icon={icon} /> {entry.day} 日目の
              {entry.period === 'day' ? '昼' : '夜'}が始まった。現在{' '}
              {totalAlive} 人生き残っている。
            </>
          );
        }
      }
      case 'voteStart': {
        const type = entry.period === 'day' ? '追放' : '襲撃';
        if (
          entry.period === 'night' &&
          myAgent !== 'god' &&
          myAgent.role !== 'werewolf'
        )
          return null;
        if (entry.votePhase === 1)
          return `村の誰を${type}するかの投票が始まった。`;
        else {
          return (
            <>
              <VoteDetails
                game={game}
                targetStatus={entry}
                targetVotePhase={(entry.votePhase as number) - 1}
              />
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
        if (
          myAgent !== 'god' &&
          entry.period === 'night' &&
          myAgent.role !== 'werewolf'
        )
          return null;
        return (
          <VoteDetails
            game={game}
            targetStatus={entry}
            targetVotePhase="last"
          />
        );
      }
      default:
        return null;
    }
  })();

  if (!content) return null;
  return <li className={classNames('status', entry.event)}>{content}</li>;
};

const ChatLogItem: LogItem<ChatLogEntry> = props => {
  const { game, myAgent, entry } = props;
  const lang = useLang();

  const invisible =
    myAgent !== 'god' &&
    myAgent.role !== 'werewolf' &&
    entry.type === 'whisper';
  if (invisible) return null;
  const agent = game.agents.find(a => a.agentId === entry.agent)!;
  return (
    <li className={entry.type}>
      <span className="speaker">{agent.name}</span>
      <span className="content">
        {myAgent === 'god' && (
          <span className="speaker-role">
            {agent.role === 'werewolf'
              ? lang === 'en'
                ? 'W'
                : '狼'
              : roleTextMap[lang][agent.role].charAt(0)}
          </span>
        )}
        {entry.content}
      </span>
    </li>
  );
};

const AbilityLogItem: LogItem<DivineLogEntry | GuardLogEntry> = props => {
  const { game, myAgent, entry } = props;
  if (myAgent !== 'god' && myAgent.agentId !== entry.agent) return null;
  const agentName =
    myAgent === 'god'
      ? game.agents.find(a => a.agentId === entry.agent)!.name
      : 'あなた';
  const target = game.agents.find(a => a.agentId === entry.target)!;
  return (
    <li className="ability">
      {entry.type === 'divine' ? (
        <>
          {agentName} は <b>{target.name}</b>{' '}
          の正体を占った。結果は翌朝に分かるだろう。
        </>
      ) : (
        <>
          {agentName} は <b>{target.name}</b>{' '}
          を人狼の襲撃から守るために護衛した。
        </>
      )}
    </li>
  );
};

const AbilityResultLogItem: LogItem<
  DivineResultLogEntry | GuardResultLogEntry
> = props => {
  const { game, myAgent, entry } = props;
  if (myAgent !== 'god' && myAgent.agentId !== entry.agent) return null;
  const agentName =
    myAgent === 'god'
      ? game.agents.find(a => a.agentId === entry.agent)!.name
      : 'あなた';
  const target = game.agents.find(a => a.agentId === entry.target)!;
  const result = target.role === 'werewolf' ? '人狼だった' : '人狼ではなかった';
  return (
    <li className="ability">
      {entry.type === 'divineResult' ? (
        <>
          {agentName} の占いの結果、
          <strong>
            {target.name} は{result}
          </strong>
          。
        </>
      ) : (
        <>
          {agentName} の霊媒師としての能力が発動した。さきほど追放された{' '}
          <strong>
            {target.name} は{result}
          </strong>
          。
        </>
      )}
    </li>
  );
};

const OverItem: LogItem<OverLogEntry> = props => {
  const { game, myAgent, entry } = props;
  const agent = game.agents.find(a => a.agentId === entry.agent)!;
  const invisible =
    myAgent !== 'god' &&
    myAgent.role !== 'werewolf' &&
    entry.chatType === 'whisper';
  if (invisible) return null;
  return (
    <li className="over">
      <span className="speaker">{agent.name}</span> (発話終了)
    </li>
  );
};

const VoteLogItem: LogItem<VoteLogEntry | AttackVoteLogEntry> = props => {
  const { game, myAgent, entry } = props;
  const invisible =
    myAgent !== 'god' &&
    myAgent.role !== 'werewolf' &&
    entry.type === 'attackVote';
  if (invisible) return null;
  const agent = game.agents.find(a => a.agentId === entry.agent)!;
  const targetAgent = game.agents.find(a => a.agentId === entry.target)!;
  return (
    <li className="over">
      <span className="speaker">{agent.name}</span> (投票終了)
      {(myAgent === 'god' || myAgent.agentId === entry.agent) && (
        <> 投票先: {targetAgent.name}</>
      )}
    </li>
  );
};

const KillLogItem: LogItem<KillLogEntry> = props => {
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
        は人狼によって襲撃され命を落とした。
      </>
    );
  return <li className={entry.type}>{message}</li>;
};

const ResultLogItem: LogItem<ResultLogEntry> = props => {
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
            isMe={myAgent !== 'god' && agent.agentId === myAgent.agentId}
            revealRole={true}
          />
        ))}
      </div>
      {myAgent !== 'god' && (
        <div className="your-result">
          あなたが味方した陣営（
          <TeamDisplay team={team(myAgent.role)} />）
          {winner === team(myAgent.role) ? (
            <>
              の勝利。
              <Icon icon="military_tech" />
            </>
          ) : (
            <>
              の敗北。
              <Icon icon="mood_bad" />
            </>
          )}
        </div>
      )}
    </li>
  );
};

const GameLog: FC<{ game: Game; myAgent: AgentInfo | 'god' }> = props => {
  const { game, myAgent } = props;
  const { log } = game;
  const divRef = useRef<HTMLUListElement>(null);
  const lastLogRef = useRef<string>();
  const entries = Object.entries(log);

  useEffect(() => {
    if (
      entries[entries.length - 1]?.[0] !== lastLogRef.current &&
      divRef.current
    ) {
      divRef.current.scrollTop = divRef.current.scrollHeight;
      lastLogRef.current = entries[entries.length - 1]?.[0];
    }
  });

  return (
    <StyledGameLog ref={divRef}>
      {entries.map(([id, entry]) => {
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
          <Item key={id} game={game} myAgent={myAgent} entry={entry as any} />
        );
      })}
    </StyledGameLog>
  );
};

const StyledGameLog = styled.ul`
  padding-right: 5px;
  overflow-y: scroll;
  scroll-behavior: smooth;
  > li {
    border: 1px solid #eeeeee;
    .speaker {
      font-weight: bold;
    }
    .speaker-role {
      font-size: 80%;
      color: white;
      background: navy;
      border-radius: 10px;
      padding: 0 2px;
      margin-right: 5px;
    }
    &.talk,
    &.whisper {
      display: flex;
      align-items: top;
      .speaker {
        flex: 0 0 95px;
      }
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
      margin-top: 25px;
      padding: 5px;
      > .winner {
        font-size: 120%;
        font-weight: bold;
      }
      > .players {
        display: flex;
        flex-wrap: wrap;
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

export default GameLog;
