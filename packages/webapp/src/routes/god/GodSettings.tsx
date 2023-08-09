import Icon from '@/ui/Icon';
import { makeLangResource } from '@/ui/LangResource';
import { useMessageAdder } from '@/ui/Messages';
import { useApi } from '@/utils/useApi';
import { FC, useState } from 'react';

const LangResource = makeLangResource({
  addNpcAccount: { en: 'Add NPC Account', ja: 'NPCアカウントを追加' },
  npcDesc: {
    en: 'NPC accounts are controlled in God mode or by API.',
    ja: 'NPC アカウントは、ゴッドモードか API で操作します。'
  },
  userAdded: {
    en: ({ name }) => (
      <>
        New NPC user <b>"{name}"</b> added.
      </>
    ),
    ja: ({ name }) => (
      <>
        NPC ユーザ <b>"{name}"</b> を追加しました。
      </>
    )
  }
});

const GodSettings: FC = () => {
  const api = useApi();
  const [newUid, setNewUid] = useState('');
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const addMessage = useMessageAdder();

  const addUserClick = async () => {
    if (!newUid || !newName) return;
    setBusy(true);
    const { ok } = await api('addUser', { newUid, name: newName });
    setBusy(false);
    if (ok) {
      addMessage('info', <LangResource id="userAdded" name={newName} />);
      setNewUid('');
      setNewName('');
    }
  };

  return (
    <>
      <h2>
        <LangResource id="addNpcAccount" />
      </h2>
      <p>
        <LangResource id="npcDesc" />
      </p>
      <div>
        <input
          type="text"
          placeholder="UID"
          value={newUid}
          onChange={e => setNewUid(e.target.value)}
        />
        <input
          type="text"
          placeholder="user name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <button onClick={addUserClick} disabled={!newUid || !newName || busy}>
          <Icon icon="smart_toy" /> Add
        </button>
      </div>
    </>
  );
};

export default GodSettings;
