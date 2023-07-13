import { FC } from 'react';
import { AgentRole } from './game-data';
import useLang from './utils/useLang';
import { roleTextMap } from './game-utils';
import styled from 'styled-components';

const RoleTip: FC<{ role: AgentRole }> = props => {
  const { role } = props;
  const lang = useLang();
  const text =
    lang === 'en'
      ? props.role.charAt(0).toUpperCase()
      : role === 'werewolf'
      ? '狼'
      : roleTextMap.ja[props.role].charAt(0);
  return <StyledSpan title={role}>{text}</StyledSpan>;
};

const StyledSpan = styled.span`
  display: inline-block;
  text-align: center;
  font-size: 80%;
  color: white;
  background: #000050;
  border-radius: 10px;
  padding: 0 2px;
  margin-right: 5px;
  min-width: 20px;
`;

export default RoleTip;
