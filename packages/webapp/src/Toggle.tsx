import { FC, ReactNode, useLayoutEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const Toggle: FC<{
  choices: ReactNode[];
  value: number;
  onChange: (index: number) => void;
}> = props => {
  const { choices, value, onChange } = props;
  const [border, setBorder] = useState<{ left: number; right: number }>({
    left: 0,
    right: 0
  });
  const divRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // Move border to the selected button
    const div = divRef.current;
    if (div) {
      const selected = div.children[value] as HTMLButtonElement;
      const left = selected.offsetLeft;
      const right = div.offsetWidth - left - selected.offsetWidth;
      setBorder({ left, right });
    }
  }, [value, choices]);

  return (
    <StyledDiv ref={divRef}>
      {choices.map((choice, index) => (
        <button
          key={index}
          className={index === value ? 'selected' : ''}
          onClick={() => onChange(index)}
        >
          {choice}
        </button>
      ))}
      <div
        className="bottom_border"
        style={{ left: border.left, right: border.right }}
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
