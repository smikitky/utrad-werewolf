import { UserEntry } from '@/game-data';
import { makeLangResource } from '@/ui/LangResource';
import UserList, { UserListCommand } from '@/ui/UserList';
import { database } from '@/utils/firebase.js';
import { useApi } from '@/utils/useApi';
import * as db from 'firebase/database';
import { FC } from 'react';

const LangResource = makeLangResource({
  allUsers: { en: 'All Users', ja: '全ユーザー' }
});

const GodAllUsers: FC = () => {
  const api = useApi();

  const handleUserCommand = async (
    uid: string,
    user: UserEntry,
    command: UserListCommand
  ) => {
    switch (command) {
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
    </>
  );
};

export default GodAllUsers;
