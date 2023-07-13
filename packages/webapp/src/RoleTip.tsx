import { FC } from 'react';
import { AgentRole } from './game-data';
import useLang from './utils/useLang';
import { roleTextMap } from './game-utils';
import styled from 'styled-components';

const RoleTip: FC<{ role: AgentRole; className?: string }> = props => {
  const { role, className } = props;
  const lang = useLang();
  const text =
    lang === 'en'
      ? props.role.charAt(0).toUpperCase()
      : role === 'werewolf'
      ? '狼'
      : roleTextMap.ja[props.role].charAt(0);
  return (
    <StyledSpan className={className} title={role}>
      {text}
    </StyledSpan>
  );
};

const StyledSpan = styled.span`
  display: inline-block;
  text-align: center;
  vertical-align: middle;
  font-size: 12px;
  line-height: 18px;
  color: white;
  background: #000050;
  border-radius: 10px;
  padding: 0 2px;
  min-width: 18px;
`;

export default RoleTip;
