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

export default function App() {
 const [activeWorkspace, setActiveWorkspace] = useState<JournalWorkspace>('personal');
const [activeView, setActiveView] = useState<'calendar' | 'monthly'>('calendar');
const [isHelpOpen, setIsHelpOpen] = useState(false);
const [privacyMode, setPrivacyMode] = useState(false);

  const {
    trades,
    strategies,
    weeklyPlans,
    isLoaded,
    addTrade,
    deleteTrade,
    addStrategy,
    removeStrategy,
    saveWeeklyPlan,
    getWeeklyPlan,
    exportData,
    importData,
    clearAllData,
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

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="font-mono text-sm text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavHeader
  activeView={activeView}
  onViewChange={setActiveView}
  onHelpClick={() => setIsHelpOpen(true)}
  
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
          onAddStrategy={addStrategy}
          onRemoveStrategy={removeStrategy}
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
        exportData={importExportMode === 'export' ? exportData() : undefined}
        onImport={importExportMode === 'import' ? importData : undefined}
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
          <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl md:p-6">
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 id="help-dialog-title" className="font-mono text-lg font-semibold text-foreground">
                  Guida EclipseJournal
                </h2>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  Come usare calendario, journal e import/export.
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

            <div className="space-y-4 font-mono text-sm leading-relaxed text-muted-foreground">
              <section>
                <h3 className="mb-1 font-semibold text-foreground">Calendario P/L</h3>
                <p>
                  Clicca su un giorno per aggiungere uno o più trade. I giorni verdi indicano profitto,
                  quelli rossi perdita. Il numero in basso indica quanti trade sono stati inseriti in quel giorno.
                </p>
              </section>

              <section>
                <h3 className="mb-1 font-semibold text-foreground">Personale / Preview</h3>
                <p>
                  I due ambienti sono separati. Puoi usare Personale per il tuo journal reale e Preview
                  per test, esempi, import o revisioni senza sovrascrivere i dati principali.
                </p>
              </section>

              <section>
                <h3 className="mb-1 font-semibold text-foreground">Importa / Esporta JSON</h3>
                <p>
                  Usa Esporta JSON per creare un backup. Usa Importa JSON, oppure trascina il file JSON
                  nell’area di import, per ripristinare i dati nell’ambiente attivo.
                </p>
              </section>

              <section>
                <h3 className="mb-1 font-semibold text-foreground">Nuovo trade</h3>
                <p>
                  Nel dialog puoi inserire P/L, simbolo, direzione, orario, setup, note e link TradingView.
                  Il campo Name accanto al link TradingView serve a dare un nome leggibile allo screenshot.
                </p>
              </section>

              <section>
                <h3 className="mb-1 font-semibold text-foreground">Analisi mesi</h3>
                <p>
                  La sezione Analisi mesi mostra performance aggregate mese per mese, inclusi P/L,
                  trade totali, winrate, profit factor e curva equity.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}