import { ReactNode, FC } from 'react';
import useLang from './utils/useLang';
import { Lang } from './game-utils';

export type LangResource<T extends string> = {
  [id in T]: {
    [lang in Lang]: ReactNode | FC<any>;
  };
};

export const makeLangResource = <T extends string>(
  resource: LangResource<T>
) => {
  const LangResource: FC<{ id: T; [rest: string]: any }> = props => {
    const { id, ...rest } = props;
    const lang = useLang();
    const Target = resource[id][lang];
    if (typeof Target === 'function') return <Target {...rest} />;
    return <>{Target}</>;
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
  logout: { en: 'Log Out', ja: 'ログアウト' },
  profile: { en: 'Profile', ja: 'プロフィール' },
  online: { en: 'Online', ja: 'オンライン' },
  offline: { en: 'Offline', ja: 'オフライン' },
  godMode: { en: 'God Mode', ja: 'ゴッドモード' },
  alive: { en: 'alive', ja: '生存' },
  dead: { en: 'dead', ja: '死亡' },
  gameDataNotFound: {
    en: 'This game data does not exist.',
    ja: '該当ゲームデータは存在しません'
  },
  en: { en: 'English', ja: '英語' },
  ja: { en: 'Japanese', ja: '日本語' }
});
