import { Lang } from '../game-utils';
import { useLoginUser } from './user';

const useLang = (): Lang => {
  const user = useLoginUser()!;
  if (user.status === 'loggedIn' && user.data.lang === 'ja') return 'ja';
  return 'en';
};

export default useLang;
