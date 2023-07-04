import { useState } from 'react';
import Switch from './Switch';
import { useApi } from './utils/useApi';
import useLang from './utils/useLang';
import { useLoginUser } from './utils/user';

const LangSwitch = () => {
  const lang = useLang();
  const loginUser = useLoginUser();
  const api = useApi();
  const [busy, setBusy] = useState(false);

  const handleChange = async (selection: 'left' | 'right') => {
    if (busy) return;
    if (loginUser.status !== 'loggedIn') return;
    setBusy(true);
    await api('setProfile', { lang: selection === 'right' ? 'ja' : 'en' });
    setBusy(false);
  };

  return (
    <Switch
      leftLabel="EN"
      rightLabel="JA"
      value={lang == 'ja' ? 'right' : 'left'}
      onChange={handleChange}
      disabled={busy}
    />
  );
};

export default LangSwitch;
