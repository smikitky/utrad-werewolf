import classNames from 'classnames';
import { FC, ReactElement, ReactNode, useEffect, useMemo, useRef } from 'react';
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
  GamePeriod,
  GameStatus,
  GuardLogEntry,
  KillLogEntry,
  LogEntry,
  LogType,
  MediumResultLogEntry,
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
  noVote: { en: 'No Vote', ja: '投票なし' },
  expel: { en: 'Expel', ja: '追放' },
  attack: { en: 'Attack', ja: '襲撃' },
  voteResult: { en: ' Vote Result', ja: '投票結果' },
  you: { en: 'You', ja: 'あなた' },
  over: { en: '(over)', ja: '(発話終了)' },
  voted: { en: '(voted)', ja: '(投票終了)' },
  speakerRole: {
    en: (props: { role: AgentRole }) => (
      <>{props.role.charAt(0).toUpperCase()}</>
    ),
    ja: (props: { role: AgentRole }) => (
      <>
        {props.role === 'werewolf'
          ? '狼'
          : roleTextMap.ja[props.role].charAt(0)}
      </>
    )
  },
  prologueMessage: {
    en: (props: { counts: [AgentRole, number][] }) => {
      const { counts } = props;
      const plural = (role: AgentRole, count: number) =>
        role === 'werewolf' && count > 1
          ? 'Werewolves'
          : count === 1
          ? roleTextMap.en[role]
          : `${roleTextMap.en[role]}s`;
      const countsText = counts.map(
        ([role, count], i) =>
          `${count} ${plural(role, count)}${
            i === counts.length - 2
              ? ' and '
              : i === counts.length - 1
              ? ''
              : ', '
          }`
      );
      return (
        <>
          There are <strong>{countsText}</strong> in this village.
          <br />
          The villagers started to discuss how to deal with the{' '}
          {counts.some(([role, count]) => role === 'werewolf' && count > 1)
            ? 'werewolves'
            : 'werewolf'}
          .
          <br />
          There will be no vote or attack today.
        </>
      );
    },
    ja: (props: { counts: [AgentRole, number][] }) => {
      const { counts } = props;
      const countsText = counts
        .map(([role, count]) => `${count} 人の${roleTextMap.ja[role]}`)
        .join('、');
      return (
        <>
          この村には <strong>{countsText}</strong> がいるらしい。
          <br />
          村人による人狼対策会議が始まった。
          <br />
          今日は、追放の投票および襲撃は行われない。
        </>
      );
    }
  },
  periodStartLog: {
    en: (props: { day: number; period: GamePeriod; totalAlive: number }) => (
      <>
        The {props.period === 'day' ? 'daytime' : 'night'} of Day {props.day}{' '}
        has started. There are {props.totalAlive} players alive.
      </>
    ),
    ja: (props: { day: number; period: GamePeriod; totalAlive: number }) => (
      <>
        {props.day} 日目の{props.period === 'day' ? '昼' : '夜'}
        が始まった。現在 {props.totalAlive} 人生き残っている。
      </>
    )
  },
  divineLog: {
    en: (props: { agentName: string; targetName: string }) => (
      <>
        {props.agentName} divined the role of{' '}
        <strong>{props.targetName}</strong>. The result will be revealed
        tomorrow.
      </>
    ),
    ja: (props: { agentName: string; targetName: string }) => (
      <>
        {props.agentName} は <strong>{props.targetName}</strong>{' '}
        の正体を占った。結果は翌朝に分かるだろう。
      </>
    )
  },
  guardLog: {
    en: (props: { agentName: string; targetName: string }) => (
      <>
        {props.agentName} started to guard <strong>{props.targetName}</strong>{' '}
        from the attack of werewolves.
      </>
    ),
    ja: (props: { agentName: string; targetName: string }) => (
      <>
        {props.agentName} は <strong>{props.targetName}</strong>{' '}
        を人狼の襲撃から守るために護衛した。
      </>
    )
  },
  divineResultLog: {
    en: (props: {
      agentName: string;
      targetName: string;
      wasWerewolf: boolean;
    }) => (
      <>
        The divination by {props.agentName} revealed that{' '}
        <strong>{props.targetName}</strong> was{' '}
        <strong>{props.wasWerewolf ? 'a werewolf' : 'not a werewolf'}</strong>.
      </>
    ),
    ja: (props: {
      agentName: string;
      targetName: string;
      wasWerewolf: boolean;
    }) => (
      <>
        {props.agentName} の占いの結果、<b>{props.targetName}</b>は
        <strong>{props.wasWerewolf ? '人狼だった' : '人狼ではなかった'}</strong>
        。
      </>
    )
  },
  mediumResultLog: {
    en: (props: {
      agentName: string;
      targetName: string;
      wasWerewolf: boolean;
    }) => (
      <>
        The medium ability of {props.agentName} was activated.{' '}
        <strong>{props.targetName}</strong>, who has just been expeled, turned
        out to be{' '}
        <strong>{props.wasWerewolf ? 'a werewolf' : 'not a werewolf'}</strong>.
      </>
    ),
    ja: (props: {
      agentName: string;
      targetName: string;
      wasWerewolf: boolean;
    }) => (
      <>
        {props.agentName} の霊媒師としての能力が発動した。さきほど追放された{' '}
        {props.targetName} は
        <strong>{props.wasWerewolf ? '人狼だった' : '人狼ではなかった'}</strong>
        。
      </>
    )
  },
  guardResultLog: {
    en: (props: { agentName: string; targetName: string }) => (
      <>
        The guard by {props.agentName} saved <strong>{props.targetName}</strong>{' '}
        from the attack of werewolves.
      </>
    ),
    ja: (props: { agentName: string; targetName: string }) => (
      <>
        {props.agentName} の護衛により <strong>{props.targetName}</strong>{' '}
        は人狼の襲撃から守られた。
      </>
    )
  },
  voteStartLog: {
    en: (props: { period: GamePeriod }) => (
      <>
        The vote for who to{' '}
        {props.period === 'day' ? 'expel from this village' : 'attack'} has been
        started.
      </>
    ),
    ja: (props: { period: GamePeriod }) => (
      <>
        村の誰を{props.period === 'day' ? '追放' : '襲撃'}
        するかの投票が始まった。
      </>
    )
  },
  revoteStartLog: {
    en: (props: { period: GamePeriod; votePhase: number }) => (
      <>
        The {props.period === 'day' ? 'expel' : 'attack'} vote was not settled,
        so a re-vote has been started.
        <br />
        If the next vote is still inconclusive, the victim will be chosen at
        random from those who received most votes.
      </>
    ),
    ja: (props: { period: GamePeriod; votePhase: number }) => (
      <>
        {props.period === 'day' ? '追放' : '襲撃'}の投票は決着しなかったため、
        {props.votePhase} 回目の投票が始まった。
        <br />
        再投票は 1
        回のみで、次も決着が付かない場合は最多得票者からランダムで犠牲者が選ばれる。
      </>
    )
  },
  nobodyWasKilled: {
    en: 'Nobody was killed during the attack by the werewolves.',
    ja: '今回の人狼による襲撃では誰も死ななかった。'
  },
  wasExpelled: {
    en: 'was expelled by other village members.',
    ja: 'は村人達によって追放された。'
  },
  wasAttacked: {
    en: 'was attacked by a werewolf and lost their life.',
    ja: 'は人狼によって襲撃され命を落とした。'
  },
  villagersWon: {
    en: 'Villagers Team won!',
    ja: '村人陣営の勝利'
  },
  werewolvesWon: {
    en: 'Werewolves Team won!',
    ja: '人狼陣営の勝利'
  },
  werewolvesWonDetails: {
    en: (props: {
      survivingWerewolves: number;
      survivingVillagers: number;
    }) => (
      <>
        The number of surviving werewolves ({props.survivingWerewolves}) is
        greater than the number of villagers ({props.survivingVillagers}), so
        Werewolves Team won.
      </>
    ),
    ja: (props: {
      survivingWerewolves: number;
      survivingVillagers: number;
    }) => (
      <>
        生き残っている人狼の数（{props.survivingWerewolves}{' '}
        名）が村人陣営の人数（
        {props.survivingVillagers}{' '}
        名）以上となったため、人狼陣営の勝利となった。
      </>
    )
  },
  villagersWonDetails: {
    en: (props: { survivingVillagers: number }) => (
      <>
        All werewolves were expelled from this village!
        <br />
        {props.survivingVillagers} people from Villagers Team survived.
      </>
    ),
    ja: (props: { survivingVillagers: number }) => (
      <>
        この村からはすべての人狼が追放された。
        <br />
        村人陣営からは {props.survivingVillagers} 名の村人が生き残った。
      </>
    )
  },
  yourTeamResult: {
    en: (props: { children: ReactNode; won: boolean }) => (
      <>
        Your Team ({props.children}) {props.won ? 'won!' : 'lost.'}
      </>
    ),
    ja: (props: { children: ReactNode; won: boolean }) => (
      <>
        あなたが味方した陣営（{props.children}）の{props.won ? '勝利' : '敗北'}
        。
      </>
    )
  }
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
        {targetStatus.period === 'day' ? (
          <LangResource id="expel" />
        ) : (
          <LangResource id="attack" />
        )}
        <LangResource id="voteResult" />
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
        if (entry.day === 0) {
          return <LangResource id="prologueMessage" counts={counts} />;
        } else {
          const icon = entry.period === 'day' ? 'wb_twilight' : 'nightlight';
          return (
            <>
              <Icon icon={icon} />
              <LangResource
                id="periodStartLog"
                day={entry.day}
                period={entry.period}
                totalAlive={totalAlive}
              />
            </>
          );
        }
      }
      case 'voteStart': {
        if (
          entry.period === 'night' &&
          myAgent !== 'god' &&
          myAgent.role !== 'werewolf'
        )
          return null;
        if (entry.votePhase === 1)
          return <LangResource id="voteStartLog" period={entry.period} />;
        else {
          return (
            <>
              <VoteDetails
                game={game}
                targetStatus={entry}
                targetVotePhase={(entry.votePhase as number) - 1}
              />
              <hr />
              <LangResource
                id="revoteStartLog"
                period={entry.period}
                votePhase={entry.votePhase}
              />
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
          <span className="speaker-role" title={agent.role}>
            <LangResource id="speakerRole" role={agent.role} />
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
    myAgent === 'god' ? (
      game.agents.find(a => a.agentId === entry.agent)!.name
    ) : (
      <LangResource id="you" />
    );
  const target = game.agents.find(a => a.agentId === entry.target)!;
  return (
    <li className="ability">
      <LangResource
        id={entry.type === 'divine' ? 'divineLog' : 'guardLog'}
        agentName={agentName}
        targetName={target.name}
      />
    </li>
  );
};

const AbilityResultLogItem: LogItem<
  DivineResultLogEntry | MediumResultLogEntry
> = props => {
  const { game, myAgent, entry } = props;
  if (myAgent !== 'god' && myAgent.agentId !== entry.agent) return null;
  const agentName =
    myAgent === 'god' ? (
      game.agents.find(a => a.agentId === entry.agent)!.name
    ) : (
      <LangResource id="you" />
    );
  const target = game.agents.find(a => a.agentId === entry.target)!;
  return (
    <li className="ability">
      {entry.type === 'divineResult' ? (
        <LangResource
          id="divineResultLog"
          agentName={agentName}
          targetName={target.name}
          wasWerewolf={target.role === 'werewolf'}
        />
      ) : entry.type === 'mediumResult' ? (
        <LangResource
          id="mediumResultLog"
          agentName={agentName}
          targetName={target.name}
          wasWerewolf={target.role === 'werewolf'}
        />
      ) : (
        <LangResource
          id="guardResultLog"
          agentName={agentName}
          targetName={target.name}
        />
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
      <span className="speaker">{agent.name}</span> <LangResource id="over" />
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
      <span className="speaker">{agent.name}</span> <LangResource id="voted" />
      {(myAgent === 'god' || myAgent.agentId === entry.agent) && (
        <> To: {targetAgent.name}</>
      )}
    </li>
  );
};

const KillLogItem: LogItem<KillLogEntry> = props => {
  const { game, myAgent, entry } = props;
  const agent = game.agents.find(a => a.agentId === entry.target);
  const message =
    entry.target === 'NOBODY' ? (
      <LangResource id="nobodyWasKilled" />
    ) : entry.type === 'execute' ? (
      <>
        <Icon icon="new_releases" /> <strong>{agent!.name}</strong>{' '}
        <LangResource id="wasExpelled" />
      </>
    ) : (
      <>
        <Icon icon="new_releases" /> <strong>{agent!.name}</strong>{' '}
        <LangResource id="wasAttacked" />
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
  const text =
    winner === 'villagers' ? (
      <LangResource id="villagersWon" />
    ) : (
      <LangResource id="werewolvesWon" />
    );
  return (
    <li className="result">
      <div className="winner">{text}</div>
      <div className="details">
        {winner === 'werewolves' ? (
          <LangResource
            id="werewolvesWonDetails"
            survivingWerewolves={survivingWerewolves}
            survivingVillagers={survivingVillagers}
          />
        ) : (
          <LangResource
            id="villagersWonDetails"
            survivingVillagers={survivingVillagers}
          />
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
          <LangResource id="yourTeamResult" won={winner === team(myAgent.role)}>
            <TeamDisplay team={team(myAgent.role)} />
          </LangResource>
          {winner === team(myAgent.role) ? (
            <Icon icon="military_tech" />
          ) : (
            <Icon icon="mood_bad" />
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
          guardResult: AbilityResultLogItem,
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
      display: inline-block;
      text-align: center;
      font-size: 80%;
      color: white;
      background: #000050;
      border-radius: 10px;
      padding: 0 2px;
      margin-right: 5px;
      min-width: 20px;
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
