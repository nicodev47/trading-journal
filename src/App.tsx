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
import { useTrades, type JournalWorkspace } from '@/hooks/use-trades';
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
import type { Trade } from '@/lib/types/trade';
import { AdvancedStatsGrid } from '@/components/trading-journal/advanced-stats-grid';
import { ProfileDialog } from '@/components/trading-journal/profile-dialog';
import { toast } from 'sonner';
import { StreamerModeProvider } from '@/contexts/streamer-mode-context';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import { WhatsNewDialog } from '@/components/trading-journal/whats-new-dialog';
import { Download, RotateCcw } from 'lucide-react';
import {
  getDefaultExportBaseName,
  normalizeExportFileName,
} from '@/lib/export-filename';

const UPDATE_BANNER_KEY =
  'dismissedUpdateBanner_eclipsejournal_v02';
const BACKTEST_STORAGE_KEY = 'eclipse-trading-journal-data-backtest';

type TradeGroupDialogState = {
  title: string;
  subtitle?: string;
  trades: Trade[];
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
    strategies,
    customTags,
    weeklyPlans,
    isLoaded,
    addTrade,
    deleteTrade,
    addStrategy,
    removeStrategy,
    addCustomTag,
    removeCustomTag,
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
  const [importExportMode, setImportExportMode] = useState<'import' | 'export' | 'append' | null>(null);
  const showBacktestResetButton = activeWorkspace === 'backtest' && backtestHasData;

  useEffect(() => {
    setBacktestHasData(getBacktestHasData());
    setBacktestHasTrades(getBacktestHasTrades());
  }, [activeWorkspace, trades, strategies, weeklyPlans, customTags, missedTrades]);

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
  };

  const handleWeekPlanClick = (weekKey: string, weekLabel: string) => {
    setSelectedWeek({ weekKey, weekLabel });
  };

  const handleSaveDayTrades = (dayTrades: Trade[]) => {
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
    setSelectedDate(null);
    setSelectedWeek(null);
    setImportExportMode(null);
    setIsResetPreviewConfirmOpen(false);
    setIsBacktestResetDialogOpen(false);
    setBacktestHasData(getBacktestHasData());
    setBacktestHasTrades(getBacktestHasTrades());
    setActiveWorkspace(workspace);
  };

  const handleImportData = (data: string, workspace: JournalWorkspace) => {
    const success = importData(data, workspace);

    if (success) {
      if (workspace === 'backtest') {
        setBacktestHasData(getBacktestHasData());
        setBacktestHasTrades(getBacktestHasTrades());
      }

      handleWorkspaceChange(workspace);
    }

    return success;
  };

  const handleAppendImportData = (data: string, workspace: JournalWorkspace) => {
    const success = appendImportData(data, workspace);

    if (success) {
      if (workspace === 'backtest') {
        setBacktestHasData(getBacktestHasData());
        setBacktestHasTrades(getBacktestHasTrades());
      }

      handleWorkspaceChange(workspace);
    }

    return success;
  };

  const handleResetStudentJournal = () => {
    if (activeWorkspace !== 'student') return;

    setIsResetPreviewConfirmOpen(true);
  };

  const confirmResetPreview = () => {
    if (activeWorkspace !== 'student') {
      setIsResetPreviewConfirmOpen(false);
      return;
    }

    setSelectedDate(null);
    setSelectedWeek(null);
    setImportExportMode(null);
    clearAllData();
    setIsResetPreviewConfirmOpen(false);
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
    setPersonalProfileTrades(getWorkspaceData('personal').trades);
    setIsProfileOpen(true);
  };

  const handleClearPersonal = () => {
    clearWorkspaceData('personal');
    setPersonalProfileTrades([]);
    toast.success('Journal Personale svuotato');
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
          <div className="relative flex min-h-11 w-full items-center justify-center px-11 py-2 sm:px-14">
            <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center">
              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold text-violet-100 sm:text-sm">
                  EclipseJournal v0.2 è disponibile
                </p>
                <p className="hidden font-sans text-[11px] text-violet-200/75 lg:block">
                  Share card, Backtest, Execution Map e Analisi interattiva sono ora disponibili.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWhatsNewOpen(true)}
                className="shrink-0 rounded-lg border border-violet-300/25 bg-violet-300/10 px-3 py-1.5 font-sans text-xs font-semibold text-violet-100 transition hover:border-violet-200/50 hover:bg-violet-300/15"
              >
                Visualizza novità
              </button>
            </div>
            <button
              type="button"
              onClick={handleDismissUpdateBanner}
              className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-base text-violet-200/70 transition hover:bg-white/10 hover:text-white sm:right-4"
              aria-label="Chiudi annuncio aggiornamento"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <NavHeader
  activeView={activeView}
  onViewChange={setActiveView}
  onHelpClick={() => setIsHelpOpen(true)}
  onProfileClick={handleOpenProfile}
  
