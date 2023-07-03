import { ReactNode, FC } from 'react';
import useLang, { Lang } from './utils/useLang';

export type LangResource<T extends string> = {
  [id in T]: {
    [lang in Lang]: ReactNode;
  };
};

export const makeLangResource = <T extends string>(
  resource: LangResource<T>
) => {
  const LangResource: FC<{ id: T }> = ({ id }) => {
    const lang = useLang();
    return <>{resource[id][lang]}</>;
  };
  return LangResource;
};

export const BasicLangResource = makeLangResource({
  close: { en: 'Close', ja: '閉じる' },
  yes: { en: 'Yes', ja: 'はい' },
  no: { en: 'No', ja: 'いいえ' },
  ok: { en: 'OK', ja: 'OK' },
  cancel: { en: 'Cancel', ja: 'キャンセル' },
  home: { en: 'Home', ja: 'ホーム' },
  logout: { en: 'Log Out', ja: 'ログアウト' }
});
