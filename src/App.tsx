import { useState, useCallback, useEffect } from 'react';
import { NavHeader } from '@/components/trading-journal/nav-header';
import { TradingCalendar } from '@/components/trading-journal/trading-calendar';
import { StatsGrid } from '@/components/trading-journal/stats-grid';
import { EquityCurve } from '@/components/trading-journal/equity-curve';
import { MonthlyAnalysis } from '@/components/trading-journal/monthly-analysis';
import { DayEditorDialog } from '@/components/trading-journal/day-editor-dialog';
import { TradeDetailDialog } from '@/components/trading-journal/trade-detail-dialog';
import { TradeGroupDetailDialog } from '@/components/trading-journal/trade-group-detail-dialog';
import { WeeklyPlanDialog, type WeeklyPlanData } from '@/components/trading-journal/weekly-plan-dialog';
import { ImportExportDialog } from '@/components/trading-journal/import-export-dialog';
import {
  useJournalWorkspaces,
  useTrades,
  hasStoredWorkspaceContent,
  type JournalWorkspace,
} from '@/hooks/use-trades';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { JournalState, Trade } from '@/lib/types/trade';
import { AdvancedStatsGrid } from '@/components/trading-journal/advanced-stats-grid';
import { ProfileDialog } from '@/components/trading-journal/profile-dialog';
import { toast } from 'sonner';
import { StreamerModeProvider } from '@/contexts/streamer-mode-context';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import { WhatsNewDialog } from '@/components/trading-journal/whats-new-dialog';
import { Download, RotateCcw } from 'lucide-react';
import {
  getDefaultExportBaseName,
  normalizeExportName,
  normalizeExportFileName,
} from '@/lib/export-filename';
import { createZipBlob } from '@/lib/zip-export';
import { TutorialTour } from '@/components/trading-journal/tutorial/tutorial-tour';
import { TutorialWelcomeDialog } from '@/components/trading-journal/tutorial/tutorial-welcome-dialog';
import { TUTORIAL_STEPS } from '@/components/trading-journal/tutorial/tutorial-steps';
import {
  createTutorialTrades,
  getTutorialDemoDateKey,
  isValidTutorialTradeSet,
  TUTORIAL_SEEN_KEY,
} from '@/components/trading-journal/tutorial/tutorial-constants';
import { hasWorkspaceContent } from '@/lib/workspace-content';
import {
  createWorkspaceExportData,
  getAppendImportTargetMonth,
} from '@/lib/journal-export';

const UPDATE_BANNER_KEY =
  'dismissedUpdateBanner_eclipsejournal_v06_accounts_import';
const BACKTEST_STORAGE_KEY = 'eclipse-trading-journal-data-backtest';

type TradeGroupDialogState = {
  title: string;
  subtitle?: string;
  trades: Trade[];
};

const getValidDate = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getEarliestImportedTradeMonth = (jsonString: string) => {
  try {
    const data = JSON.parse(jsonString) as Record<string, unknown>;

    if (!Array.isArray(data.trades)) return null;

    const earliestDate = data.trades.reduce<Date | null>((earliest, item) => {
      if (!item || typeof item !== 'object') return earliest;

      const trade = item as Record<string, unknown>;
      const validDates = [
        getValidDate(trade.exitDate),
        getValidDate(trade.entryDate),
      ].filter((date): date is Date => Boolean(date));

      validDates.forEach((date) => {
        if (!earliest || date.getTime() < earliest.getTime()) {
          earliest = date;
        }
      });

      return earliest;
    }, null);

    if (!earliestDate) return null;

    return new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
  } catch {
    return null;
  }
};

const getLatestTradeMonth = (trades: Trade[]) => {
  const latestDate = trades.reduce<Date | null>((latest, trade) => {
    const validDates = [
      getValidDate(trade.exitDate),
      getValidDate(trade.entryDate),
    ].filter((date): date is Date => Boolean(date));

    validDates.forEach((date) => {
      if (!latest || date.getTime() > latest.getTime()) {
        latest = date;
      }
    });

    return latest;
  }, null);

  if (!latestDate) return null;

  return new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
};

const getWorkspaceNavigationTargetMonth = (
  workspace: JournalWorkspace,
  trades: Trade[]
) => {
  if (workspace === 'personal') {
    return new Date();
  }

  if (workspace === 'backtest' || workspace === 'student') {
    return getLatestTradeMonth(trades);
  }

  if (workspace.startsWith('backtest-')) {
    return getLatestTradeMonth(trades);
  }

  if (workspace.startsWith('preview-')) {
    return getLatestTradeMonth(trades);
  }

  return null;
};

const getBacktestHasData = () => {
  try {
    const raw = localStorage.getItem(BACKTEST_STORAGE_KEY);

    if (!raw) return false;

    const data = JSON.parse(raw) as Record<string, unknown>;

    return (
      (Array.isArray(data.trades) && data.trades.length > 0) ||
      (Array.isArray(data.strategies) && data.strategies.length > 0) ||
      (Array.isArray(data.weeklyPlans) && data.weeklyPlans.length > 0) ||
      (Array.isArray(data.customTags) && data.customTags.length > 0) ||
      (Array.isArray(data.nonExecutedDays) && data.nonExecutedDays.length > 0) ||
      (Array.isArray(data.missedTrades) && data.missedTrades.length > 0)
    );
  } catch {
    return false;
  }
};

