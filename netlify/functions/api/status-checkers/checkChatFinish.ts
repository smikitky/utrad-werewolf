import { extractLogOfPeriod } from '../../../../src/game-utils';
import StatusChecker from './StatusChecker';

const checkChatFinish: StatusChecker = game => {
  const { day, period, votePhase } = game.status;
  if (votePhase !== 'chat') return null;
  // The chat phase ends when either of the following conditions is met:
  // 1) There is only one voter in a night period (no need to discuss)
  // 2) All voters finished their talk/whisper by indicating 'over'
  const alivePeople = game.agents.filter(a => a.life === 'alive');
  const werewolves = alivePeople.filter(a => a.role === 'werewolf');
  const voters = period === 'day' ? alivePeople : werewolves;
  const periodLog = extractLogOfPeriod(game);
  const chatPhaseFinished =
    (period === 'night' && voters.length === 1) ||
    voters.every(c =>
      periodLog.some(l => l.type === 'over' && l.agent === c.agentId)
    );
  if (chatPhaseFinished) {
    if (day === 0) {
      // The first night is special; the werewolves don't vote.
      return { event: 'voteSettle', nextStatus: { votePhase: 'settled' } };
    } else {
      return { event: 'voteStart', nextStatus: { votePhase: 1 } };
    }
  }
  return null;
};

export default checkChatFinish;
