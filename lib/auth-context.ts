import { AsyncLocalStorage } from "node:async_hooks";

export type ApiUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  company: string;
};

export const apiUserContext = new AsyncLocalStorage<ApiUser>();
