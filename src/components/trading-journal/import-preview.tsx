import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileAvatar } from '@/components/preferences/profile-fields';
import { PreferencesOverrideProvider, usePreferences } from '@/contexts/preferences-context';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import { parseImportedJournal } from '@/hooks/use-trades';
import { extractImportedPreferences } from '@/lib/import-preferences';
import type { Trade } from '@/lib/types/trade';
import { AdvancedStatsGrid } from './advanced-stats-grid';
import { EquityCurve } from './equity-curve';
import { MonthlyAnalysis } from './monthly-analysis';
import { StatsGrid } from './stats-grid';
import { TradeDetailDialog } from './trade-detail-dialog';
import { TradeGroupDetailDialog } from './trade-group-detail-dialog';
import { TradingCalendar } from './trading-calendar';

interface ImportPreviewProps {
  data: string;
  fileName: string;
  onClose: () => void;
}

type GroupDialog = { title: string; subtitle?: string; trades: Trade[] };

const noop = () => {};

const formatDay = (dateKey: string) => {
  const date = new Date(`${dateKey}T12:00:00`);

  return Number.isNaN(date.getTime())
    ? dateKey
    : date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
};

const getTradeDay = (trade: Trade) =>
  (trade.exitDate || trade.entryDate || '').split('T')[0];

function PreviewContent({ data, fileName, onClose }: ImportPreviewProps) {
  const { preferences } = usePreferences();
  const { streamerMode } = useStreamerMode();
  const journal = useMemo(() => parseImportedJournal(data), [data]);
  const [view, setView] = useState<'calendar' | 'analysis'>('calendar');
  const [group, setGroup] = useState<GroupDialog | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [returnToGroup, setReturnToGroup] = useState(false);

  if (!journal) return null;

  const openGroup = (payload: GroupDialog) => {
    if (payload.trades.length === 0) return;

    setGroup(payload);
    setReturnToGroup(false);
  };

  return (
    <div className="fixed inset-0 z-[45] flex flex-col overflow-y-auto bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          <ProfileAvatar
            name={preferences.name}
            photo={preferences.photo}
            className="size-10 text-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {preferences.name || 'Journal importato'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Preview di sola lettura · {fileName}
            </p>
          </div>

          <div className="hidden gap-1 rounded-full bg-secondary p-1 sm:flex">
            {(['calendar', 'analysis'] as const).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  view === item
                    ? 'bg-white/10 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item === 'calendar' ? 'Calendario' : 'Analisi'}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Chiudi preview"
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="mx-auto mt-3 flex w-full max-w-6xl gap-1 rounded-full bg-secondary p-1 sm:hidden">
          {(['calendar', 'analysis'] as const).map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={`flex-1 rounded-full px-4 py-1.5 text-xs font-medium transition ${
                view === item ? 'bg-white/10 text-foreground' : 'text-muted-foreground'
              }`}
            >
              {item === 'calendar' ? 'Calendario' : 'Analisi'}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 overflow-x-hidden px-3.5 py-2.5 sm:px-4 sm:py-3">
        {view === 'calendar' ? (
          <>
            <StatsGrid trades={journal.trades} />
            <TradingCalendar
              readOnly
              trades={journal.trades}
              weeklyPlans={journal.weeklyPlans}
              activeWorkspace="personal"
              onResetStudentJournal={noop}
              onDayClick={date =>
                openGroup({
                  title: formatDay(date),
                  trades: journal.trades.filter(trade => getTradeDay(trade) === date),
                })
              }
              onWeekPlanClick={noop}
              onImport={noop}
              onExport={noop}
            />
            <AdvancedStatsGrid trades={journal.trades} />
            <div className="pb-5 pt-3 sm:pb-6 sm:pt-4">
              <EquityCurve trades={journal.trades} onOpenTradeGroup={openGroup} />
            </div>
          </>
        ) : (
          <MonthlyAnalysis
            trades={journal.trades}
            tagColors={journal.tagColors}
            onUpdateTrade={noop}
          />
        )}
      </main>

      <TradeDetailDialog
        trade={selectedTrade}
        streamerMode={streamerMode}
        onClose={() => {
          setSelectedTrade(null);
          setGroup(null);
          setReturnToGroup(false);
        }}
        showBackButton={returnToGroup}
        onBack={() => setSelectedTrade(null)}
      />
      <TradeGroupDetailDialog
        open={Boolean(group) && !selectedTrade}
        onOpenChange={open => {
          if (!open) setGroup(null);
        }}
        title={group?.title ?? ''}
        subtitle={group?.subtitle}
        trades={group?.trades ?? []}
        onOpenTrade={trade => {
          setSelectedTrade(trade);
          setReturnToGroup(true);
        }}
      />
    </div>
  );
}

/** Read-only view of an exported journal, with the exporter's own preferences. */
export function ImportPreview(props: ImportPreviewProps) {
  const { preferences: own } = usePreferences();
  const imported = useMemo(() => extractImportedPreferences(props.data), [props.data]);

  return (
    <PreferencesOverrideProvider preferences={imported ?? own}>
      <PreviewContent {...props} />
    </PreferencesOverrideProvider>
  );
}
