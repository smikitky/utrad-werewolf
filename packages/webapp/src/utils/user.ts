import { createContext, useContext } from 'react';
import { UserEntry } from '../game-data.js';

export type LoginType = 'anonymous' | 'google' | 'emailLink';

export type LoggedInUser = {
  status: 'loggedIn';
  uid: string;
  loginType: LoginType;
  data: UserEntry;
  // update: (updates: Partial<UserProfile>) => Promise<void>;
};

export type LoginUser =
  | { status: 'indeterminate' } // user status pending
  | { status: 'loggedOut' }
  | LoggedInUser;

export const LoginUserContext = createContext<LoginUser>({
  status: 'indeterminate'
});

export const useLoginUser = () => useContext(LoginUserContext);
