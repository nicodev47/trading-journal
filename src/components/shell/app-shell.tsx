'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  BarChart3,
  BookOpen,
  Building2,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Moon,
  Newspaper,
  PanelLeftClose,
  PanelLeftOpen,
  PlayCircle,
  Target,
  Trophy,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccountSelector } from '@/components/trading-journal/account-selector';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import type {
  JournalWorkspace,
  JournalWorkspaceGroup,
  JournalWorkspaceMeta,
} from '@/hooks/use-trades';
import { cn } from '@/lib/utils';

export type AppView = 'calendar' | 'monthly' | 'strategies' | 'progress' | 'news' | 'propfirm';

interface NavEntry {
  id: string;
  label: string;
  icon: LucideIcon;
  view?: AppView;
  action?: 'profile';
  soon?: boolean;
  tutorial?: string;
}

const MAIN_ENTRIES: NavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, view: 'calendar' },
  { id: 'reports', label: 'Reports', icon: BarChart3, view: 'monthly', tutorial: 'analysis-tab' },
  { id: 'strategies', label: 'Strategies', icon: Target, view: 'strategies' },
  { id: 'progress', label: 'Progress Tracker', icon: Trophy, view: 'progress' },
  { id: 'news', label: 'News', icon: Newspaper, view: 'news' },
  { id: 'propfirm', label: 'Propfirm', icon: Building2, view: 'propfirm' },
];

const SOON_ENTRIES: NavEntry[] = [
  { id: 'notebook', label: 'Notebook', icon: BookOpen, soon: true },
  { id: 'replay', label: 'Trade Replay', icon: PlayCircle, soon: true },
  { id: 'resources', label: 'Resources', icon: GraduationCap, soon: true },
];

const VIEW_TITLES: Record<AppView, string> = {
  calendar: 'Dashboard',
  monthly: 'Reports',
  strategies: 'Strategies',
  progress: 'Progress Tracker',
  news: 'News',
  propfirm: 'Propfirm',
};

const COLLAPSED_KEY = 'eclipse-sidebar-collapsed';

interface AppShellProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  onProfileClick: () => void;
  onHelpClick: () => void;
  pinnedForTutorial?: boolean;
  banner?: ReactNode;
  children: ReactNode;
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

function NavList({
  activeView,
  collapsed,
  onSelect,
}: {
  activeView: AppView;
  collapsed: boolean;
  onSelect: (entry: NavEntry) => void;
}) {
  const renderEntry = (entry: NavEntry) => {
    const Icon = entry.icon;
    const isActive = entry.view !== undefined && entry.view === activeView;

    return (
      <button
        key={entry.id}
        type="button"
        disabled={entry.soon}
        title={collapsed ? entry.label : undefined}
        data-tutorial={entry.tutorial}
        onClick={() => onSelect(entry)}
        className={cn(
          'flex min-h-10 w-full items-center gap-3 rounded-[10px] px-3 text-left font-sans text-[13px] font-medium outline-none transition-colors',
          isActive
            ? 'bg-white/[0.09] text-foreground'
            : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground focus-visible:bg-white/[0.06]',
          entry.soon && 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-muted-foreground',
          collapsed && 'justify-center px-0'
        )}
      >
        <Icon className="size-[18px] shrink-0" />
        {!collapsed && <span className="min-w-0 flex-1 truncate">{entry.label}</span>}
        {!collapsed && entry.soon && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium">
            in arrivo
          </span>
        )}
      </button>
    );
  };

  return (
    <nav className="flex flex-col gap-1">
      {MAIN_ENTRIES.map(renderEntry)}
      <div className="my-2 h-px bg-border" />
      {SOON_ENTRIES.map(renderEntry)}
    </nav>
  );
}

export function AppShell({
  activeView,
  onViewChange,
  onProfileClick,
  onHelpClick,
  pinnedForTutorial = false,
  banner,
  children,
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
}: AppShellProps) {
  const { streamerMode } = useStreamerMode();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, String(collapsed));
    } catch {
      // The preference stays for this session only.
    }
  }, [collapsed]);

  const select = (entry: NavEntry) => {
    if (entry.soon) return;

    setMobileOpen(false);

    if (entry.action === 'profile') {
      onProfileClick();
    } else if (entry.view) {
      onViewChange(entry.view);
    }
  };

  const logo = (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
      <Moon className="size-[18px] text-foreground" />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop rail + sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card/60 py-4 transition-[width] duration-200 md:flex',
          collapsed ? 'w-[72px] px-3' : 'w-[248px] px-3'
        )}
      >
        <div className={cn('mb-6 flex items-center gap-3 px-1', collapsed && 'justify-center px-0')}>
          {logo}
          {!collapsed && (
            <span className="truncate font-sans text-base font-semibold tracking-tight">
              EclipseJournal
            </span>
          )}
        </div>

        <NavList activeView={activeView} collapsed={collapsed} onSelect={select} />

        <button
          type="button"
          onClick={() => setCollapsed(value => !value)}
          aria-label={collapsed ? 'Espandi la barra laterale' : 'Comprimi la barra laterale'}
          className={cn(
            'mt-auto flex min-h-10 items-center gap-3 rounded-[10px] px-3 font-sans text-[13px] font-medium text-muted-foreground outline-none transition-colors hover:bg-white/[0.06] hover:text-foreground',
            collapsed && 'justify-center px-0'
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="size-[18px]" />
              <span>Comprimi</span>
            </>
          )}
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Chiudi menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[260px] flex-col border-r border-border bg-card px-3 py-4">
            <div className="mb-6 flex items-center gap-3 px-1">
              {logo}
              <span className="flex-1 truncate font-sans text-base font-semibold tracking-tight">
                EclipseJournal
              </span>
              <button
                type="button"
                aria-label="Chiudi menu"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10"
              >
                <X className="size-4" />
              </button>
            </div>
            <NavList activeView={activeView} collapsed={false} onSelect={select} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {banner}

        {pinnedForTutorial && <div className="h-[57px]" />}
        <header
          data-tutorial-navbar="true"
          className={cn(
            'z-40 border-b border-border bg-background/70 px-4 py-2.5 backdrop-blur-xl max-md:px-3.5',
            pinnedForTutorial ? 'fixed inset-x-0 top-0 md:left-[248px]' : 'sticky top-0'
          )}
        >
          <div className="flex min-h-9 w-full items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 md:hidden"
              aria-label="Apri menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>

            <h1 className="hidden shrink-0 font-sans text-lg font-semibold tracking-tight sm:block">
              {VIEW_TITLES[activeView]}
            </h1>

            <div className="min-w-0 flex-1 sm:flex-none">
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

            <div className="ml-auto flex shrink-0 items-center gap-2">
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
                <Lightbulb className="size-3.5" />
                <span className="max-[480px]:sr-only">Help</span>
              </Button>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
