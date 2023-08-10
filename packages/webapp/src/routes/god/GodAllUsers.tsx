import { AgentCount, UserEntry, defaultAgentCount } from '@/game-data';
import AgentCountEditor from '@/ui/AgentCountEditor';
import { BasicLangResource, makeLangResource } from '@/ui/LangResource';
import Modal from '@/ui/Modal';
import UserList, { UserListCommand } from '@/ui/UserList';
import { database } from '@/utils/firebase.js';
import { useApi } from '@/utils/useApi';
import * as db from 'firebase/database';
import { FC, useState } from 'react';
import styled from 'styled-components';

const LangResource = makeLangResource({
  allUsers: { en: 'All Users', ja: '全ユーザー' }
});

const GodAllUsers: FC = () => {
  const api = useApi();
  const [match, setMatch] = useState<{
    showModal: boolean;
    leader?: string;
    agentCount?: AgentCount;
  }>({ showModal: false, agentCount: defaultAgentCount });

  const handleUserCommand = async (
    uid: string,
    user: UserEntry,
    command: UserListCommand
  ) => {
    switch (command) {
      case 'matchNewGame': {
        setMatch({
          showModal: true,
          leader: uid,
          agentCount: defaultAgentCount
        });
        break;
      }
      case 'toggleReady': {
        const ref = db.ref(database, `users/${uid}/ready`);
        await db.set(ref, !user.ready);
        break;
      }
      case 'toggleOnline': {
        const ref = db.ref(database, `users/${uid}/onlineStatus`);
        await db.set(ref, !user.onlineStatus);
        break;
      }
      case 'toggleGod':
        await api('setProfile', {
          target: uid,
          updates: { canBeGod: !user.canBeGod }
        });
        break;
    }
  };

  const handleMatchDialogStart = async () => {
    await api('matchNewGame', {
      leader: match.leader,
      agentCount: match.agentCount
    });
    setMatch({ showModal: false });
  };

  return (
    <>
      <h2>
        <LangResource id="allUsers" />
      </h2>
      <UserList
        onUserCommand={handleUserCommand}
        onlineOnly={false}
        showAdminMenu={true}
      />
      {match.showModal && (
        <Modal open onCancel={() => setMatch({ showModal: false })}>
          <StyledDialogDiv>
            <h2>Match New Game</h2>
            <AgentCountEditor
              value={match.agentCount!}
              onChange={agentCount => setMatch({ ...match, agentCount })}
            />
            <nav>
              <button onClick={() => setMatch({ showModal: false })}>
                <BasicLangResource id="cancel" />
              </button>
              <button onClick={handleMatchDialogStart}>
                <BasicLangResource id="start" />
              </button>
            </nav>
          </StyledDialogDiv>
        </Modal>
      )}
    </>
  );
};

const StyledDialogDiv = styled.div`
  nav {
    margin-top: 10px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
`;

export default GodAllUsers;
