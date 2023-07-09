import { FC, useState } from 'react';
import Switch from './Switch';
import { Lang } from './game-utils';
import { useApi } from './utils/useApi';
import useLang from './utils/useLang';
import { useLoginUser } from './utils/user';

const LangSwitch: FC<{
  value: Lang;
  onChange: (value: Lang) => void;
  disabled: boolean;
}> = props => {
  const { value, onChange, disabled } = props;

  const handleChange = async (selection: 'left' | 'right') => {
    onChange(selection === 'right' ? 'ja' : 'en');
  };

  return (
    <Switch
      leftLabel="EN"
      rightLabel="JA"
      value={value == 'ja' ? 'right' : 'left'}
      onChange={handleChange}
      disabled={disabled}
    />
  );
};

export default LangSwitch;

export const LoginUserLangSwitch: FC = () => {
  const lang = useLang();
  const loginUser = useLoginUser();
  const api = useApi();
  const [busy, setBusy] = useState(false);

  const handleChange = async (selection: Lang) => {
    if (busy) return;
    if (loginUser.status !== 'loggedIn') return;
    setBusy(true);
    await api('setProfile', { updates: { lang: selection } });
    setBusy(false);
  };

  return <LangSwitch value={lang} onChange={handleChange} disabled={busy} />;
};
