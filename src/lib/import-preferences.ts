import { parseStoredPreferences, type JournalPreferences } from './preferences.ts';

const NO_SETUP_LABEL = 'Senza Setup';
const CUSTOM_EMOTION_PREFIX = 'custom:';

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

/** Emotions written by the user (not presets) that the trades of an exported journal use. */
export function collectImportedEmotions(json: string): string[] {
  try {
    const data = JSON.parse(json) as { trades?: unknown } | null;
    const trades = Array.isArray(data?.trades) ? data.trades : [];
    const values = trades.flatMap(item => {
      const emotions = (item as Record<string, unknown> | null)?.emotions;

      return Array.isArray(emotions)
        ? emotions.filter(
            (value): value is string =>
              typeof value === 'string' && value.startsWith(CUSTOM_EMOTION_PREFIX)
          )
        : [];
    });

    return Array.from(new Set(values));
  } catch {
    return [];
  }
}

/** The emotion lists of the preferences, extended with the custom emotions the file uses. */
const withImportedEmotions = (
  emotions: JournalPreferences['emotions'],
  json: string
): { value: JournalPreferences['emotions']; added: string[] } => {
  const current = emotions ?? { hidden: [], custom: [], colors: {} };
  const added = collectImportedEmotions(json).filter(value => !current.custom.includes(value));

  return added.length
    ? { value: { ...current, custom: [...current.custom, ...added] }, added }
    : { value: emotions, added };
};

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

/** Profile and preferences embedded in an exported journal file, if any. */
export function extractImportedPreferences(json: string): JournalPreferences | null {
  try {
    const data = JSON.parse(json) as { preferences?: unknown } | null;

    return data?.preferences
      ? parseStoredPreferences(JSON.stringify(data.preferences))
      : null;
  } catch {
    return null;
  }
}

export interface PreferencesImportPlan {
  /** Fields to write into the user's preferences. */
  patch: Partial<JournalPreferences>;
  /** True when the whole profile is restored (new device), not just extended. */
  restored: boolean;
  addedAssets: string[];
  addedSetups: string[];
  /** Custom emotions of the imported trades added to the preferences. */
  addedEmotions?: string[];
}

/**
 * Empty journal + preferences in the file: restore the profile as on a new
 * device. Otherwise keep the user's own profile and only add the assets and
 * setups that the imported trades use and the user does not have yet.
 */
export function planPreferencesImport(
  current: JournalPreferences,
  json: string,
  journalIsEmpty: boolean
): PreferencesImportPlan {
  const imported = extractImportedPreferences(json);

  if (journalIsEmpty && imported) {
    const emotions = withImportedEmotions(imported.emotions ?? current.emotions, json);

    return {
      patch: {
        name: imported.name,
        photo: imported.photo,
        assets: imported.assets,
        setups: imported.setups,
        windows: imported.windows,
        ...(emotions.value ? { emotions: emotions.value } : {}),
      },
      restored: true,
      addedAssets: [],
      addedSetups: [],
      addedEmotions: emotions.added,
    };
  }

  const missing = getMissingChoices(current, collectImportedChoices(json));
  const emotions = withImportedEmotions(current.emotions, json);
  const hasChoices = missing.assets.length > 0 || missing.setups.length > 0;

  return {
    patch: {
      ...(hasChoices
        ? {
            assets: [...current.assets, ...missing.assets],
            setups: [...current.setups, ...missing.setups],
          }
        : {}),
      ...(emotions.added.length > 0 && emotions.value ? { emotions: emotions.value } : {}),
    },
    restored: false,
    addedAssets: missing.assets,
    addedSetups: missing.setups,
    addedEmotions: emotions.added,
  };
}

/** Preferences extended with every asset/setup the imported trades use. */
export function withImportedChoices(
  preferences: JournalPreferences,
  json: string
): JournalPreferences {
  const missing = getMissingChoices(preferences, collectImportedChoices(json));

  const emotions = withImportedEmotions(preferences.emotions, json);

  return {
    ...preferences,
    assets: [...preferences.assets, ...missing.assets],
    setups: [...preferences.setups, ...missing.setups],
    ...(emotions.value ? { emotions: emotions.value } : {}),
  };
}
