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
const CALENDAR_ZERO_PNL_VISIBILITY_KEY =
  'eclipsejournal_calendar_show_zero_pnl_trades';

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
  showZeroPnlTradesInCalendar: boolean;
  setShowZeroPnlTradesInCalendar: (enabled: boolean) => void;
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
  const [showZeroPnlTradesInCalendar, setShowZeroPnlTradesInCalendarState] =
    useState(() => {
      try {
        const stored = localStorage.getItem(CALENDAR_ZERO_PNL_VISIBILITY_KEY);

        return stored === null ? true : stored === 'true';
      } catch {
        return true;
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
        CALENDAR_ZERO_PNL_VISIBILITY_KEY,
        String(showZeroPnlTradesInCalendar)
      );
    } catch {
      // The preference remains active for the current session.
    }
  }, [showZeroPnlTradesInCalendar]);

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
      showZeroPnlTradesInCalendar,
      setShowZeroPnlTradesInCalendar: setShowZeroPnlTradesInCalendarState,
    }),
    [
      streamerMode,
      sundayWeekStart,
      showCalendarSetup,
      showCalendarTags,
      showZeroPnlTradesInCalendar,
    ]
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
