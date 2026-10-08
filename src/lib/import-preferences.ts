import type { JournalPreferences } from './preferences.ts';

const NO_SETUP_LABEL = 'Senza Setup';

export interface ImportedChoices {
  assets: string[];
  setups: string[];
}

const unique = (values: string[]) => {
  const seen = new Set<string>();

  return values.filter(value => {
    const key = value.toLowerCase();

    if (seen.has(key)) return false;
    seen.add(key);

    return true;
  });
};

/** Assets and setups used by the trades of an exported journal file. */
export function collectImportedChoices(json: string): ImportedChoices {
  try {
    const data = JSON.parse(json) as { trades?: unknown } | null;
    const trades = Array.isArray(data?.trades) ? data.trades : [];
    const read = (key: 'pair' | 'strategy') =>
      trades.flatMap(item => {
        const value = (item as Record<string, unknown> | null)?.[key];

        return typeof value === 'string' && value.trim() ? [value.trim()] : [];
      });

    return {
      assets: unique(read('pair')),
      setups: unique(read('strategy').filter(value => value !== NO_SETUP_LABEL)),
    };
  } catch {
    return { assets: [], setups: [] };
  }
}

const missingFrom = (list: string[], candidates: string[]) =>
  candidates.filter(
    candidate => !list.some(item => item.toLowerCase() === candidate.toLowerCase())
  );

/** What the user is missing to see an imported journal correctly. */
export function getMissingChoices(
  preferences: Pick<JournalPreferences, 'assets' | 'setups'>,
  imported: ImportedChoices
): ImportedChoices {
  return {
    assets: missingFrom(preferences.assets, imported.assets),
    setups: missingFrom(preferences.setups, imported.setups),
  };
}
