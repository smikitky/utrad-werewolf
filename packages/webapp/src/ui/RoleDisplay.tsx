import { AgentRole, Team } from '@/game-data';
import { roleTextMap, teamTextMap } from '@/game-utils';
import useLang from '@/utils/useLang';
import { FC } from 'react';

const RoleDisplay: FC<{ role: AgentRole }> = props => {
  const { role } = props;
  const lang = useLang();
  return <>{roleTextMap[lang][role]}</>;
};

export default RoleDisplay;

export const TeamDisplay: FC<{ team: Team }> = props => {
  const { team } = props;
  const lang = useLang();
  return <>{teamTextMap[lang][team]}</>;
};
