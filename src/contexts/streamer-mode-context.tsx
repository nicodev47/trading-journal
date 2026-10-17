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
const CALENDAR_EMOTION_VISIBILITY_KEY =
  'eclipsejournal_calendar_show_emotions';

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
  showCalendarEmotions: boolean;
  setShowCalendarEmotions: (enabled: boolean) => void;
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

      const legacyStored = localStorage.getItem(
        LEGACY_WEEKEND_EDGE_CALENDAR_KEY
      );

      return legacyStored === null ? true : legacyStored === 'true';
    } catch {
      return true;
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
  const [showCalendarEmotions, setShowCalendarEmotionsState] =
    useState(() => {
      try {
        return localStorage.getItem(CALENDAR_EMOTION_VISIBILITY_KEY) === 'true';
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

  useEffect(() => {
    try {
      localStorage.setItem(
        CALENDAR_EMOTION_VISIBILITY_KEY,
        String(showCalendarEmotions)
      );
    } catch {
      // The preference remains active for the current session.
    }
  }, [showCalendarEmotions]);

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
      showCalendarEmotions,
      setShowCalendarEmotions: setShowCalendarEmotionsState,
    }),
    [
      streamerMode,
      sundayWeekStart,
      showCalendarSetup,
      showCalendarTags,
      showCalendarEmotions,
    ]
  );

  return (
    <StreamerModeContext.Provider value={value}>
      {children}
    </StreamerModeContext.Provider>
  );
}

/** Default display settings, detached from the viewer's own (import preview). */
export function DefaultDisplaySettingsProvider({ children }: { children: ReactNode }) {
  const value = useMemo<StreamerModeContextValue>(
    () => ({
      streamerMode: false,
      setStreamerMode: () => {},
      toggleStreamerMode: () => {},
      sundayWeekStart: true,
      setSundayWeekStart: () => {},
      showCalendarSetup: false,
      setShowCalendarSetup: () => {},
      showCalendarTags: false,
      setShowCalendarTags: () => {},
      showCalendarEmotions: false,
      setShowCalendarEmotions: () => {},
    }),
    []
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
