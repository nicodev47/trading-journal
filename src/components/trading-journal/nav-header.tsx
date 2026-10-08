'use client';

import { Moon, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import { AccountSelector } from './account-selector';
import type {
  JournalWorkspace,
  JournalWorkspaceGroup,
  JournalWorkspaceMeta,
} from '@/hooks/use-trades';

type ActiveView = 'calendar' | 'monthly';

interface NavHeaderProps {
  activeView: ActiveView;
  pinnedForTutorial?: boolean;
  onViewChange: (view: ActiveView) => void;
  onHelpClick: () => void;
  onProfileClick: () => void;
  activeWorkspace: JournalWorkspace;
  workspaces: JournalWorkspaceMeta[];
  showPreviewWorkspace: boolean;
  maxCustomWorkspaces: number;
  onWorkspaceChange: (workspace: JournalWorkspace) => void;
  onCreateWorkspace: (
    name: string,
    group?: JournalWorkspaceGroup,
    notes?: string
  ) => { success: boolean; error?: string; workspace?: JournalWorkspaceMeta };
  onUpdateWorkspace: (
    workspace: JournalWorkspace,
    name: string,
    notes: string
  ) => { success: boolean; error?: string; workspace?: JournalWorkspaceMeta };
  onBackupWorkspace: (workspace: JournalWorkspace) => void;
  onDeleteWorkspace: (workspace: JournalWorkspace) => boolean;
  previewLabel?: string;
  onExitPreview?: () => void;
  legacyPreviewWorkspaceIds?: string[];
}

export function NavHeader({
  activeView,
  pinnedForTutorial = false,
  onViewChange,
  onHelpClick,
  onProfileClick,
  activeWorkspace,
  workspaces,
  showPreviewWorkspace,
  maxCustomWorkspaces,
  onWorkspaceChange,
  onCreateWorkspace,
  onUpdateWorkspace,
  onBackupWorkspace,
  onDeleteWorkspace,
  previewLabel,
  onExitPreview,
  legacyPreviewWorkspaceIds,
}: NavHeaderProps) {
  const { streamerMode } = useStreamerMode();

  return (
    <>
      {pinnedForTutorial && <div className="h-[53px] max-md:h-[82px]" />}
      <header
        data-tutorial-navbar="true"
        className={cn(
          'z-40 border-b border-border bg-background/70 px-4 py-2.5 backdrop-blur-xl max-md:px-3.5 max-md:py-2',
          pinnedForTutorial
            ? 'fixed inset-x-0 top-0'
            : 'sticky top-0'
        )}
      >
        <div className="grid min-h-9 w-full grid-cols-[1fr_auto_1fr] items-center gap-2 max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-y-2">
        <div className="flex min-w-0 items-center gap-2 justify-self-start max-md:col-span-2 max-md:w-full max-md:gap-1.5 max-md:pr-[4.75rem]">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <Moon className="size-4 text-foreground" />
          </div>

          <span className="min-w-0 truncate font-sans text-base font-semibold tracking-tight max-md:text-[15px] max-[360px]:text-sm">
            EclipseJournal
          </span>

          <AccountSelector
            activeWorkspace={activeWorkspace}
            workspaces={workspaces}
            showPreviewWorkspace={showPreviewWorkspace}
            maxCustomWorkspaces={maxCustomWorkspaces}
            onWorkspaceChange={onWorkspaceChange}
            onCreateWorkspace={onCreateWorkspace}
            onUpdateWorkspace={onUpdateWorkspace}
            onBackupWorkspace={onBackupWorkspace}
            onDeleteWorkspace={onDeleteWorkspace}
            previewLabel={previewLabel}
            onExitPreview={onExitPreview}
            legacyPreviewWorkspaceIds={legacyPreviewWorkspaceIds}
          />
        </div>

        <nav className="ej-scrollbar flex items-center justify-center gap-1 justify-self-center rounded-full border border-border bg-white/[0.04] p-1 max-md:col-span-2 max-md:w-full max-md:gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 gap-2 whitespace-nowrap rounded-full px-4 font-sans text-xs font-medium max-md:h-9 max-md:flex-1 max-md:px-2',
              activeView === 'calendar' ? 'bg-white/12 text-white hover:bg-white/15' : 'text-muted-foreground'
            )}
            onClick={() => onViewChange('calendar')}
          >
            <span>🗓️</span>
            Calendario
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-tutorial="analysis-tab"
            className={cn(
              'h-8 gap-2 whitespace-nowrap rounded-full px-4 font-sans text-xs font-medium max-md:h-9 max-md:flex-1 max-md:px-2',
              activeView === 'monthly' ? 'bg-white/12 text-white hover:bg-white/15' : 'text-muted-foreground'
            )}
            onClick={() => onViewChange('monthly')}
          >
            <span>📈</span>
            Analisi
          </Button>
        </nav>

        <div className="flex items-center gap-2 justify-self-end max-md:absolute max-md:right-3.5 max-md:top-2 max-md:gap-1.5">
          {streamerMode && (
            <div
              className="flex h-8 min-w-8 items-center justify-center rounded-full border border-violet-400/45 bg-violet-500/15 px-2 text-sm"
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
            data-tutorial="profile-button"
            className="size-8 rounded-full border-border bg-white/[0.04] text-muted-foreground transition-colors hover:bg-white/8 hover:text-white"
            onClick={onProfileClick}
            aria-label="Apri profilo trader"
          >
            <UserRound className="size-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            data-tutorial="help-button"
            className="h-8 gap-2 rounded-full border-border bg-white/[0.04] px-3 font-sans text-xs font-medium text-muted-foreground transition-colors hover:bg-white/8 hover:text-white max-md:px-2"
            onClick={onHelpClick}
          >
            <span>💡</span>
            <span className="max-[390px]:sr-only">Help</span>
          </Button>
        </div>
        </div>
      </header>
    </>
  );
}
