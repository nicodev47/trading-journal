import { useState, useCallback } from 'react';
import { NavHeader } from '@/components/trading-journal/nav-header';
import { TradingCalendar } from '@/components/trading-journal/trading-calendar';
import { StatsGrid } from '@/components/trading-journal/stats-grid';
import { EquityCurve } from '@/components/trading-journal/equity-curve';
import { MonthlyAnalysis } from '@/components/trading-journal/monthly-analysis';
import { DayEditorDialog } from '@/components/trading-journal/day-editor-dialog';
import { WeeklyPlanDialog, type WeeklyPlanData } from '@/components/trading-journal/weekly-plan-dialog';
import { ImportExportDialog } from '@/components/trading-journal/import-export-dialog';
import { useTrades, type JournalWorkspace } from '@/hooks/use-trades';
import { Toaster } from '@/components/ui/sonner';
import type { Trade } from '@/lib/types/trade';
import { AdvancedStatsGrid } from '@/components/trading-journal/advanced-stats-grid';
import { ProfileDialog } from '@/components/trading-journal/profile-dialog';
import { toast } from 'sonner';
import { StreamerModeProvider } from '@/contexts/streamer-mode-context';
import { WhatsNewDialog } from '@/components/trading-journal/whats-new-dialog';

const UPDATE_BANNER_KEY = 'dismissedUpdateBanner_v0_1';

function AppContent() {
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
const [personalProfileTrades, setPersonalProfileTrades] = useState<Trade[]>([]);
const [privacyMode, setPrivacyMode] = useState(false);

  const {
    trades,
    strategies,
    customMistakes,
    weeklyPlans,
    isLoaded,
    addTrade,
    deleteTrade,
    addStrategy,
    removeStrategy,
    addCustomMistake,
    removeCustomMistake,
    saveWeeklyPlan,
    getWeeklyPlan,
    exportData,
    importData,
    clearAllData,
    getWorkspaceData,
    clearWorkspaceData,
    getTradesByDate,
  } = useTrades(activeWorkspace);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<{ weekKey: string; weekLabel: string } | null>(null);
  const [importExportMode, setImportExportMode] = useState<'import' | 'export' | null>(null);

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
  };

  const handleWeekPlanClick = (weekKey: string, weekLabel: string) => {
    setSelectedWeek({ weekKey, weekLabel });
  };

  const handleEquityPointClick = (date: string) => {
    setSelectedDate(date);
  };

  const handleSaveDayTrades = (dayTrades: Trade[]) => {
    const existingTrades = selectedDate ? getTradesByDate(selectedDate) : [];
    existingTrades.forEach((trade) => deleteTrade(trade.id));

    dayTrades.forEach((trade) => {
      addTrade(trade);
    });
  };

  const handleDeleteDay = () => {
    if (selectedDate) {
      const existingTrades = getTradesByDate(selectedDate);
      existingTrades.forEach((trade) => deleteTrade(trade.id));
      setSelectedDate(null);
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
  }, [saveWeeklyPlan]);

  const handleWorkspaceChange = (workspace: JournalWorkspace) => {
    setSelectedDate(null);
    setSelectedWeek(null);
    setImportExportMode(null);
    setActiveWorkspace(workspace);
  };

  const handleImportData = (data: string, workspace: JournalWorkspace) => {
    const success = importData(data, workspace);

    if (success) {
      handleWorkspaceChange(workspace);
    }

    return success;
  };

  const handleResetStudentJournal = () => {
    if (activeWorkspace !== 'student') return;

    const confirmed = window.confirm(
      'Vuoi davvero resettare la Preview? Questa azione cancella trade, strategie e piani salvati nella Preview.'
    );

    if (!confirmed) return;

    setSelectedDate(null);
    setSelectedWeek(null);
    setImportExportMode(null);
    clearAllData();
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
              <span className="font-mono text-xs font-semibold text-violet-100 sm:text-sm">
                EclipseJournal v0.1 Fuori Ora!
              </span>
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
    onWorkspaceChange={handleWorkspaceChange}
    onResetStudentJournal={handleResetStudentJournal}
    onDayClick={handleDayClick}
    onWeekPlanClick={handleWeekPlanClick}
    onImport={() => setImportExportMode('import')}
    onExport={() => setImportExportMode('export')}
  />

  <AdvancedStatsGrid trades={trades} />

  <div className="pb-6 pt-4">
    <EquityCurve
      trades={trades}
      onPointClick={handleEquityPointClick}
    />
  </div>
</>
          </>
        ) : (
          <MonthlyAnalysis trades={trades} />
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
          customMistakes={customMistakes}
          onAddStrategy={addStrategy}
          onRemoveStrategy={removeStrategy}
          onAddCustomMistake={addCustomMistake}
          onRemoveCustomMistake={removeCustomMistake}
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

      <ImportExportDialog
        isOpen={!!importExportMode}
        onClose={() => setImportExportMode(null)}
        mode={importExportMode || 'export'}
        activeWorkspace={activeWorkspace}
        exportData={importExportMode === 'export' ? exportData() : undefined}
        onImport={importExportMode === 'import' ? handleImportData : undefined}
      />

      <ProfileDialog
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        trades={personalProfileTrades}
        onClearPersonal={handleClearPersonal}
      />

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
          <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
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
                      Novità EclipseJournal v0.1
                    </h3>
                    <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
                      Scopri tutte le funzioni e i miglioramenti inclusi in questo aggiornamento.
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
                  ],
                },
                {
                  icon: '👤',
                  title: 'Personale / Preview',
                  description: 'Due ambienti distinti per lavorare senza sovrascrivere dati.',
                  bullets: [
                    'Personale è il journal reale.',
                    'Preview serve per test e revisioni.',
                    'I due archivi restano separati.',
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
                  ],
                },
                {
                  icon: '🧠',
                  title: 'Errori e note',
                  description: 'Trasforma ogni trade in materiale utile per migliorare.',
                  bullets: [
                    'Seleziona gli errori rapidi.',
                    'Crea e gestisci errori personalizzati.',
                    'Scrivi note chiare sulla tua esecuzione.',
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
                  description: 'Leggi performance, abitudini ed edge del journal.',
                  bullets: [
                    'Consulta Equity, P&L mensile e distribuzione operazioni.',
                    'Analizza setup breakdown, Long vs Short e Trading Radar.',
                    'Usa Feedback & Insights per il coaching automatico.',
                  ],
                },
                {
                  icon: '📥',
                  title: 'Import / Export',
                  description: 'Crea backup e ripristina i dati dove preferisci.',
                  bullets: [
                    'Esporta il journal in formato JSON.',
                    'Importa in Personale oppure Preview.',
                    'Il backup JSON conserva i valori economici reali.',
                    'Prima di condividere un file, verificane sempre il contenuto.',
                  ],
                },
                {
                  icon: '⚠️',
                  title: 'Zona pericolosa',
                  description: 'La cancellazione è protetta per evitare errori.',
                  bullets: [
                    'Svuota personale cancella solo Personale.',
                    'Preview non viene modificata.',
                    'È richiesta la conferma manuale SVUOTA.',
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
