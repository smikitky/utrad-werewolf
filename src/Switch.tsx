import { KeyboardEventHandler, ReactNode, FC } from 'react';
import classnames from 'classnames';
import styled from 'styled-components';
import classNames from 'classnames';

export type SwitchStatus = 'left' | 'right';

const Switch: FC<{
  leftLabel: ReactNode;
  rightLabel: ReactNode;
  value: SwitchStatus;
  onChange: (value: SwitchStatus) => void;
  disabled?: boolean;
}> = props => {
  const { leftLabel, rightLabel, value, onChange, disabled } = props;

  const handleClick = () => {
    if (disabled) return;
    onChange(value === 'left' ? 'right' : 'left');
  };

  const handleKeyDown: KeyboardEventHandler = ev => {
    switch (ev.key) {
      case 'ArrowRight':
        onChange('right');
        break;
      case 'ArrowLeft':
        onChange('left');
        break;
      case ' ':
        onChange(value === 'left' ? 'right' : 'left');
        break;
    }
  };

  return (
    <StyledSpan className={classNames({ disabled })}>
      {leftLabel}
      <span className="track" onClick={handleClick}>
        <span
          className={classnames('thumb', value === 'left' ? 'left' : 'right')}
          tabIndex={0}
          onKeyDown={handleKeyDown}
        />
      </span>
      {rightLabel}
    </StyledSpan>
  );
};

const StyledSpan = styled.span`
  display: inline-flex;
  gap: 3px;
  align-items: center;

  &.disabled {
    opacity: 0.5;
  }

  > .track {
    display: inline-block;
    cursor: pointer;
    position: relative;
    height: 20px;
    width: 35px;
    background: #999999;
    border-radius: 15px;
    &:hover {
      background: #aaaaaa;
    }

    > .thumb {
      position: absolute;
      left: 3px;
      top: 3px;
      bottom: 3px;
      width: 17px;
      background: #eeeeee;
      border-radius: 7px;
      transition: left 0.1s;
      box-shadow: 2px 2px 3px gray;
      &.right {
        left: 14px;
      }
      &:hover {
        background: white;
      }
    }
  }
`;

export default Switch;
