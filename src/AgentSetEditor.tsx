import classNames from 'classnames';
import { FC } from 'react';
import styled from 'styled-components';
import { AgentRole, agentRoles } from './game-data';

type Counts = Record<AgentRole, number>;

const totalCount = (counts: Counts) =>
  Object.values(counts).reduce((a, b) => a + b, 0);

const AgentSetEditor: FC<{
  value: Counts;
  onChange: (value: Counts) => void;
}> = props => {
  const { value, onChange } = props;
  const max = 15;

  const handleIncrease = (role: AgentRole) => {
    if (totalCount(value) < max) {
      onChange({ ...value, [role]: value[role] + 1 });
    }
  };

  const handleDecrease = (role: AgentRole) => {
    if (value[role] > 0) {
      onChange({ ...value, [role]: value[role] - 1 });
    }
  };

  return (
    <StyledDiv>
      {agentRoles.map(role => (
        <div key={role} className={classNames('cell', role)}>
          <div className="role">{role}</div>
          <div className="count">{value[role]}</div>
          <button onClick={() => handleIncrease(role)}>+1</button>
          <button onClick={() => handleDecrease(role)}>-1</button>
        </div>
      ))}
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  display: flex;
  flex-direction: column;
`;

export default AgentSetEditor;
