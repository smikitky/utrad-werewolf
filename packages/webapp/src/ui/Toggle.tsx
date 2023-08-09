import { FC, ReactNode, useLayoutEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const Toggle: FC<{
  choices: ReactNode[];
  value: number;
  onChange: (index: number) => void;
}> = props => {
  const { choices, value, onChange } = props;
  const [border, setBorder] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0
  });
  const divRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // Move border to the selected button
    const div = divRef.current;
    if (div) {
      const selected = div.children[value] as HTMLButtonElement;
      const left = selected.offsetLeft;
      const width = selected.offsetWidth;
      setBorder({ left, width });
    }
  }, [value, choices]);

  const handleKeydown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      const newValue =
        e.key === 'ArrowLeft'
          ? (value + choices.length - 1) % choices.length
          : (value + 1) % choices.length;
      onChange(newValue);
      (divRef.current!.children[newValue] as HTMLButtonElement).focus();
    }
  };

  return (
    <StyledDiv ref={divRef}>
      {choices.map((choice, index) => (
        <button
          key={index}
          className={index === value ? 'selected' : ''}
          onClick={() => onChange(index)}
          tabIndex={index === value ? 0 : -1}
          onKeyDown={handleKeydown}
        >
          {choice}
        </button>
      ))}
      <div
        className="bottom_border"
        style={{ left: border.left + 'px', width: border.width + 'px' }}
      />
    </StyledDiv>
  );
};

export default Toggle;

const StyledDiv = styled.div`
  display: flex;
  flex-flow: row nowrap;
  position: relative;
  button {
    transition: background-color 0.2s linear;
    border: none;
    background: #eeeeee;
    padding: 5px 8px;
    cursor: pointer;
    &.selected {
      background: #ddddff;
    }
  }
  .bottom_border {
    position: absolute;
    bottom: 0;
    height: 2px;
    background: navy;
    transition: left 0.2s ease-in-out, right 0.2s ease-in-out;
  }
`;
