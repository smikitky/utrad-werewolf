import { createContext, useContext } from 'react';
import { Lang } from '../game-utils';

export const LangContext = createContext<Lang>('ja');
export const SetLangContext = createContext<(lang: Lang) => void>(() => {});

const useLang = () => {
  return useContext(LangContext);
};

export default useLang;

export const useSetLang = () => {
  return useContext(SetLangContext);
}
