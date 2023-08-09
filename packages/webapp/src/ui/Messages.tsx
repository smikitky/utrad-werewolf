import Icon from '@/ui/Icon';
import classNames from 'classnames';
import { FC, ReactNode, createContext, useCallback, useContext } from 'react';
import { styled } from 'styled-components';

export type MessageType = 'error' | 'info';

export type Message = { type: MessageType; content: ReactNode };

type MessageAction =
  | { type: 'add'; payload: { type: MessageType; content: ReactNode } }
  | { type: 'dismiss'; payload: { index: number } };

export const messagesReducer = (state: Message[], action: MessageAction) => {
  switch (action.type) {
    case 'add': {
      const { type, content } = action.payload;
      return [...state, { type, content }];
    }
    case 'dismiss':
      return state.filter((_, i) => i !== action.payload.index);
  }
};

export const MessagesContext = createContext<Message[]>([]);

export const MessagesDispatchContext = createContext<
  (action: MessageAction) => void
>(() => {});

export const useMessageAdder = () => {
  const dispatch = useContext(MessagesDispatchContext);
  const adder = useCallback((type: MessageType, content: ReactNode) => {
    dispatch({ type: 'add', payload: { type, content } });
  }, []);
  return adder;
};

export const Messages: FC = () => {
  const messages = useContext(MessagesContext);
  const dispatch = useContext(MessagesDispatchContext);

  const handleMessageDismiss = (index: number) => {
    dispatch({ type: 'dismiss', payload: { index } });
  };

  return (
    <StyledDiv>
      {messages.map((message, i) => (
        <div className={classNames('message', message.type)} key={i}>
          <button onClick={() => handleMessageDismiss(i)}>
            <Icon icon="close" />
          </button>
          <div className="message-content">{message.content}</div>
        </div>
      ))}
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 100;
  > .message {
    display: flex;
    gap: 5px;
    padding: 10px;
    max-width: 300px;
    border: 1px solid orange;
    margin-bottom: 10px;
    background: #ffaaaacc;
    &.info {
      border-color: blue;
      background: #aaaaffcc;
    }
    > button {
      border: none;
      background: none;
      &: hover {
        background: #00000033;
      }
    }
  }
`;
