'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  Download,
  Eye,
  FlaskConical,
  Folder,
  Pencil,
  Plus,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type {
  JournalWorkspace,
  JournalWorkspaceGroup,
  JournalWorkspaceMeta,
} from '@/hooks/use-trades';
import { cn } from '@/lib/utils';
import {
  keepLegacyWorkspaceFirst,
  LEGACY_PRIMARY_WORKSPACES,
} from '@/lib/workspace-storage';

interface AccountSelectorProps {
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
}

export function AccountSelector({
  activeWorkspace,
  workspaces,
  showPreviewWorkspace,
  maxCustomWorkspaces,
  onWorkspaceChange,
  onCreateWorkspace,
  onUpdateWorkspace,
  onBackupWorkspace,
  onDeleteWorkspace,
}: AccountSelectorProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuSection, setMenuSection] =
    useState<'accounts' | 'backtests' | 'preview'>(
      activeWorkspace === 'student' || activeWorkspace.startsWith('preview-')
        ? 'preview'
        : activeWorkspace === 'backtest' || activeWorkspace.startsWith('backtest-')
          ? 'backtests'
          : 'accounts'
    );
  const [creationGroup, setCreationGroup] =
    useState<JournalWorkspaceGroup>('account');
  const [editingWorkspace, setEditingWorkspace] =
    useState<JournalWorkspaceMeta | null>(null);
  const [deletionTarget, setDeletionTarget] =
    useState<JournalWorkspaceMeta | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const activeAccount =
    workspaces.find((workspace) => workspace.id === activeWorkspace) ?? workspaces[0];
  const accountWorkspaces = useMemo(
    () => keepLegacyWorkspaceFirst(
      workspaces.filter(
        (workspace) =>
          workspace.id === 'personal' ||
          workspace.id === 'secondary' ||
          workspace.group === 'account'
      ),
      LEGACY_PRIMARY_WORKSPACES.personal.id
    ),
    [workspaces]
  );
  const backtestWorkspaces = useMemo(
    () => keepLegacyWorkspaceFirst(
      workspaces.filter(
        (workspace) =>
          workspace.group === 'backtest'
      ),
      LEGACY_PRIMARY_WORKSPACES.backtest.id
    ),
    [workspaces]
  );
  const previewWorkspaces = useMemo(
    () =>
      workspaces.filter(
        (workspace) =>
          workspace.group === 'preview'
      ),
    [workspaces]
  );
  const customWorkspaceCount = accountWorkspaces.filter(
    (workspace) => workspace.type === 'custom'
  ).length;
  const backtestWorkspaceCount = backtestWorkspaces.filter(
    (workspace) => workspace.type === 'custom'
  ).length;
  const previewWorkspaceCount = previewWorkspaces.filter(
    (workspace) => workspace.type === 'custom'
  ).length;

  useEffect(() => {
    if (activeWorkspace === 'student' || activeWorkspace.startsWith('preview-')) {
      setMenuSection('preview');
      return;
    }

    if (activeWorkspace === 'backtest' || activeWorkspace.startsWith('backtest-')) {
      setMenuSection('backtests');
      return;
    }

    setMenuSection('accounts');
  }, [activeWorkspace]);

  const resetForm = () => {
    setName('');
    setNotes('');
    setError('');
    setEditingWorkspace(null);
  };

  const openCreateDialog = (group: JournalWorkspaceGroup = 'account') => {
    resetForm();
    setCreationGroup(group);
    setIsMenuOpen(false);
    setIsEditorOpen(true);
  };

  const openEditDialog = (workspace: JournalWorkspaceMeta) => {
    setEditingWorkspace(workspace);
    setName(workspace.name);
    setNotes(workspace.notes ?? '');
    setError('');
    setIsMenuOpen(false);
    setIsEditorOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = editingWorkspace
      ? onUpdateWorkspace(editingWorkspace.id, name, notes)
      : onCreateWorkspace(name, creationGroup, notes);

    if (!result.success || !result.workspace) {
      setError(result.error ?? 'Impossibile creare il conto.');
      return;
    }

    if (!editingWorkspace) onWorkspaceChange(result.workspace.id);
    setIsEditorOpen(false);
    resetForm();
  };

  const openDeleteDialog = () => {
    if (!editingWorkspace) return;

    setDeletionTarget(editingWorkspace);
    setDeleteConfirmation('');
    setIsEditorOpen(false);
  };

  const handleDeleteWorkspace = () => {
    if (!deletionTarget || deleteConfirmation.trim().toUpperCase() !== 'CONFERMA') {
      return;
    }

    const success = onDeleteWorkspace(deletionTarget.id);

    if (success) {
      setDeletionTarget(null);
      setDeleteConfirmation('');
      resetForm();
    }
  };

  const renderWorkspaceItem = (
    workspace: JournalWorkspaceMeta,
    icon: ReactNode
  ) => {
    const isEditable =
      workspace.id === 'personal' ||
      workspace.id === 'secondary' ||
      workspace.id === 'backtest-2' ||
      workspace.id === 'preview-2' ||
      workspace.id === 'backtest' ||
      workspace.id === 'student' ||
      workspace.type === 'custom';

    return (
      <div key={workspace.id} className="group relative">
        <button
          type="button"
          className={cn(
            'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2.5 text-left text-sm outline-none transition-colors hover:border-violet-500/35 hover:bg-violet-500/15 hover:text-violet-50 focus-visible:border-violet-400/50 focus-visible:bg-violet-500/15',
            isEditable && 'pr-11'
          )}
          onClick={() => {
            if (workspace.id === 'student' || workspace.id.startsWith('preview-')) {
              setMenuSection('preview');
            } else if (
              workspace.id === 'backtest' ||
              workspace.id.startsWith('backtest-')
            ) {
              setMenuSection('backtests');
            } else {
              setMenuSection('accounts');
            }
            onWorkspaceChange(workspace.id);
            setIsMenuOpen(false);
          }}
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground transition-colors group-hover:bg-violet-500/20 group-hover:text-violet-200">
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-sans text-xs font-semibold">
              {workspace.name}
            </span>
            {isEditable && workspace.notes?.trim() && (
              <span className="block truncate font-mono text-[10px] text-muted-foreground group-hover:text-violet-200/70">
                {workspace.notes.trim()}
              </span>
            )}
          </span>
          {activeWorkspace === workspace.id && (
            <Check
              className={cn(
                'absolute right-3 top-1/2 size-4 -translate-y-1/2 text-profit',
                isEditable && 'group-hover:opacity-0'
              )}
            />
          )}
        </button>

        {isEditable && (
          <button
            type="button"
            className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-violet-200 opacity-0 transition hover:bg-violet-500/25 hover:text-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-400 group-hover:opacity-100 max-md:opacity-100"
            onClick={() => openEditDialog(workspace)}
            aria-label={`Modifica ${workspace.name}`}
            title={`Modifica ${workspace.name}`}
          >
            <Pencil className="size-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <Popover
        open={isMenuOpen}
        onOpenChange={(open) => {
          if (open) {
            if (activeWorkspace === 'student' || activeWorkspace.startsWith('preview-')) {
              setMenuSection('preview');
            } else if (
              activeWorkspace === 'backtest' ||
              activeWorkspace.startsWith('backtest-')
            ) {
              setMenuSection('backtests');
            } else {
              setMenuSection('accounts');
            }
          }
          setIsMenuOpen(open);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            data-tutorial="workspace-tabs"
            className="h-9 w-[190px] justify-between rounded-lg border-violet-500/55 bg-violet-500/10 px-3 text-left shadow-[0_0_0_1px_rgba(139,92,246,0.08)] hover:border-violet-400 hover:bg-violet-500/15 max-lg:w-[160px] max-md:w-auto max-md:min-w-0 max-md:flex-1"
          >
            <span className="flex min-w-0 items-center gap-2">
              {activeWorkspace === 'student' || activeWorkspace.startsWith('preview-') ? (
                <Eye className="size-4 shrink-0 text-violet-300" />
              ) : activeWorkspace === 'backtest' || activeWorkspace.startsWith('backtest-') ? (
                <FlaskConical className="size-4 shrink-0 text-violet-300" />
              ) : (
                <WalletCards className="size-4 shrink-0 text-violet-300" />
              )}
              <span className="truncate font-sans text-xs font-semibold">
                {activeAccount?.name ?? 'Seleziona conto'}
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[290px] rounded-xl p-1.5">
          <div className="px-2.5 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {menuSection === 'accounts'
              ? 'I tuoi conti'
              : menuSection === 'backtests'
                ? 'I tuoi Backtest'
                : 'Preview'}
          </div>

          {menuSection === 'accounts' ? (
            <>
              {accountWorkspaces.map((workspace) =>
                renderWorkspaceItem(
                  workspace,
                  <WalletCards className="size-3.5" />
                )
              )}

              <button
                type="button"
                disabled={customWorkspaceCount >= maxCustomWorkspaces}
                className="mt-1 flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-violet-500/35 px-2 text-left text-violet-200 outline-none transition-colors hover:bg-violet-500/15 focus-visible:bg-violet-500/15 disabled:pointer-events-none disabled:opacity-50"
                onClick={() => openCreateDialog('account')}
              >
                <Plus className="size-4" />
                <span className="font-sans text-xs font-semibold">
                  Aggiungi nuovo conto
                </span>
              </button>
            </>
          ) : menuSection === 'backtests' ? (
            <>
              {backtestWorkspaces.map((workspace) =>
                renderWorkspaceItem(
                  workspace,
                  <FlaskConical className="size-3.5" />
                )
              )}

              <button
                type="button"
                disabled={backtestWorkspaceCount >= maxCustomWorkspaces}
                className="mt-1 flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-violet-500/35 px-2 text-left text-violet-200 outline-none transition-colors hover:bg-violet-500/15 focus-visible:bg-violet-500/15 disabled:pointer-events-none disabled:opacity-50"
                onClick={() => openCreateDialog('backtest')}
              >
                <Plus className="size-4" />
                <span className="font-sans text-xs font-semibold">
                  Aggiungi conto Backtest
                </span>
              </button>
            </>
          ) : (
            <>
              {previewWorkspaces.map((workspace) =>
                renderWorkspaceItem(
                  workspace,
                  <Eye className="size-3.5" />
                )
              )}

              <button
                type="button"
                disabled={previewWorkspaceCount >= maxCustomWorkspaces}
                className="mt-1 flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-violet-500/35 px-2 text-left text-violet-200 outline-none transition-colors hover:bg-violet-500/15 focus-visible:bg-violet-500/15 disabled:pointer-events-none disabled:opacity-50"
                onClick={() => openCreateDialog('preview')}
              >
                <Plus className="size-4" />
                <span className="font-sans text-xs font-semibold">
                  Aggiungi conto Preview
                </span>
              </button>
            </>
          )}

          <div className="-mx-1 my-2 h-px bg-border" />
          <div className="px-2.5 pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Modalità
          </div>

          {menuSection === 'accounts' ? (
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-transparent px-2.5 text-left outline-none transition-colors hover:border-violet-500/35 hover:bg-violet-500/15 focus-visible:border-violet-400/50 focus-visible:bg-violet-500/15"
              onClick={() => setMenuSection('backtests')}
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <Folder className="size-3.5" />
              </span>
              <span className="flex-1 font-sans text-xs font-semibold">Backtest</span>
            </button>
          ) : (
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-transparent px-2.5 text-left outline-none transition-colors hover:border-violet-500/35 hover:bg-violet-500/15 focus-visible:border-violet-400/50 focus-visible:bg-violet-500/15"
              onClick={() => setMenuSection('accounts')}
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <WalletCards className="size-3.5" />
              </span>
              <span className="flex-1 font-sans text-xs font-semibold">I tuoi conti</span>
            </button>
          )}

          {menuSection === 'preview' && (
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-transparent px-2.5 text-left outline-none transition-colors hover:border-violet-500/35 hover:bg-violet-500/15 focus-visible:border-violet-400/50 focus-visible:bg-violet-500/15"
              onClick={() => setMenuSection('backtests')}
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <Folder className="size-3.5" />
              </span>
              <span className="flex-1 font-sans text-xs font-semibold">Backtest</span>
            </button>
          )}

          {menuSection !== 'preview' && showPreviewWorkspace && (
            <button
              type="button"
              className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-transparent px-2.5 text-left outline-none transition-colors hover:border-violet-500/35 hover:bg-violet-500/15 focus-visible:border-violet-400/50 focus-visible:bg-violet-500/15"
              onClick={() => setMenuSection('preview')}
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <Eye className="size-3.5" />
              </span>
              <span className="flex-1 font-sans text-xs font-semibold">Preview</span>
            </button>
          )}
        </PopoverContent>
      </Popover>

      <Dialog
        open={isEditorOpen}
        onOpenChange={(open) => {
          setIsEditorOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-border bg-card">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingWorkspace
                  ? 'Modifica conto'
                  : creationGroup === 'backtest'
                    ? 'Aggiungi conto Backtest'
                    : creationGroup === 'preview'
                      ? 'Aggiungi conto Preview'
                      : 'Aggiungi un conto'}
              </DialogTitle>
              <DialogDescription>
                {editingWorkspace
                  ? 'Aggiorna nome e note. I dati del conto non verranno modificati.'
                  : creationGroup === 'backtest'
                    ? 'Questo conto avrà trade, calendario e statistiche Backtest separati.'
                    : creationGroup === 'preview'
                      ? 'Questa Preview avrà trade, calendario e statistiche separati.'
                      : 'Trade, calendario e statistiche resteranno separati dagli altri conti.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-5">
              <div className="grid gap-2">
                <Label htmlFor="account-name">Nome del conto</Label>
                <Input
                  id="account-name"
                  autoFocus
                  maxLength={20}
                  placeholder="Es. Prop Firm 50K"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError('');
                  }}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="account-notes">Nota del conto (opzionale)</Label>
                <Textarea
                  id="account-notes"
                  rows={5}
                  placeholder="Aggiungi obiettivi, regole o informazioni utili su questo conto..."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="resize-none"
                />
              </div>

              {error && <p className="font-sans text-xs font-medium text-loss">{error}</p>}
            </div>

            <DialogFooter className="sm:items-center sm:justify-between">
              {editingWorkspace ? (
                <Button
                  type="button"
                  variant="outline"
                  className="border-loss/40 text-loss hover:bg-loss/10 hover:text-loss"
                  onClick={openDeleteDialog}
                >
                  <Trash2 className="size-4" />
                  Elimina conto
                </Button>
              ) : (
                <span />
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => setIsEditorOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={!name.trim()}>
                  {editingWorkspace
                    ? 'Salva modifiche'
                    : creationGroup === 'backtest'
                      ? 'Crea Backtest'
                      : creationGroup === 'preview'
                        ? 'Crea Preview'
                        : 'Crea conto'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletionTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletionTarget(null);
            setDeleteConfirmation('');
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-loss/30 bg-card">
          <DialogHeader>
            <DialogTitle className="text-loss">
              Elimina {deletionTarget?.name ?? 'conto'}?
            </DialogTitle>
            <DialogDescription>
              {deletionTarget?.type === 'custom'
                ? 'Il conto e tutti i suoi dati verranno eliminati definitivamente.'
                : 'Tutti i dati, il nome e le note verranno eliminati. Il conto principale verrà ripristinato vuoto.'}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3.5">
            <p className="font-sans text-sm font-semibold text-violet-100">
              Ti consigliamo di creare prima un backup.
            </p>
            <p className="mt-1 font-sans text-xs text-violet-200/70">
              Potrai ripristinare trade, strategie e piani in un secondo momento.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 border-violet-400/35 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20 hover:text-white"
              onClick={() => deletionTarget && onBackupWorkspace(deletionTarget.id)}
            >
              <Download className="size-4" />
              Scarica backup
            </Button>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="delete-account-confirmation">
              Digita <span className="font-mono font-bold text-loss">CONFERMA</span> per continuare
            </Label>
            <Input
              id="delete-account-confirmation"
              autoComplete="off"
              placeholder="CONFERMA"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeletionTarget(null);
                setDeleteConfirmation('');
              }}
            >
              Annulla
            </Button>
            <Button
              type="button"
              className="bg-loss text-white hover:bg-loss/85"
              disabled={deleteConfirmation.trim().toUpperCase() !== 'CONFERMA'}
              onClick={handleDeleteWorkspace}
            >
              <Trash2 className="size-4" />
              Elimina definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
