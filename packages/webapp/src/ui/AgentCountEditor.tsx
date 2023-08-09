import { AgentCount, AgentRole, agentRoles } from '@/game-data';
import { agentTotalCount, isValidAgentCount } from '@/game-utils';
import RoleDisplay from '@/ui/RoleDisplay';
import classNames from 'classnames';
import { FC } from 'react';
import styled from 'styled-components';

const AgentCountEditor: FC<{
  value: AgentCount;
  onChange: (value: AgentCount) => void;
  disabled?: boolean;
}> = props => {
  const { value, onChange, disabled } = props;
  const max = 15;

  const handleIncrease = (role: AgentRole) => {
    if (agentTotalCount(value) < max) {
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
          <div className="role">
            <RoleDisplay role={role} />
          </div>
          <div className="count">{value[role]}</div>
          <div className="buttons">
            <button
              className="decrease"
              onClick={() => handleDecrease(role)}
              disabled={
                disabled ||
                !isValidAgentCount({ ...value, [role]: value[role] - 1 })
              }
            >
              -1
            </button>
            <button
              className="increase"
              onClick={() => handleIncrease(role)}
              disabled={
                disabled ||
                !isValidAgentCount({ ...value, [role]: value[role] + 1 })
              }
            >
              +1
            </button>
          </div>
        </div>
      ))}
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  display: flex;
  flex-flow: row wrap;
  gap: 5px;
  .cell {
    width: 90px;
    display: flex;
    flex-direction: column;
    background: #eeeeee;
    border: 1px solid silver;
    padding: 3px;
    > .role {
      text-align: center;
    }
    > .count {
      font-size: 150%;
      font-weight: bold;
      text-align: center;
    }
    > .buttons {
      display: flex;
      justify-content: space-between;
      > button {
        width: 50%;
      }
    }
  }
`;

export default AgentCountEditor;
