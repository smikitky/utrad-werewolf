import classNames from 'classnames';
import { FC, MouseEventHandler } from 'react';
import styled from 'styled-components';
import RoleDisplay from '../RoleDisplay.js';
import { AgentInfo } from '../game-data.js';

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
        {revealRole && (
          <div>
            <RoleDisplay role={agent.role} />
          </div>
        )}
      </div>
    </StyledPlayerDiv>
  );
};

const StyledPlayerDiv = styled.div`
  width: 110px;
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
    padding: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    font-size: 80%;
    line-height: 17px;
    text-align: center;
  }
`;

export default Player;
