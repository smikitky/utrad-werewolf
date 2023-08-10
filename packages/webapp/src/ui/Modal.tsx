import { FC, ReactElement, ReactNode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import styled from 'styled-components';

const Modal = (props: {
  open: boolean;
  children: ReactNode;
  onCancel: () => void;
}): ReactElement => {
  const { open, children, onCancel } = props;
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

  return (
    <StyledDialog className="dialog" ref={dialogRef} onCancel={onCancel}>
      {children}
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

const ChoiceDialog: FC<{
  children: ReactNode;
  choices: [label: string, key: string][];
  onSelect: (key: string) => void;
}> = props => {
  const { children, choices, onSelect } = props;
  return (
    <StyledChoiceDiv>
      <div className="prompt">{children}</div>
      <div className="choices">
        {choices.map(c => (
          <button key={c[1]} onClick={() => onSelect(c[1])}>
            {c[0]}
          </button>
        ))}
      </div>
    </StyledChoiceDiv>
  );
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

type Dialog<T> = FC<{
  onReturn: (value: T) => void;
}>;

export const showDialog = <T extends any>(
  Content: Dialog<T>
): Promise<T | null> => {
  return new Promise(resolve => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);

    const handleReturn = (value: T) => {
      root.unmount();
      div.remove();
      resolve(value);
    };

    root.render(
      <Modal open={true} onCancel={() => resolve(null)}>
        <Content onReturn={handleReturn} />
      </Modal>
    );
  });
};

const showChoiceDialog = (
  message: ReactNode,
  choices: [string, string][]
): Promise<string | null> => {
  const choiceDialog: Dialog<string> = props => {
    const { onReturn } = props;
    return (
      <ChoiceDialog choices={choices} onSelect={onReturn}>
        {message}
      </ChoiceDialog>
    );
  };
  return showDialog(choiceDialog);
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