/>

      <main className="mx-auto w-full max-w-6xl flex-1 overflow-x-hidden px-3 py-3 sm:px-4">
        {activeView === 'calendar' ? (
          <>
          <>
  <StatsGrid trades={trades} />

  <TradingCalendar
    trades={trades}
    weeklyPlans={weeklyPlans}
    activeWorkspace={activeWorkspace}
    showResetButton={showBacktestResetButton}
    hasBacktestTrades={backtestHasTrades}
    onWorkspaceChange={handleWorkspaceChange}
    onResetStudentJournal={handleResetStudentJournal}
    onResetBacktestJournal={() => setIsBacktestResetDialogOpen(true)}
    onDayClick={handleDayClick}
    onWeekPlanClick={handleWeekPlanClick}
    onImport={() => setImportExportMode('import')}
    onAppendImport={() => setImportExportMode('append')}
    onExport={() => setImportExportMode('export')}
  />

  <AdvancedStatsGrid trades={trades} />

  <div className="pb-6 pt-4">
    <EquityCurve
      trades={trades}
      onOpenTradeGroup={handleOpenTradeGroup}
    />
  </div>
</>
          </>
        ) : (
          <MonthlyAnalysis
            trades={trades}
          />
        )}
      </main>

      <footer className="border-t border-border bg-card py-4">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <span className="font-mono text-xs text-muted-foreground">
            Powered by{' '}
            <a
              href="https://www.youtube.com/@eclipsetradingclub"
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
          onClose={handleCloseDayEditor}
          date={selectedDate}
          existingTrades={getTradesByDate(selectedDate)}
          onSave={handleSaveDayTrades}
          onDeleteDay={handleDeleteDay}
          strategies={strategies}
          customTags={customTags}
          onAddStrategy={addStrategy}
          onRemoveStrategy={removeStrategy}
          onAddCustomTag={addCustomTag}
          onRemoveCustomTag={removeCustomTag}
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
        importStrategy={importExportMode === 'append' ? 'append' : 'replace'}
        activeWorkspace={activeWorkspace}
        exportData={importExportMode === 'export' ? exportData() : undefined}
        exportTrades={trades}
        onImport={
          importExportMode === 'append'
            ? handleAppendImportData
            : importExportMode === 'import'
              ? handleImportData
              : undefined
        }
      />

      <ProfileDialog
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        trades={personalProfileTrades}
        onClearPersonal={handleClearPersonal}
      />

      <Dialog
        open={isResetPreviewConfirmOpen}
        onOpenChange={setIsResetPreviewConfirmOpen}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-border bg-background shadow-xl">
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
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[520px] overflow-hidden rounded-2xl border border-border bg-card p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
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

          <div className="px-5 py-5">
            <div className="rounded-xl border border-loss/30 bg-loss/10 p-4">
              <p className="font-sans text-sm leading-relaxed text-foreground">
                Questa azione cancellerà trade, strategie e piani salvati nel Backtest.
                Il journal Personale e Preview non verranno modificati.
                Consigliato: scarica un backup prima di procedere.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 border-t border-border bg-background/25 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="ej-scrollbar max-h-[88vh] w-full max-w-4xl overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-card/95 px-5 py-4 backdrop-blur md:px-6">
              <div>
                <h2 id="help-dialog-title" className="font-mono text-lg font-semibold text-foreground">
                  Guida EclipseJournal
                </h2>
                <p className="mt-1 max-w-xl font-sans text-xs text-muted-foreground sm:text-sm">
                  Tutto quello che ti serve per usare calendario, journal, profilo e backup.
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

            <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 md:p-6">
              <section className="rounded-[14px] border border-violet-400/30 bg-violet-500/[0.06] p-4 md:col-span-2">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-sans text-sm font-bold text-foreground">
                      Nuova versione — Share, Backtest & Analytics
                    </h3>
                    <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
                      EclipseJournal introduce la condivisione social dei trade, la sezione Backtest nel calendario, una nuova Analisi ridisegnata e messaggi di sicurezza per le azioni critiche.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenWhatsNewFromHelp}
                    className="shrink-0 rounded-lg border border-violet-300/30 bg-violet-300/10 px-3 py-2 font-sans text-xs font-semibold text-violet-100 transition hover:border-violet-200/50 hover:bg-violet-300/15"
                  >
                    Visualizza novità di questo aggiornamento
                  </button>
                </div>
              </section>

              {[
                {
                  icon: '📅',
                  title: 'Calendario P/L',
                  description: 'Registra e riconosci subito l’andamento di ogni giornata.',
                  bullets: [
                    'Clicca un giorno per aggiungere o modificare trade.',
                    'Verde positivo, rosso negativo.',
                    'Numero in basso = trade inseriti; ⭐️ = preferito.',
                    'Usa Backtest per testare strategie separatamente dal journal reale.',
                  ],
                },
                {
                  icon: '👤',
                  title: 'Personale / Backtest / Preview',
                  description: 'Tre ambienti distinti per lavorare senza sovrascrivere dati.',
                  bullets: [
                    'Personale è il journal reale.',
                    'Backtest è dedicato ai test strategici nel calendario.',
                    'Preview serve per prove, revisioni e import temporanei.',
                    'I tre archivi restano separati.',
                  ],
                },
                {
                  icon: '➕',
                  title: 'Nuovo trade',
                  description: 'Raccogli in un unico posto tutti i dettagli operativi.',
                  bullets: [
                    'Inserisci P&L, simbolo, direzione, orario e setup.',
                    'Aggiungi link TradingView / Google Drive.',
                    'Usa ⭐️ per marcare i trade importanti.',
                    'Usa Share per generare una card da condividere sui social.',
                  ],
                },
                {
                  icon: '📸',
                  title: 'Trade Recap Card',
                  description: 'Crea una card visiva del singolo trade da condividere.',
                  bullets: [
                    'Genera una card con P&L, asset, direzione, orario e setup.',
                    'Usa Copy to Clipboard per copiare l’immagine.',
                    'Usa Save as Image per scaricarla.',
                    'Pensata per social, recap personali e journaling visivo.',
                  ],
                },
                {
                  icon: '🧠',
                  title: 'Tags e note',
                  description: 'Trasforma ogni trade in materiale utile per migliorare.',
                  bullets: [
                    'Seleziona tag rapidi o crea tag personalizzati.',
                    'Scrivi note chiare sulla tua esecuzione.',
                    'Usa tag e note per riconoscere pattern ricorrenti.',
                    'Le note restano salvate nel backup.',
                  ],
                },
                {
                  icon: '🙈',
                  title: 'Modalità Streamer',
                  description: 'Proteggi i valori economici durante contenuti pubblici.',
                  bullets: [
                    'Sostituisce profitti e perdite visibili con ******.',
                    'È utile per live, video, screenshot e condivisioni.',
                    'I valori reali restano salvati e non vengono cancellati.',
                  ],
                },
                {
                  icon: '📊',
                  title: 'Profilo trader',
                  description: 'Segui i progressi con una player card personale.',
                  bullets: [
                    'Visualizza livello, XP e statistiche.',
                    'Il livello cresce con i trade inseriti.',
                    'Share scarica una PNG del profilo trader.',
                    'La PNG rispetta la Modalità Streamer.',
                  ],
                },
                {
                  icon: '📈',
                  title: 'Analisi',
                  description: 'Leggi performance, abitudini, edge e qualità operativa.',
                  bullets: [
                    'Esplora grafici cliccabili e più coerenti con il tema dell’app.',
                    'Analizza setup breakdown, Long vs Short ed Execution Map.',
                    'Monitora Eclipse Score, winrate, profit factor, frequenza e timing.',
                    'Usa Feedback & Insights per individuare pattern e aree di miglioramento.',
                  ],
                },
                {
                  icon: '📥',
                  title: 'Import / Export',
                  description: 'Crea backup e ripristina i dati dove preferisci.',
                  bullets: [
                    'Esporta il journal in formato JSON.',
                    'Il backup salva dati e link, non incorpora immagini.',
                    'Importa in Personale, Backtest oppure Preview.',
                    'Prima di importare, EclipseJournal mostra un messaggio di sicurezza.',
                  ],
                },
                {
                  icon: '⚠️',
                  title: 'Zona pericolosa',
                  description: 'Le azioni irreversibili sono protette da conferme.',
                  bullets: [
                    'Prima di cancellare un trade viene mostrato un messaggio di sicurezza.',
                    'Prima di importare dati viene richiesta conferma.',
                    'La cancellazione è protetta per evitare errori accidentali.',
                    'Esporta sempre un backup prima di azioni importanti.',
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
