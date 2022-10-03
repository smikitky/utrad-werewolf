import * as db from 'firebase/database';
import { database } from './firebase.js';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type Updater<T> = {
  [P in keyof T]?: T[P] | null;
};

const useFirebaseSubscription = <T>(
  path: string | undefined
): {
  data: T | undefined;
  update: (updates: Updater<T>) => Promise<void>;
  error?: Error;
} => {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const fbRef = useMemo(() => (path ? db.ref(database, path) : null), [path]);

  useEffect(() => {
    if (!fbRef) {
      setData(undefined);
      setError(undefined);
      return;
    }
    const unsubscribe = db.onValue(
      fbRef,
      snapshot => setData(snapshot.val() as T),
      err => setError(err)
    );
    return unsubscribe;
  }, [fbRef]);

  const update = useCallback(
    (updates: Updater<T>) => {
      if (!fbRef) return Promise.reject('Null ref');
      return db.update(fbRef, updates);
    },
    [fbRef]
  );

  return { data, update, error };
};

export default useFirebaseSubscription;
