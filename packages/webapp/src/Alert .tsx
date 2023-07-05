import { FC, ReactNode } from 'react';
import Icon from './Icon';
import styled from 'styled-components';

const Alert: FC<{ children: ReactNode }> = props => {
  const { children } = props;
  return (
    <StyledDiv>
      <Icon icon="dangerous" />
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
  margin: 1em;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export default Alert;