const getBacktestHasTrades = () => {
  try {
    const raw = localStorage.getItem(BACKTEST_STORAGE_KEY);

    if (!raw) return false;

    const data = JSON.parse(raw) as Record<string, unknown>;

    return Array.isArray(data.trades) && data.trades.length > 0;
  } catch {
    return false;
  }
};

function AppContent() {
 const { streamerMode } = useStreamerMode();
 const {
   workspaces,
   maxCustomWorkspaces,
   createWorkspace,
   updateWorkspace,
   deleteWorkspace,
 } = useJournalWorkspaces();
 const [activeWorkspace, setActiveWorkspace] = useState<JournalWorkspace>('personal');
const [activeView, setActiveView] = useState<'calendar' | 'monthly'>('calendar');
const [isHelpOpen, setIsHelpOpen] = useState(false);
const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
const [isUpdateBannerVisible, setIsUpdateBannerVisible] = useState(() => {
  try {
    return localStorage.getItem(UPDATE_BANNER_KEY) !== 'true';
  } catch {
    return true;
  }
});
const [isProfileOpen, setIsProfileOpen] = useState(false);
const [isResetPreviewConfirmOpen, setIsResetPreviewConfirmOpen] = useState(false);
const [isBacktestResetDialogOpen, setIsBacktestResetDialogOpen] = useState(false);
const [backtestHasData, setBacktestHasData] = useState(() => getBacktestHasData());
const [backtestHasTrades, setBacktestHasTrades] = useState(() => getBacktestHasTrades());
const [personalProfileTrades, setPersonalProfileTrades] = useState<Trade[]>([]);
const [privacyMode, setPrivacyMode] = useState(false);
const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
const [tradeGroupDialog, setTradeGroupDialog] = useState<TradeGroupDialogState | null>(null);
const [isTradeGroupOpen, setIsTradeGroupOpen] = useState(false);
const [returnToTradeGroup, setReturnToTradeGroup] = useState(false);
const [isTutorialWelcomeOpen, setIsTutorialWelcomeOpen] = useState(() => {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) !== 'true';
  } catch {
    return true;
  }
});
const [isTutorialActive, setIsTutorialActive] = useState(false);
const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
const [tutorialTrades, setTutorialTrades] = useState<Trade[]>([]);
const [importTargetMonth, setImportTargetMonth] = useState<Date | null>(null);
const tutorialDemoDateKey = getTutorialDemoDateKey();

  useEffect(() => {
    if (!isHelpOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isHelpOpen]);

  const {
    trades,
    missedTrades,
    tags,
    strategies,
    customTags,
    tagColors,
    weeklyPlans,
    isLoaded,
    addTrade,
    updateTrade,
    deleteTrade,
    addStrategy,
    removeStrategy,
    removeTag,
    addCustomTag,
    updateTagColor,
    saveWeeklyPlan,
    getWeeklyPlan,
    exportData,
    importData,
    appendImportData,
    clearAllData,
    getWorkspaceData,
    clearWorkspaceData,
    getTradesByDate,
  } = useTrades(activeWorkspace);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<{ weekKey: string; weekLabel: string } | null>(null);
  const [importExportMode, setImportExportMode] = useState<'import' | 'export' | null>(null);
  const showBacktestResetButton = activeWorkspace === 'backtest' && backtestHasData;
  const previewHasContent =
    (activeWorkspace === 'student' || activeWorkspace.startsWith('preview-')) &&
    hasWorkspaceContent(getWorkspaceData(activeWorkspace));
  const showPreviewWorkspace = true;
  const visibleTrades = isTutorialActive ? tutorialTrades : trades;

  useEffect(() => {
    if (!isTutorialActive) return;

    if (!isValidTutorialTradeSet(tutorialTrades)) {
      setTutorialTrades(createTutorialTrades());
      return;
    }

    const step = TUTORIAL_STEPS[tutorialStepIndex];
    const calendarTargets = new Set([
      'calendar',
      'workspace-tabs',
      'import-export-buttons',
      'stats-grid',
      'detailed-stats-equity',
      'profile-button',
      'help-button',
    ]);

    if (step?.target === 'trade-editor') {
      setActiveView('calendar');
      setIsHelpOpen(false);
      setSelectedDate(tutorialDemoDateKey);
      return;
    }

    if (step?.target && calendarTargets.has(step.target)) {
      setActiveView('calendar');
    }

    if (step?.target === 'analysis-section') {
      setActiveView('monthly');
    }

    if (selectedDate) {
      setSelectedDate(null);
    }

    if (isHelpOpen) {
      setIsHelpOpen(false);
    }
  }, [
    isHelpOpen,
    isTutorialActive,
    selectedDate,
    tutorialTrades,
    tutorialDemoDateKey,
    tutorialStepIndex,
  ]);

  const markTutorialSeen = () => {
    try {
      localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    } catch {
      // The tutorial stays dismissed for the current session.
    }
  };

  const closeTutorial = useCallback(() => {
    markTutorialSeen();
    setIsTutorialActive(false);
    setIsTutorialWelcomeOpen(false);
    setTutorialStepIndex(0);
    setTutorialTrades([]);
    setSelectedDate(null);
    setSelectedWeek(null);
    setImportExportMode(null);
    setIsProfileOpen(false);
    setIsHelpOpen(false);
  }, []);

  const handleStartTutorial = () => {
    setSelectedDate(null);
    setSelectedWeek(null);
    setImportExportMode(null);
    setIsProfileOpen(false);
    setIsHelpOpen(false);
    setTutorialTrades(createTutorialTrades());
    setTutorialStepIndex(0);
    setIsTutorialWelcomeOpen(false);
    setIsTutorialActive(true);
    setActiveView('calendar');
  };

  const handleRestartTutorial = () => {
    setIsHelpOpen(false);
    setIsTutorialActive(false);
    setTutorialTrades([]);
    setTutorialStepIndex(0);
    setIsTutorialWelcomeOpen(true);
  };

  const handleTutorialNext = () => {
    const step = TUTORIAL_STEPS[tutorialStepIndex];

    if (step?.target === 'trade-editor') {
      setSelectedDate(null);
    }

    if (step?.action === 'complete' || tutorialStepIndex >= TUTORIAL_STEPS.length - 1) {
      closeTutorial();
      return;
    }

    setTutorialStepIndex((index) => index + 1);
  };

  useEffect(() => {
    setBacktestHasData(getBacktestHasData());
    setBacktestHasTrades(getBacktestHasTrades());
  }, [activeWorkspace, trades, strategies, weeklyPlans, customTags, missedTrades]);

  const handleDayClick = (date: string) => {
    if (isTutorialActive) return;

    setSelectedDate(date);
  };

  const handleWeekPlanClick = (weekKey: string, weekLabel: string) => {
    if (isTutorialActive) return;

    setSelectedWeek({ weekKey, weekLabel });
  };

  const handleSaveDayTrades = (dayTrades: Trade[]) => {
    if (isTutorialActive) {
      setSelectedDate(null);
      return;
    }

    const existingTrades = selectedDate ? getTradesByDate(selectedDate) : [];
    existingTrades.forEach((trade) => deleteTrade(trade.id));

    dayTrades.forEach((trade) => {
      addTrade(trade);
    });

    if (activeWorkspace === 'backtest') {
      const nextTradeCount = trades.length - existingTrades.length + dayTrades.length;

      setBacktestHasData(
        nextTradeCount > 0 ||
        strategies.length > 0 ||
        weeklyPlans.length > 0 ||
        customTags.length > 0 ||
        missedTrades.length > 0
      );
      setBacktestHasTrades(nextTradeCount > 0);
    }
  };

  const handleDeleteDay = () => {
    if (isTutorialActive) {
      setSelectedDate(null);
      return;
    }

    if (selectedDate) {
      const existingTrades = getTradesByDate(selectedDate);
      existingTrades.forEach((trade) => deleteTrade(trade.id));
      setSelectedDate(null);

      if (activeWorkspace === 'backtest') {
        const nextTradeCount = trades.length - existingTrades.length;

        setBacktestHasData(
          nextTradeCount > 0 ||
          strategies.length > 0 ||
          weeklyPlans.length > 0 ||
          customTags.length > 0 ||
          missedTrades.length > 0
        );
        setBacktestHasTrades(nextTradeCount > 0);
      }
    }
  };

  const handleCloseDayEditor = () => {
    setSelectedDate(null);
  };

  const handleSaveWeeklyPlan = useCallback((data: WeeklyPlanData) => {
    saveWeeklyPlan({
      weekKey: data.weekKey,
      approach: data.approach,
      calendarScreenshots: data.calendarScreenshots,
      notes: data.notes,
    });

    if (activeWorkspace === 'backtest') {
      setBacktestHasData(true);
    }
  }, [activeWorkspace, saveWeeklyPlan]);

  const handleWorkspaceChange = (workspace: JournalWorkspace) => {
    const targetMonth = getWorkspaceNavigationTargetMonth(
      workspace,
      getWorkspaceData(workspace).trades
    );

    setSelectedDate(null);
    setSelectedWeek(null);
    setImportExportMode(null);
    setIsResetPreviewConfirmOpen(false);
    setIsBacktestResetDialogOpen(false);
    setBacktestHasData(getBacktestHasData());
    setBacktestHasTrades(getBacktestHasTrades());
    setImportTargetMonth(targetMonth);
    setActiveWorkspace(workspace);
  };

  const getWorkspaceExportData = useCallback((workspace: JournalWorkspace) => {
    return createWorkspaceExportData(workspace, getWorkspaceData(workspace));
  }, [getWorkspaceData]);

  const getWorkspaceHasImportData = useCallback((workspace: JournalWorkspace) => {
    return hasWorkspaceContent(getWorkspaceData(workspace));
  }, [getWorkspaceData]);

  const completeImportNavigation = (
    data: string,
    workspace: JournalWorkspace
  ) => {
    if (workspace === 'backtest') {
      setBacktestHasData(getBacktestHasData());
      setBacktestHasTrades(getBacktestHasTrades());
    }

    if (workspace === 'student' && !hasStoredWorkspaceContent('student')) {
      if (activeWorkspace === 'student') {
        handleWorkspaceChange('personal');
        setActiveView('calendar');
        setImportTargetMonth(new Date());
      }
      return;
    }

    handleWorkspaceChange(workspace);
    setActiveView('calendar');
    setImportTargetMonth(getEarliestImportedTradeMonth(data));
  };

  const handleImportData = (data: string, workspace: JournalWorkspace) => {
    const success = importData(data, workspace);

    if (success) {
      completeImportNavigation(data, workspace);
    }

    return success;
  };

  const handleAppendImportData = (data: string, workspace: JournalWorkspace) => {
    const targetMonth = getAppendImportTargetMonth(
      data,
      getWorkspaceData(workspace).trades
    );
    const success = appendImportData(data, workspace);

    if (success) {
      completeImportNavigation(data, workspace);
      setImportTargetMonth(targetMonth);
    }

    return success;
  };

  const handleResetStudentJournal = () => {
    if (
      activeWorkspace !== 'student' &&
      !activeWorkspace.startsWith('preview-')
    ) return;

    setIsResetPreviewConfirmOpen(true);
  };

  const confirmResetPreview = () => {
    if (
      activeWorkspace !== 'student' &&
      !activeWorkspace.startsWith('preview-')
    ) {
      setIsResetPreviewConfirmOpen(false);
      return;
    }

    setSelectedDate(null);
    setSelectedWeek(null);
    setImportExportMode(null);
    clearWorkspaceData(activeWorkspace);
    setIsResetPreviewConfirmOpen(false);
    setActiveView('calendar');
    setImportTargetMonth(new Date());
    setActiveWorkspace('personal');
  };

  const handleResetBacktestJournal = () => {
    if (activeWorkspace !== 'backtest') return;

    setSelectedDate(null);
    setSelectedWeek(null);
    setImportExportMode(null);
    clearAllData();
    setBacktestHasData(false);
    setBacktestHasTrades(false);
    setIsBacktestResetDialogOpen(false);
  };

  const handleBackupAndResetBacktest = () => {
    if (activeWorkspace !== 'backtest') return;

    const backtestData = getWorkspaceData('backtest');
    const backupData = JSON.stringify(backtestData, null, 2);
    const blob = new Blob([backupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const backupBaseName = getDefaultExportBaseName(
      'backtest',
      backtestData.trades
    );

    anchor.href = url;
    anchor.download = normalizeExportFileName(backupBaseName, backupBaseName);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    handleResetBacktestJournal();
  };

  const handleOpenProfile = () => {
    setPersonalProfileTrades(
      isTutorialActive ? tutorialTrades : getWorkspaceData('personal').trades
    );
    setIsProfileOpen(true);
  };

  const handleExportAllJournals = () => {
    const folderNames = {
      account: 'I tuoi conti',
      backtest: 'Backtest',
      preview: 'Preview',
    } as const;
    const files = workspaces.flatMap((workspace) => {
      const workspaceData = getWorkspaceData(workspace.id);

      if (!hasWorkspaceContent(workspaceData)) return [];

      const folder = folderNames[workspace.group ?? 'account'];
      const fileName = normalizeExportName(workspace.name, workspace.id);

      return [{
        path: `${folder}/${fileName}.json`,
        content: createWorkspaceExportData(
          workspace.id,
          workspaceData,
          new Date(),
          workspace
        ),
      }];
    });

    if (files.length === 0) {
      toast.info('Non ci sono dati da esportare');
      return;
    }
    const blob = createZipBlob(files);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const date = new Date();
    const dateSlug = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');

    anchor.href = url;
    anchor.download = `eclipsejournal-tutti-i-dati-${dateSlug}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast.success('Tutti i journal sono stati esportati');
  };

  const handleClearAllJournals = () => {
    workspaces.forEach((workspace) => clearWorkspaceData(workspace.id));
    setPersonalProfileTrades([]);
    setBacktestHasData(false);
    setBacktestHasTrades(false);
    setSelectedDate(null);
    setSelectedWeek(null);
    setImportExportMode(null);
    setActiveView('calendar');
    setImportTargetMonth(new Date());
    setActiveWorkspace('personal');
    toast.success('Tutti i dati dei journal sono stati eliminati');
  };

  const handleBackupWorkspace = (workspace: JournalWorkspace) => {
    const workspaceData = getWorkspaceData(workspace);
    const workspaceName = workspaces.find((item) => item.id === workspace)?.name;
    const backupData = createWorkspaceExportData(workspace, workspaceData);
    const blob = new Blob([backupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const backupBaseName = getDefaultExportBaseName(
      workspace,
      workspaceData.trades,
      workspaceName
    );

    anchor.href = url;
    anchor.download = normalizeExportFileName(backupBaseName, backupBaseName);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast.success(`Backup di ${workspaceName ?? 'conto'} scaricato`);
  };

  const handleDeleteWorkspace = (workspace: JournalWorkspace) => {
    const workspaceName = workspaces.find((item) => item.id === workspace)?.name;

    clearWorkspaceData(workspace);
    const success = deleteWorkspace(workspace);

    if (!success) {
      toast.error('Impossibile eliminare il conto');
      return false;
    }

    if (workspace === 'personal') {
      setPersonalProfileTrades([]);
    }

    if (workspace === 'backtest') {
      setBacktestHasData(false);
      setBacktestHasTrades(false);
    }

    if (activeWorkspace === workspace && workspace !== 'personal' && workspace !== 'backtest') {
      handleWorkspaceChange(
        workspace.startsWith('backtest-')
          ? 'backtest'
          : workspace.startsWith('preview-')
            ? 'student'
            : 'personal'
      );
    }

    toast.success(
      workspace === 'personal' ||
      workspace === 'secondary' ||
      workspace === 'backtest' ||
      workspace === 'backtest-2' ||
      workspace === 'preview-2' ||
      workspace === 'student'
        ? `${workspaceName ?? 'Conto'} ripristinato`
        : `${workspaceName ?? 'Conto'} eliminato`
    );
    return true;
  };

  const handleDismissUpdateBanner = () => {
    setIsUpdateBannerVisible(false);

    try {
      localStorage.setItem(UPDATE_BANNER_KEY, 'true');
    } catch {
      // The banner remains dismissed for the current session.
    }
  };

  const handleOpenTradeGroup = (payload: TradeGroupDialogState) => {
    if (payload.trades.length === 0) return;

    setTradeGroupDialog(payload);
    setIsTradeGroupOpen(true);
    setReturnToTradeGroup(false);
  };

  const handleOpenWhatsNewFromHelp = () => {
    setIsHelpOpen(false);
    setIsWhatsNewOpen(true);
  };

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="font-mono text-sm text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {isUpdateBannerVisible && (
        <div className="border-b border-violet-400/25 bg-gradient-to-r from-violet-950/90 via-violet-900/65 to-slate-950">
          <div className="flex min-h-11 w-full items-center justify-center px-4 py-2">
            <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center">
              <div className="min-w-0 basis-full sm:basis-auto">
                <p className="font-mono text-xs font-semibold text-violet-100 sm:text-sm">
                  EclipseJournal v0.6 è disponibile!
                </p>
                <p className="font-sans text-[11px] text-violet-200/75">
                  Import ed Export per pagina, backup preventivo e note durante la creazione dei conti.
                </p>
              </div>
              <div className="flex shrink-0 items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsWhatsNewOpen(true)}
                  className="shrink-0 rounded-lg border border-violet-300/25 bg-violet-300/10 px-3 py-1.5 font-sans text-xs font-semibold text-violet-100 transition hover:border-violet-200/50 hover:bg-violet-300/15"
                >
                  Visualizza novità
                </button>
                <button
                  type="button"
                  onClick={handleDismissUpdateBanner}
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-sm leading-none text-violet-200/70 transition hover:bg-white/10 hover:text-white"
                  aria-label="Chiudi annuncio aggiornamento"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <NavHeader
        activeView={activeView}
        activeWorkspace={activeWorkspace}
        workspaces={workspaces}
        showPreviewWorkspace={showPreviewWorkspace}
        maxCustomWorkspaces={maxCustomWorkspaces}
        onWorkspaceChange={handleWorkspaceChange}
        onCreateWorkspace={createWorkspace}
        onUpdateWorkspace={updateWorkspace}
        onBackupWorkspace={handleBackupWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        pinnedForTutorial={
          isTutorialActive &&
          TUTORIAL_STEPS[tutorialStepIndex]?.target === 'analysis-section'
        }
        onViewChange={setActiveView}
        onHelpClick={() => setIsHelpOpen(true)}
        onProfileClick={handleOpenProfile}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 overflow-x-hidden px-3.5 py-2.5 sm:px-4 sm:py-3">
        {activeView === 'calendar' ? (
          <>
          <>
  <StatsGrid trades={visibleTrades} />

  <TradingCalendar
    trades={visibleTrades}
    navigationTrades={isTutorialActive ? [] : trades}
    weeklyPlans={isTutorialActive ? [] : weeklyPlans}
    activeWorkspace={activeWorkspace}
    showPreviewWorkspace={previewHasContent}
    showResetButton={!isTutorialActive && showBacktestResetButton}
    onResetStudentJournal={handleResetStudentJournal}
    onResetBacktestJournal={() => setIsBacktestResetDialogOpen(true)}
    onDayClick={handleDayClick}
    onWeekPlanClick={handleWeekPlanClick}
    onImport={() => {
      if (!isTutorialActive) setImportExportMode('import');
    }}
    onExport={() => {
      if (!isTutorialActive) setImportExportMode('export');
    }}
    importTargetMonth={importTargetMonth}
    tutorialDemoDateKey={isTutorialActive ? tutorialDemoDateKey : undefined}
  />

  <div data-tutorial="detailed-stats-equity">
    <div data-tutorial-part="detailed-stats">
      <AdvancedStatsGrid trades={visibleTrades} />
    </div>

    <div
      data-tutorial-part="equity"
      className="pb-5 pt-3 sm:pb-6 sm:pt-4"
    >
      <EquityCurve
        trades={visibleTrades}
        onOpenTradeGroup={handleOpenTradeGroup}
      />
    </div>
  </div>
</>
          </>
        ) : (
          <MonthlyAnalysis
            trades={visibleTrades}
            tagColors={tagColors}
            onUpdateTrade={updateTrade}
          />
        )}
      </main>

      <footer className="border-t border-border bg-card py-4">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <span className="font-mono text-xs text-muted-foreground">
            Powered by{' '}
            <a
              href="https://eclipsetradingclub.it"
              target="_blank"
              rel="noopener noreferrer"
              className="text-profit hover:underline"
            >
              Eclipse Trading Club
            </a>
          </span>
        </div>
      </footer>

      {selectedDate && (
        <DayEditorDialog
          isOpen={!!selectedDate}
          isTutorialMode={isTutorialActive}
          onClose={handleCloseDayEditor}
          date={selectedDate}
          existingTrades={
            isTutorialActive
              ? visibleTrades.filter(
                  (trade) =>
                    (trade.exitDate || trade.entryDate).split('T')[0] ===
                    selectedDate
                )
              : getTradesByDate(selectedDate)
          }
          onSave={handleSaveDayTrades}
          onDeleteDay={handleDeleteDay}
          strategies={strategies}
          availableStandardTags={tags}
          customTags={customTags}
          tagColors={tagColors}
          onAddStrategy={addStrategy}
          onRemoveStrategy={removeStrategy}
          onAddCustomTag={addCustomTag}
          onUpdateTagColor={updateTagColor}
          onRemoveTag={removeTag}
        />
      )}

      {selectedWeek && (
        <WeeklyPlanDialog
          isOpen={!!selectedWeek}
          onClose={() => setSelectedWeek(null)}
          weekKey={selectedWeek.weekKey}
          weekLabel={selectedWeek.weekLabel}
          initialData={getWeeklyPlan(selectedWeek.weekKey)}
          onSave={handleSaveWeeklyPlan}
        />
      )}

      <TradeDetailDialog
        trade={selectedTrade}
        streamerMode={streamerMode}
        onUpdateTrade={(id, updates) => {
          updateTrade(id, updates);
          setSelectedTrade((currentTrade) =>
            currentTrade?.id === id
              ? { ...currentTrade, ...updates }
              : currentTrade
          );
        }}
        onClose={() => {
          setSelectedTrade(null);
          setReturnToTradeGroup(false);
        }}
        showBackButton={returnToTradeGroup}
        onBack={() => {
          setSelectedTrade(null);
          if (returnToTradeGroup) {
            setIsTradeGroupOpen(true);
          }
        }}
      />
      <TradeGroupDetailDialog
        open={isTradeGroupOpen && Boolean(tradeGroupDialog)}
        onOpenChange={(open) => {
          setIsTradeGroupOpen(open);
          if (!open) setReturnToTradeGroup(false);
        }}
        title={tradeGroupDialog?.title ?? ''}
        subtitle={tradeGroupDialog?.subtitle}
        trades={tradeGroupDialog?.trades ?? []}
        onOpenTrade={(trade) => {
          setIsTradeGroupOpen(false);
          setSelectedTrade(trade);
          setReturnToTradeGroup(true);
        }}
      />

      <ImportExportDialog
        isOpen={!!importExportMode}
        onClose={() => setImportExportMode(null)}
        mode={importExportMode === 'export' ? 'export' : 'import'}
        activeWorkspace={activeWorkspace}
        workspaceOptions={workspaces}
        exportData={exportData()}
        getWorkspaceExportData={getWorkspaceExportData}
        workspaceHasData={getWorkspaceHasImportData}
        onImport={importExportMode === 'import' ? handleImportData : undefined}
        onAppendImport={
          importExportMode === 'import' ? handleAppendImportData : undefined
        }
      />

      <ProfileDialog
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        trades={personalProfileTrades}
        onExportAll={handleExportAllJournals}
        onClearAll={handleClearAllJournals}
      />

      <Dialog
        open={isResetPreviewConfirmOpen}
        onOpenChange={setIsResetPreviewConfirmOpen}
      >
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.75rem)] max-w-md rounded-2xl border border-border bg-background shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-sans text-lg font-semibold text-foreground">
              Reset Preview?
            </DialogTitle>
            <DialogDescription className="font-sans text-sm leading-relaxed text-muted-foreground">
              Questa azione cancellerà tutti i trade, le strategie e i piani salvati nella Preview. I dati del journal Personale e del Backtest non verranno modificati.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsResetPreviewConfirmOpen(false)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={confirmResetPreview}
              className="gap-2 bg-loss text-white hover:bg-loss/90"
            >
              <RotateCcw className="size-4" />
              Reset Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isBacktestResetDialogOpen}
        onOpenChange={setIsBacktestResetDialogOpen}
      >
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.75rem)] max-w-[520px] overflow-hidden rounded-2xl border border-border bg-card p-0">
          <DialogHeader className="border-b border-border px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-loss/30 bg-loss/10 text-loss">
                <RotateCcw className="size-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="font-sans text-lg font-semibold text-foreground">
                  Reset Backtest
                </DialogTitle>
                <DialogDescription className="mt-1 font-sans text-sm text-muted-foreground">
                  Prima di resettare il Backtest ti consigliamo di esportare un backup dei tuoi dati.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="ej-scrollbar max-h-[calc(92dvh-9rem)] overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            <div className="rounded-xl border border-loss/30 bg-loss/10 p-4">
              <p className="font-sans text-sm leading-relaxed text-foreground">
                Questa azione cancellerà trade, strategie e piani salvati nel Backtest.
                Il journal Personale e Preview non verranno modificati.
                Consigliato: scarica un backup prima di procedere.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 border-t border-border bg-background/25 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4 max-sm:[&_button]:w-full">
            <Button
              type="button"
              onClick={handleBackupAndResetBacktest}
              className="gap-2 bg-profit text-background hover:bg-profit/90"
            >
              <Download className="size-4" />
              Scarica backup e resetta
            </Button>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBacktestResetDialogOpen(false)}
              >
                Annulla
              </Button>
              <Button
                type="button"
                onClick={handleResetBacktestJournal}
                className="gap-2 bg-loss text-white hover:bg-loss/90"
              >
                <RotateCcw className="size-4" />
                Reset Backtest
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isHelpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-dialog-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsHelpOpen(false);
          }}
        >
          <div className="ej-scrollbar max-h-[90dvh] w-full max-w-4xl overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-3.5 backdrop-blur md:px-6 md:py-4">
              <div>
                <h2 id="help-dialog-title" className="font-mono text-lg font-semibold text-foreground">
                  Guida EclipseJournal
                </h2>
                <p className="mt-1 max-w-xl font-sans text-xs text-muted-foreground sm:text-sm">
                  Una guida rapida per capire conti, calendario, trade, analisi, backup e profilo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="rounded-md border border-border bg-background px-3 py-1.5 font-mono text-xs text-muted-foreground transition hover:border-profit/50 hover:text-foreground"
              >
                Chiudi
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 md:p-6">
              <section className="rounded-[14px] border border-profit/30 bg-profit/5 p-4 md:col-span-2">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-sans text-sm font-bold text-foreground">
                      Tutorial
                    </h3>
                    <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
                      Fai un tour rapido dell’app con dati demo temporanei. I tuoi dati reali non vengono modificati.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRestartTutorial}
                    className="shrink-0 rounded-lg border border-profit/30 bg-profit/10 px-3 py-2 font-sans text-xs font-semibold text-profit transition hover:border-profit/60 hover:bg-profit/15"
                  >
                    Riavvia tutorial
                  </button>
                </div>
              </section>

              <section className="rounded-[14px] border border-violet-400/30 bg-violet-500/[0.06] p-4 md:col-span-2">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-sans text-sm font-bold text-foreground">
                      EclipseJournal v0.6 — Conti, Import e backup
                    </h3>
                    <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
                      Scopri il nuovo flusso Import/Export per pagina, il backup preventivo e le note durante la creazione dei conti.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenWhatsNewFromHelp}
                    className="shrink-0 rounded-lg border border-violet-300/30 bg-violet-300/10 px-3 py-2 font-sans text-xs font-semibold text-violet-100 transition hover:border-violet-200/50 hover:bg-violet-300/15"
                  >
                    Visualizza novità
                  </button>
                </div>
              </section>

              {[
                {
                  icon: '📅',
                  title: 'Calendario P/L',
                  description: 'Segui l’andamento delle tue giornate operative in modo semplice e visivo.',
                  bullets: [
                    'Clicca su un giorno per aggiungere o modificare i trade.',
                    'Verde indica una giornata positiva, rosso una giornata negativa.',
                    'Il numero in basso mostra quanti trade hai inserito.',
                    'La stella indica il tuo giorno preferito o più importante.',
                  ],
                },
                {
                  icon: '👤',
                  title: 'Spazi di Lavoro',
                  description: 'Crea e organizza conti separati senza mischiare dati e analisi.',
                  bullets: [
                    'Personale è il tuo journal principale.',
                    'Puoi aggiungere conti, sessioni Backtest e spazi Preview.',
                    'Durante la creazione puoi aggiungere una nota facoltativa con obiettivi o regole.',
                    'Ogni spazio conserva separatamente trade, calendario e statistiche.',
                  ],
                },
                {
                  icon: '➕',
                  title: 'Nuovo trade',
                  description: 'Registra tutti i dettagli importanti di ogni operazione.',
                  bullets: [
                    'Inserisci P&L, simbolo, direzione, orario e setup.',
                    'Aggiungi note per ricordare cosa è successo nel trade.',
                    'Salva link TradingView, Google Drive o altri servizi cloud.',
                    'Usa la stella per segnare i trade più importanti.',
                  ],
                },
                {
                  icon: '📸',
                  title: 'Trade Recap Card',
                  description: 'Crea una card visiva del singolo trade, pronta da salvare o condividere.',
                  bullets: [
                    'Mostra P&L, asset, direzione, orario, setup e data.',
                    'Puoi copiarla negli appunti.',
                    'Puoi scaricarla come immagine.',
                    'È pensata per recap personali, social e journaling visivo.',
                  ],
                },
                {
                  icon: '🧠',
                  title: 'Tags e note',
                  description: 'Organizza meglio i trade e rendi più facile la review.',
                  bullets: [
                    'Usa tag rapidi o crea tag personalizzati.',
                    'Scrivi cosa hai fatto bene, cosa migliorare e cosa hai imparato.',
                    'Le note ti aiutano a riconoscere errori e pattern ricorrenti.',
                    'Tag e note vengono inclusi nel backup.',
                  ],
                },
                {
                  icon: '🙈',
                  title: 'Modalità Streamer',
                  description: 'Nasconde i valori economici quando condividi lo schermo o registri contenuti.',
                  bullets: [
                    'Sostituisce profitti e perdite visibili con valori nascosti.',
                    'Utile per video, live, call e condivisioni pubbliche.',
                    'I dati reali restano salvati normalmente.',
                    'Puoi attivarla o disattivarla quando vuoi.',
                  ],
                },
                {
                  icon: '📊',
                  title: 'Profilo trader',
                  description: 'Tieni traccia dei tuoi progressi e della tua identità da trader.',
                  bullets: [
                    'Visualizza livello, rank e statistiche principali.',
                    'Personalizza nome, stile e informazioni del profilo.',
                    'Segui la crescita del tuo journal nel tempo.',
                    'Usa la player card per avere una panoramica rapida.',
                  ],
                },
                {
                  icon: '📈',
                  title: 'Analisi',
                  description: 'Approfondisci performance, abitudini e qualità operativa.',
                  bullets: [
                    'Esplora grafici chiari e coerenti con il tema dell’app.',
                    'Clicca sui grafici per aprire i trade filtrati.',
                    'Analizza setup, direzione, performance e distribuzione.',
                    'Usa Execution Map ed Eclipse Score per leggere meglio il journal.',
                  ],
                },
                {
                  icon: '📥',
                  title: 'Import / Export',
                  description: 'Gestisci i dati della pagina aperta in modo semplice e sicuro.',
                  bullets: [
                    'Import ed Export lavorano sempre sulla pagina attualmente aperta.',
                    'Export scarica il file JSON del conto, Backtest o Preview corrente.',
                    'Import permette di aggiungere i dati oppure sovrascrivere quelli presenti.',
                    'Se ci sono già dati, la card viola consente di scaricare prima una copia di sicurezza.',
                    'Il backup salva trade, note, setup, tag, piani e link.',
                  ],
                },
                {
                  icon: '⚠️',
                  title: 'Backup e sicurezza',
                  description: 'Proteggi i tuoi dati prima di fare modifiche importanti.',
                  bullets: [
                    'Esporta periodicamente un backup JSON.',
                    'Prima di importare, usa “Scarica i dati attuali” per salvare la pagina aperta.',
                    'L’import non modifica gli altri conti o spazi di lavoro.',
                    'Le azioni delicate mostrano messaggi di conferma.',
                    'I dati restano nel browser finché non li cancelli o resetti manualmente.',
                  ],
                  danger: true,
                },
              ].map(section => (
                <section
                  key={section.title}
                  className={`rounded-[14px] border p-4 ${
                    section.danger
                      ? 'border-loss/30 bg-loss/5'
                      : 'border-border bg-background/35'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border text-lg leading-none ${
                        section.danger
                          ? 'border-loss/30 bg-loss/10'
                          : 'border-border bg-secondary/45'
                      }`}
                      aria-hidden="true"
                    >
                      {section.icon}
                    </div>

                    <div className="min-w-0">
                      <h3
                        className={`font-sans text-sm font-bold ${
                          section.danger ? 'text-loss' : 'text-foreground'
                        }`}
                      >
                        {section.title}
                      </h3>
                      <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                  </div>

                  <ul className="mt-3 space-y-1.5 border-t border-border/70 pt-3">
                    {section.bullets.map(bullet => (
                      <li
                        key={bullet}
                        className="flex gap-2 font-sans text-xs leading-relaxed text-muted-foreground"
                      >
                        <span
                          className={section.danger ? 'text-loss' : 'text-profit'}
                          aria-hidden="true"
                        >
                          •
                        </span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}

      <WhatsNewDialog
        open={isWhatsNewOpen}
        onOpenChange={setIsWhatsNewOpen}
      />

      <TutorialWelcomeDialog
        open={isTutorialWelcomeOpen}
        onStart={handleStartTutorial}
        onSkip={closeTutorial}
      />

      <TutorialTour
        active={isTutorialActive}
        stepIndex={tutorialStepIndex}
        onNext={handleTutorialNext}
        onSkip={closeTutorial}
      />

      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <StreamerModeProvider>
      <AppContent />
    </StreamerModeProvider>
  );
}
