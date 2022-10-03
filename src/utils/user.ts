import { createContext, useContext } from 'react';
import { UserEntry } from '../game-data.js';

export type LoginType = 'anonymous' | 'google';

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

export interface LoginManager {
  login: (method: LoginType) => Promise<void>;
  link: () => Promise<void>;
  logout: () => Promise<void>;
}

export const LoginUserContext = createContext<LoginUser>({
  status: 'indeterminate'
});

export const LoginManagerContext = createContext<LoginManager>({} as any);

export const useLoginUser = () => useContext(LoginUserContext);

export const useLoginManager = () => useContext(LoginManagerContext);
