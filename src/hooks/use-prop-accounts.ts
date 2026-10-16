import { useCallback, useEffect, useState } from 'react';
import { generateId } from '@/lib/calculations';
import type { Payout, PropAccount } from '@/lib/propfirm/types';

export const PROP_ACCOUNTS_STORAGE_KEY = 'eclipse-trading-journal-propfirm';

const isAccount = (value: unknown): value is PropAccount =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as PropAccount).id === 'string' &&
  typeof (value as PropAccount).size === 'number' &&
  typeof (value as PropAccount).rules === 'object';

export function readPropAccounts(): PropAccount[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROP_ACCOUNTS_STORAGE_KEY) ?? '[]') as unknown;

    return Array.isArray(parsed)
      ? parsed.filter(isAccount).map(account => ({
          ...account,
          balanceUpdates: Array.isArray(account.balanceUpdates) ? account.balanceUpdates : [],
          payouts: Array.isArray(account.payouts) ? account.payouts : [],
        }))
      : [];
  } catch {
    return [];
  }
}

export function usePropAccounts() {
  const [accounts, setAccounts] = useState<PropAccount[]>(readPropAccounts);

  useEffect(() => {
    try {
      localStorage.setItem(PROP_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch {
      // Storage full or unavailable: the accounts stay in memory only.
    }
  }, [accounts]);

  const addAccount = useCallback(
    (account: Omit<PropAccount, 'id' | 'createdAt' | 'payouts' | 'balanceUpdates'>) => {
      const created: PropAccount = {
        ...account,
        id: generateId(),
        createdAt: new Date().toISOString(),
        payouts: [],
        balanceUpdates: [],
      };

      setAccounts(current => [...current, created]);

      return created;
    },
    []
  );

  const updateAccount = useCallback((id: string, patch: Partial<PropAccount>) => {
    setAccounts(current => current.map(item => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts(current => current.filter(item => item.id !== id));
  }, []);

  const addPayout = useCallback((id: string, payout: Omit<Payout, 'id'>) => {
    setAccounts(current =>
      current.map(item =>
        item.id === id
          ? { ...item, payouts: [...item.payouts, { ...payout, id: generateId() }] }
          : item
      )
    );
  }, []);

  const removePayout = useCallback((id: string, payoutId: string) => {
    setAccounts(current =>
      current.map(item =>
        item.id === id
          ? { ...item, payouts: item.payouts.filter(payout => payout.id !== payoutId) }
          : item
      )
    );
  }, []);

  /** Imports accounts from a backup, skipping ids that already exist. */
  const importAccounts = useCallback((incoming: PropAccount[]) => {
    setAccounts(current => {
      const ids = new Set(current.map(item => item.id));

      return [...current, ...incoming.filter(item => !ids.has(item.id))];
    });
  }, []);

  return {
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    addPayout,
    removePayout,
    importAccounts,
  };
}
