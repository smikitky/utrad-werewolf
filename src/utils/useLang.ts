import { createContext, useContext } from 'react';

export type Lang = 'ja' | 'en';
export const LangContext = createContext<Lang>('ja');
export const SetLangContext = createContext<(lang: Lang) => void>(() => {});

const useLang = () => {
  return useContext(LangContext);
};

export default useLang;

export const useSetLang = () => {
  return useContext(SetLangContext);
}
