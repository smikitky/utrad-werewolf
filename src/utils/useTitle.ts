import { useEffect } from 'react';

const useTitle = (title: string) => {
  useEffect(() => {
    document.title = title + ' - UTRAD Werewolf';
    return () => {
      document.title = 'UTRAD Werewolf';
    };
  }, [title]);
};

export default useTitle;
