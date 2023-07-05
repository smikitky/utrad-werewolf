import { createContext } from 'react';
import { Lang } from '../game-utils';
import { useLoginUser } from './user';

export const LangContext = createContext<Lang>('ja');

const useLang = () => {
  const user = useLoginUser()!;
  if (user.status === 'loggedIn' && user.data.lang === 'ja') return 'ja';
  return 'en';
};

export default useLang;
