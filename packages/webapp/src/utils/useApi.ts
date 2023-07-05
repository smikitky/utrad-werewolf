import { createContext, useContext } from 'react';

export type ApiCaller = (
  type: string,
  payload: any,
  options?: {
    asUser?: string;
    noError?: boolean;
  }
) => Promise<{ ok: boolean; status: number; data: any }>;

export const ApiContext = createContext<ApiCaller>(null as any);

export const useApi = (): ApiCaller => {
  return useContext(ApiContext);
};
