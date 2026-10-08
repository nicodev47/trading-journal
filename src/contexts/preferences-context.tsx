'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { PROFILE_NAME_KEY } from '@/lib/export-filename';
import {
  loadStoredPreferences,
  resolveInitialPreferences,
  saveStoredPreferences,
  type JournalPreferences,
} from '@/lib/preferences';
import { WORKSPACE_STORAGE_KEY_PREFIX } from '@/lib/workspace-storage';
import { hasWorkspaceContent } from '@/lib/workspace-content';

interface PreferencesContextValue {
  preferences: JournalPreferences;
  needsOnboarding: boolean;
  updatePreferences: (patch: Partial<JournalPreferences>) => void;
  completeOnboarding: (preferences: JournalPreferences) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const hasAnyStoredData = (): boolean => {
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);

      if (!key || !key.startsWith(WORKSPACE_STORAGE_KEY_PREFIX)) continue;

      const parsed = JSON.parse(localStorage.getItem(key) || 'null');

      if (
        parsed &&
        hasWorkspaceContent({
          trades: Array.isArray(parsed.trades) ? parsed.trades : [],
          missedTrades: Array.isArray(parsed.missedTrades) ? parsed.missedTrades : [],
          weeklyPlans: Array.isArray(parsed.weeklyPlans) ? parsed.weeklyPlans : [],
        })
      ) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
};

const readLegacyName = () => {
  try {
    return localStorage.getItem(PROFILE_NAME_KEY) || '';
  } catch {
    return '';
  }
};

const persistName = (name: string) => {
  try {
    if (name.trim()) {
      localStorage.setItem(PROFILE_NAME_KEY, name.trim());
    } else {
      localStorage.removeItem(PROFILE_NAME_KEY);
    }
  } catch {
    // The name stays active for the current session only.
  }
};

const getOnboardingOverride = (): 'preview' | 'force' | null => {
  try {
    const value = new URLSearchParams(window.location.search).get('onboarding');

    if (value === 'preview') return 'preview';

    return value !== null ? 'force' : null;
  } catch {
    return null;
  }
};

const clearOnboardingParam = () => {
  try {
    const url = new URL(window.location.href);

    url.searchParams.delete('onboarding');
    window.history.replaceState(null, '', url.toString());
  } catch {
    // The address bar keeps the parameter; harmless.
  }
};

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [override] = useState(getOnboardingOverride);
  const [state, setState] = useState(() => {
    const stored = loadStoredPreferences();
    const resolved = resolveInitialPreferences(
      stored,
      stored ? false : hasAnyStoredData()
    );
    const preferences = {
      ...resolved.preferences,
      name: resolved.preferences.name || readLegacyName(),
    };

    if (!stored && !resolved.needsOnboarding) {
      saveStoredPreferences(preferences);
    }

    return {
      preferences,
      needsOnboarding: resolved.needsOnboarding || override !== null,
    };
  });

  const updatePreferences = useCallback((patch: Partial<JournalPreferences>) => {
    setState(current => {
      const preferences = { ...current.preferences, ...patch };

      saveStoredPreferences(preferences);

      if (patch.name !== undefined) persistName(patch.name);

      return { ...current, preferences };
    });
  }, []);

  const completeOnboarding = useCallback((preferences: JournalPreferences) => {
    if (override === 'preview') {
      clearOnboardingParam();
      setState(current => ({ ...current, needsOnboarding: false }));
      return;
    }

    clearOnboardingParam();

    const completed = { ...preferences, onboardingCompleted: true };

    saveStoredPreferences(completed);
    persistName(completed.name);
    setState({ preferences: completed, needsOnboarding: false });
  }, [override]);

  const value = useMemo(
    () => ({
      preferences: state.preferences,
      needsOnboarding: state.needsOnboarding,
      updatePreferences,
      completeOnboarding,
    }),
    [state, updatePreferences, completeOnboarding]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error('usePreferences must be used inside PreferencesProvider');
  }

  return context;
}
