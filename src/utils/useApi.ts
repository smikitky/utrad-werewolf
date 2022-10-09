import { createContext, useContext } from 'react';

export type ApiCaller = (
  type: string,
  payload: any,
  asUser?: string
) => Promise<Response>;

export const ApiContext = createContext<ApiCaller>(null as any);

export const useApi = (): ApiCaller => {
  return useContext(ApiContext);
};
