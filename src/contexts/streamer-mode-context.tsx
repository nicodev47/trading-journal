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
const LEGACY_WEEKEND_EDGE_CALENDAR_KEY =
  'eclipsejournal_calendar_weekend_edges';
const SUNDAY_WEEK_START_CALENDAR_KEY =
  'eclipsejournal_calendar_sunday_week_start';
const CALENDAR_SETUP_VISIBILITY_KEY =
  'eclipsejournal_calendar_show_setup';
const CALENDAR_TAG_VISIBILITY_KEY =
  'eclipsejournal_calendar_show_tags';

interface StreamerModeContextValue {
  streamerMode: boolean;
  setStreamerMode: (enabled: boolean) => void;
  toggleStreamerMode: () => void;
  sundayWeekStart: boolean;
  setSundayWeekStart: (enabled: boolean) => void;
  showCalendarSetup: boolean;
  setShowCalendarSetup: (enabled: boolean) => void;
  showCalendarTags: boolean;
  setShowCalendarTags: (enabled: boolean) => void;
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
  const [sundayWeekStart, setSundayWeekStartState] = useState(() => {
    try {
      const stored = localStorage.getItem(SUNDAY_WEEK_START_CALENDAR_KEY);

      if (stored !== null) return stored === 'true';

      return localStorage.getItem(LEGACY_WEEKEND_EDGE_CALENDAR_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [showCalendarSetup, setShowCalendarSetupState] = useState(() => {
    try {
      return localStorage.getItem(CALENDAR_SETUP_VISIBILITY_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [showCalendarTags, setShowCalendarTagsState] = useState(() => {
    try {
      return localStorage.getItem(CALENDAR_TAG_VISIBILITY_KEY) === 'true';
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

  useEffect(() => {
    try {
      localStorage.setItem(
        SUNDAY_WEEK_START_CALENDAR_KEY,
        String(sundayWeekStart)
      );
    } catch {
      // The preference remains active for the current session.
    }
  }, [sundayWeekStart]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CALENDAR_SETUP_VISIBILITY_KEY,
        String(showCalendarSetup)
      );
    } catch {
      // The preference remains active for the current session.
    }
  }, [showCalendarSetup]);

  useEffect(() => {
    try {
      localStorage.setItem(
        CALENDAR_TAG_VISIBILITY_KEY,
        String(showCalendarTags)
      );
    } catch {
      // The preference remains active for the current session.
    }
  }, [showCalendarTags]);

  const value = useMemo(
    () => ({
      streamerMode,
      setStreamerMode: setStreamerModeState,
      toggleStreamerMode: () => setStreamerModeState(current => !current),
      sundayWeekStart,
      setSundayWeekStart: setSundayWeekStartState,
      showCalendarSetup,
      setShowCalendarSetup: setShowCalendarSetupState,
      showCalendarTags,
      setShowCalendarTags: setShowCalendarTagsState,
    }),
    [streamerMode, sundayWeekStart, showCalendarSetup, showCalendarTags]
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
