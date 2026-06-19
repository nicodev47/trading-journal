'use client';

import { Moon, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStreamerMode } from '@/contexts/streamer-mode-context';

type ActiveView = 'calendar' | 'monthly';

interface NavHeaderProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  onHelpClick: () => void;
  onProfileClick: () => void;
}

export function NavHeader({
  activeView,
  onViewChange,
  onHelpClick,
  onProfileClick,
}: NavHeaderProps) {
  const { streamerMode } = useStreamerMode();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 px-3 py-2 backdrop-blur">
      <div className="grid min-h-9 w-full grid-cols-[1fr_auto_1fr] items-center gap-2 max-sm:grid-cols-1 max-sm:gap-2">
        <div className="flex items-center gap-2 justify-self-start">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/20">
            <Moon className="size-4 text-primary" />
          </div>

          <span className="font-mono text-base font-semibold tracking-tight">
            EclipseJournal
          </span>
        </div>

        <nav className="flex items-center justify-center gap-2 justify-self-center max-sm:w-full max-sm:justify-start max-sm:overflow-x-auto max-sm:pr-20">
          <Button
            type="button"
            variant={activeView === 'calendar' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-8 gap-2 whitespace-nowrap rounded-lg font-sans text-xs font-semibold max-sm:shrink-0',
              activeView !== 'calendar' && 'hover:bg-secondary'
            )}
            onClick={() => onViewChange('calendar')}
          >
            <span>🗓️</span>
            Calendario
          </Button>

          <Button
            type="button"
            variant={activeView === 'monthly' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-8 gap-2 whitespace-nowrap rounded-lg font-sans text-xs font-semibold max-sm:shrink-0',
              activeView !== 'monthly' && 'hover:bg-secondary'
            )}
            onClick={() => onViewChange('monthly')}
          >
            <span>📈</span>
            Analisi
          </Button>
        </nav>

        <div className="flex items-center gap-2 justify-self-end max-sm:absolute max-sm:right-3 max-sm:top-2">
          {streamerMode && (
            <div
              className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-violet-400/45 bg-violet-500/15 px-2 text-sm"
              aria-label="Modalità streamer attiva"
              title="Modalità streamer attiva"
            >
              🙈
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-lg border-border bg-background/50 text-muted-foreground transition-colors hover:bg-white/8 hover:text-white"
            onClick={onProfileClick}
            aria-label="Apri profilo trader"
          >
            <UserRound className="size-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-2 rounded-lg border-border bg-background/50 px-3 font-sans text-xs font-medium text-muted-foreground transition-colors hover:bg-white/8 hover:text-white max-sm:px-2"
            onClick={onHelpClick}
          >
            <span>💡</span>
            <span className="max-[390px]:sr-only">Help</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
