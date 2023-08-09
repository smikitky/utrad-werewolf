import { FC, ReactNode } from 'react';
import styled from 'styled-components';
import Icon from '@/ui/Icon';

const Alert: FC<{
  children: ReactNode;
  variation?: 'info';
}> = props => {
  const { children, variation } = props;
  const icon = variation === 'info' ? 'info' : 'dangerous';
  return (
    <StyledDiv className={variation}>
      <Icon icon={icon} />
      {children}
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  background-color: #ffe0e0;
  border: 1px solid #f09090;
  border-radius: 7px;
  color: red;
  padding: 8px;
  margin: 1em 0.3em;
  display: flex;
  align-items: center;
  gap: 8px;
  &.info {
    background-color: #e0e0ff;
    border: 1px solid #9090f0;
    color: blue;
  }
`;

export default Alert;
