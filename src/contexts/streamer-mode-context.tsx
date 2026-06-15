'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STREAMER_MODE_KEY = 'streamerMode';

interface StreamerModeContextValue {
  streamerMode: boolean;
  setStreamerMode: (enabled: boolean) => void;
  toggleStreamerMode: () => void;
}

const StreamerModeContext = createContext<StreamerModeContextValue | null>(null);

export function StreamerModeProvider({ children }: { children: ReactNode }) {
  const [streamerMode, setStreamerModeState] = useState(() => {
    try {
      return localStorage.getItem(STREAMER_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STREAMER_MODE_KEY, String(streamerMode));
    } catch {
      // The preference remains active for the current session.
    }
  }, [streamerMode]);

  const value = useMemo(
    () => ({
      streamerMode,
      setStreamerMode: setStreamerModeState,
      toggleStreamerMode: () => setStreamerModeState(current => !current),
    }),
    [streamerMode]
  );

  return (
    <StreamerModeContext.Provider value={value}>
      {children}
    </StreamerModeContext.Provider>
  );
}

export function useStreamerMode() {
  const context = useContext(StreamerModeContext);

  if (!context) {
    throw new Error('useStreamerMode must be used inside StreamerModeProvider');
  }

  return context;
}
