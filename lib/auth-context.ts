import { AsyncLocalStorage } from "node:async_hooks";

export type ApiUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  company: string;
  locale?: string;
  workspaceId?: number | null;
  allowedModules?: string[];
};

export const apiUserContext = new AsyncLocalStorage<ApiUser>();
