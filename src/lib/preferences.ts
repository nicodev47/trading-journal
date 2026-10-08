export interface OperatingWindowConfig {
  id: string;
  name: string;
  start: string;
  end: string;
}

export interface JournalPreferences {
  onboardingCompleted: boolean;
  name: string;
  photo: string | null;
  assets: string[];
  setups: string[];
  windows: OperatingWindowConfig[];
}

export const PREFERENCES_STORAGE_KEY = 'eclipse-trading-journal-preferences';

export const LEGACY_WINDOWS: OperatingWindowConfig[] = [
  { id: 'legacy-london', name: 'Sessione di Londra', start: '00:00', end: '15:30' },
  { id: 'legacy-open', name: 'Inizio sessione', start: '15:30', end: '15:50' },
  { id: 'legacy-close', name: 'Fine sessione', start: '15:50', end: '16:11' },
  { id: 'legacy-late', name: 'Late New York / Asia', start: '16:11', end: '24:00' },
];

export const LEGACY_PREFERENCES: JournalPreferences = {
  onboardingCompleted: true,
  name: '',
  photo: null,
  assets: ['NQ', 'MNQ'],
  setups: ['Continuation', 'Reversal Sequence', 'Reversal Sequence Failed'],
  windows: LEGACY_WINDOWS,
};

export const EMPTY_PREFERENCES: JournalPreferences = {
  onboardingCompleted: false,
  name: '',
  photo: null,
  assets: [],
  setups: [],
  windows: [],
};

export const MAX_NAME_LENGTH = 30;
export const MAX_LABEL_LENGTH = 24;

export function capitalizeSetup(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .slice(0, MAX_LABEL_LENGTH);
}

const includesIgnoreCase = (list: string[], value: string) =>
  list.some(item => item.toLowerCase() === value.toLowerCase());

export function addSetup(list: string[], raw: string): string[] {
  const value = capitalizeSetup(raw);

  if (!value || includesIgnoreCase(list, value)) return list;

  return [...list, value];
}

export function addAsset(list: string[], raw: string): string[] {
  const value = raw.trim().replace(/\s+/g, '').toUpperCase().slice(0, MAX_LABEL_LENGTH);

  if (!value || includesIgnoreCase(list, value)) return list;

  return [...list, value];
}

export function parseStoredPreferences(raw: string | null): JournalPreferences | null {
  if (!raw) return null;

  try {
    const data = JSON.parse(raw) as Partial<JournalPreferences> | null;

    if (!data || typeof data !== 'object') return null;

    const strings = (value: unknown) =>
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : [];
    const windows = Array.isArray(data.windows)
      ? data.windows.filter(
          (item): item is OperatingWindowConfig =>
            !!item &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            typeof item.start === 'string' &&
            typeof item.end === 'string'
        )
      : [];

    return {
      onboardingCompleted: data.onboardingCompleted === true,
      name: typeof data.name === 'string' ? data.name : '',
      photo: typeof data.photo === 'string' ? data.photo : null,
      assets: strings(data.assets),
      setups: strings(data.setups),
      windows,
    };
  } catch {
    return null;
  }
}

export function resolveInitialPreferences(
  stored: JournalPreferences | null,
  hasExistingData: boolean
): { preferences: JournalPreferences; needsOnboarding: boolean } {
  if (stored) {
    return { preferences: stored, needsOnboarding: !stored.onboardingCompleted };
  }

  if (hasExistingData) {
    return { preferences: LEGACY_PREFERENCES, needsOnboarding: false };
  }

  return { preferences: EMPTY_PREFERENCES, needsOnboarding: true };
}

export interface MenuOption {
  value: string;
  orphan: boolean;
}

export function getMenuOptions(list: string[], current: string): MenuOption[] {
  const options = list.map(value => ({ value, orphan: false }));

  if (current && !list.includes(current)) {
    options.push({ value: current, orphan: true });
  }

  return options;
}

export function loadStoredPreferences(): JournalPreferences | null {
  try {
    return parseStoredPreferences(localStorage.getItem(PREFERENCES_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveStoredPreferences(preferences: JournalPreferences): void {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Preferences stay active for the current session only.
  }
}
