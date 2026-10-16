import { createContext, useContext } from 'react';
import type { PropAccount } from '@/lib/propfirm/types';

const PropAccountsContext = createContext<PropAccount[]>([]);

export const PropAccountsProvider = PropAccountsContext.Provider;

export const usePropAccountList = () => useContext(PropAccountsContext);
