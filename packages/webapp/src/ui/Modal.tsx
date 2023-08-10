import React, { EventHandler, ReactNode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import styled from 'styled-components';

type Dialog<T> = React.FC<{
  onReturn: (value: T) => void;
}>;

const Modal = <T extends any>(props: {
  open: boolean;
  content: Dialog<T>;
  onReturn: (value: T | null) => void;
}): ReactNode => {
  const { open, onReturn, content: Content } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current!;
    if (open) {
      dialog.showModal();
      return () => dialog.close();
    } else {
      dialog.close();
    }
  }, [open]);

  const handleCancel: EventHandler<any> = ev => {
    onReturn(null);
    ev.preventDefault();
  };

  return (
    <StyledDialog className="dialog" ref={dialogRef} onCancel={handleCancel}>
      <Content onReturn={onReturn} />
    </StyledDialog>
  );
};

const StyledDialog = styled.dialog`
  border: 1px solid gray;
  border-radius: 5px;
  box-shadow: 0 0 100px black;
  &::backdrop {
    background-color: #00000080;
  }
`;

export default Modal;

const createChoiceDialog = (
  children: ReactNode,
  choices: [label: string, key: string][]
): Dialog<string> => {
  return ({ onReturn }) => {
    return (
      <StyledChoiceDiv>
        <div className="prompt">{children}</div>
        <div className="choices">
          {choices.map(c => (
            <button key={c[1]} onClick={() => onReturn(c[1])}>
              {c[0]}
            </button>
          ))}
        </div>
      </StyledChoiceDiv>
    );
  };
};

const StyledChoiceDiv = styled.div`
  .prompt {
    margin-bottom: 10px;
  }
  .choices {
    display: flex;
    justify-content: flex-end;
    gap: 5px;
  }
`;

export const showDialog = <T extends any>(
  content: Dialog<T>
): Promise<T | null> => {
  return new Promise(resolve => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);

    const handleReturn = (value: T | null) => {
      root.unmount();
      div.remove();
      resolve(value);
    };

    root.render(
      <Modal<T> open={true} content={content} onReturn={handleReturn} />
    );
  });
};

const showChoiceDialog = (
  message: ReactNode,
  choices: [string, string][]
): Promise<string | null> => {
  return showDialog(createChoiceDialog(message, choices));
};

export const alert = async (message: ReactNode): Promise<void> => {
  await showChoiceDialog(message, [['OK', 'ok']]);
};

export const confirm = async (message: ReactNode): Promise<boolean> => {
  const res = await showChoiceDialog(message, [
    ['Cancel', 'cancel'],
    ['OK', 'ok']
  ]);
  return res === 'ok';
};
