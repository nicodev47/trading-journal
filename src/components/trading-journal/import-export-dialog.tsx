'use client';

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Download, FileJson, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  getDefaultExportBaseName,
  normalizeExportFileName,
} from '@/lib/export-filename';
import {
  SYSTEM_WORKSPACES,
  type JournalWorkspace,
  type JournalWorkspaceMeta,
  type SystemJournalWorkspace,
} from '@/hooks/use-trades';
import type { Trade } from '@/lib/types/trade';
import { useStreamerMode } from '@/contexts/streamer-mode-context';

interface ImportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'import' | 'export';
  activeWorkspace: JournalWorkspace;
  workspaceOptions?: JournalWorkspaceMeta[];
  exportData?: string;
  exportTrades?: Trade[];
  getWorkspaceExportData?: (workspace: JournalWorkspace) => string;
  getWorkspaceTrades?: (workspace: JournalWorkspace) => Trade[];
  workspaceHasData?: (workspace: JournalWorkspace) => boolean;
  onImport?: (data: string, workspace: JournalWorkspace) => boolean;
  onAppendImport?: (data: string, workspace: JournalWorkspace) => boolean;
}

const getWorkspaceLabel = (
  workspace: JournalWorkspace,
  workspaceOptions: JournalWorkspaceMeta[] = SYSTEM_WORKSPACES
) => {
  return workspaceOptions.find((item) => item.id === workspace)?.name || workspace;
};

const WORKSPACE_EMOJIS: Partial<Record<JournalWorkspace, string>> = {
  personal: '👤',
  backtest: '⚙️',
  student: '👁️',
};

const getWorkspaceDisplayLabel = (
  workspace: JournalWorkspace,
  workspaceOptions: JournalWorkspaceMeta[] = SYSTEM_WORKSPACES
) => {
  const label = getWorkspaceLabel(workspace, workspaceOptions);
  const emoji = WORKSPACE_EMOJIS[workspace];

  return emoji ? `${emoji} ${label}` : label;
};

const isSupportedImportWorkspace = (
  workspace: JournalWorkspace
): workspace is SystemJournalWorkspace =>
  SYSTEM_WORKSPACES.some((item) => item.id === workspace);

const getSupportedImportWorkspace = (workspace: JournalWorkspace) =>
  isSupportedImportWorkspace(workspace) ? workspace : 'personal';

const hasImportableWorkspaceTrades = (jsonString?: string) => {
  if (!jsonString) return false;

  try {
    const data = JSON.parse(jsonString) as Record<string, unknown>;

    return Array.isArray(data.trades) && data.trades.length > 0;
  } catch {
    return false;
  }
};

export function ImportExportDialog({
  isOpen,
  onClose,
  mode,
  activeWorkspace,
  exportData,
  exportTrades = [],
  getWorkspaceExportData,
  getWorkspaceTrades,
  workspaceHasData,
  onImport,
  onAppendImport,
}: ImportExportDialogProps) {
  const { streamerMode } = useStreamerMode();
  const workspaceOptions = SYSTEM_WORKSPACES;
  const [exportFileName, setExportFileName] = useState(() =>
    getDefaultExportBaseName(activeWorkspace, exportTrades)
  );
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<JournalWorkspace>(() => getSupportedImportWorkspace(activeWorkspace));
  const [selectedFileName, setSelectedFileName] = useState('');
  const [pendingImportData, setPendingImportData] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const [isAppendConfirmOpen, setIsAppendConfirmOpen] = useState(false);
  const [isOverwriteConfirmOpen, setIsOverwriteConfirmOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedWorkspaceLabel = getWorkspaceLabel(selectedWorkspace, workspaceOptions);
  const selectedWorkspaceDisplayLabel = getWorkspaceDisplayLabel(
    selectedWorkspace,
    workspaceOptions
  );
  const selectedWorkspaceExportData =
    getWorkspaceExportData?.(selectedWorkspace) ||
    (selectedWorkspace === activeWorkspace ? exportData : undefined);
  const selectedWorkspaceTrades =
    getWorkspaceTrades?.(selectedWorkspace) ||
    (selectedWorkspace === activeWorkspace ? exportTrades : []);
  const selectedWorkspaceHasData = workspaceHasData
    ? workspaceHasData(selectedWorkspace)
    : hasImportableWorkspaceTrades(selectedWorkspaceExportData);
  const canAppendImport = selectedWorkspaceHasData && !!onAppendImport;

  useEffect(() => {
    if (!isOpen) return;

    setExportFileName(getDefaultExportBaseName(activeWorkspace, exportTrades));
    setSelectedWorkspace(getSupportedImportWorkspace(activeWorkspace));
    setSelectedFileName('');
    setPendingImportData(null);
    setImportError('');
    setIsAppendConfirmOpen(false);
    setIsOverwriteConfirmOpen(false);
    setIsDragging(false);
  }, [activeWorkspace, exportTrades, isOpen, mode]);

  const handleClose = () => {
    setSelectedWorkspace(getSupportedImportWorkspace(activeWorkspace));
    setSelectedFileName('');
    setPendingImportData(null);
    setImportError('');
    setIsAppendConfirmOpen(false);
    setIsOverwriteConfirmOpen(false);
    setIsDragging(false);
    onClose();
  };

  const downloadCurrentWorkspaceBackup = () => {
    if (!selectedWorkspaceExportData) return;

    const blob = new Blob([selectedWorkspaceExportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const fallbackBaseName = getDefaultExportBaseName(
      selectedWorkspace,
      selectedWorkspaceTrades,
      selectedWorkspaceLabel
    );

    anchor.href = url;
    anchor.download = normalizeExportFileName(
      fallbackBaseName,
      fallbackBaseName
    );
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleDownload = () => {
    if (!exportData) return;

    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = normalizeExportFileName(
      exportFileName,
      getDefaultExportBaseName(activeWorkspace, exportTrades)
    );
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    toast.success('Dati esportati correttamente');
    handleClose();
  };

  const handleBackupDownload = () => {
    if (!selectedWorkspaceExportData) {
      toast.error('Backup non disponibile');
      return;
    }

    downloadCurrentWorkspaceBackup();
    toast.success(`Backup ${selectedWorkspaceLabel} esportato`);
  };

  const importDirectly = (data: string) => {
    if (!onImport) return false;

    const success = onImport(data, selectedWorkspace);

    if (!success) {
      setImportError('Il formato dei dati non è valido.');
      toast.error('Importazione non riuscita');
      return false;
    }

    toast.success(`Dati importati in ${selectedWorkspaceLabel}`);
    handleClose();
    return true;
  };

  const prepareImport = (file: File) => {
    setSelectedFileName(file.name);
    setPendingImportData(null);
    setImportError('');

    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      setImportError('Seleziona un file JSON valido.');
      toast.error('Importa un file JSON');
      return;
    }

    const reader = new FileReader();

    reader.onload = event => {
      const text = typeof event.target?.result === 'string' ? event.target.result : '';

      try {
        const parsed: unknown = JSON.parse(text);
        const isValidJournal =
          typeof parsed === 'object' &&
          parsed !== null &&
          'trades' in parsed &&
          Array.isArray(parsed.trades);

        if (!isValidJournal) {
          throw new Error('Invalid journal structure');
        }

        setPendingImportData(text);
      } catch {
        setImportError('Il JSON selezionato non contiene dati validi del calendario.');
        toast.error('Formato dati non valido');
      }
    };

    reader.onerror = () => {
      setImportError('Impossibile leggere il file JSON.');
      toast.error('Impossibile leggere il file JSON');
    };

    reader.readAsText(file);
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      prepareImport(file);
    }

    event.target.value = '';
  };

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      prepareImport(file);
    }
  };

  const handleReplaceImport = () => {
    if (!pendingImportData) return;

    importDirectly(pendingImportData);
  };

  const handleAppendImport = () => {
    if (!pendingImportData || !onAppendImport || !canAppendImport) return;

    const success = onAppendImport(pendingImportData, selectedWorkspace);

    if (!success) {
      setImportError('Il formato dei dati non è valido.');
      toast.error('Importazione non riuscita');
      return;
    }

    toast.success(`Dati aggiunti in ${selectedWorkspaceLabel}`);
    setIsAppendConfirmOpen(false);
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.75rem)] max-w-[560px] overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-[0_16px_36px_rgba(0,0,0,0.28)] outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 sm:max-w-[560px]">
        <DialogHeader className="border-b border-border px-4 py-3.5 sm:px-5 sm:py-4">
          <DialogTitle className="flex items-center gap-2 font-mono text-base">
            {mode === 'export' ? (
              <>
                <Download className="size-4 text-profit" />
                Esporta dati
              </>
            ) : (
              <>
                <Upload className="size-4 text-profit" />
                Importa Dati
              </>
            )}
          </DialogTitle>
          <DialogDescription className="font-sans text-sm">
            {mode === 'export'
              ? 'Scegli il nome del file JSON da scaricare.'
              : pendingImportData
                ? 'Scegli come importare i dati del file JSON.'
                : 'Seleziona un file JSON esportato dal calendario.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'export' ? (
          <>
            <div className="ej-scrollbar max-h-[calc(92dvh-8rem)] space-y-3 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              {streamerMode && (
                <div className="rounded-xl border border-violet-400/35 bg-violet-500/10 p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="text-lg leading-none" aria-hidden="true">
                      🙈
                    </span>
                    <div>
                      <p className="font-sans text-sm font-semibold text-violet-200">
                        Modalità Streamer attiva
                      </p>
                      <p className="mt-1 font-sans text-xs leading-relaxed text-violet-100/70">
                        Nelle schermate profitti e perdite sono censurati con ******.
                        Il file JSON esportato contiene invece i valori reali per
                        preservare il backup: condividilo solo se appropriato.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Label htmlFor="export-file-name" className="font-mono text-xs uppercase tracking-wider">
                Nome file
              </Label>
              <Input
                id="export-file-name"
                value={exportFileName}
                onChange={event => setExportFileName(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleDownload();
                  }
                }}
                className="h-10 border-border bg-background/70 font-mono text-sm"
                autoFocus
              />
              <p className="font-sans text-xs text-muted-foreground">
                Il file verrà salvato come{' '}
                <span className="font-mono text-foreground">
                  {normalizeExportFileName(
                    exportFileName,
                    getDefaultExportBaseName(activeWorkspace, exportTrades)
                  )}
                </span>
              </p>
            </div>

            <DialogFooter className="border-t border-border bg-background/25 px-4 py-3.5 sm:px-5 sm:py-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Annulla
              </Button>
              <Button type="button" onClick={handleDownload} className="gap-2">
                <Download className="size-4" />
                Esporta
              </Button>
            </DialogFooter>
          </>
        ) : pendingImportData ? (
          <>
            <div className="ej-scrollbar max-h-[calc(92dvh-9rem)] space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background/45 p-3">
                <FileJson className="size-6 shrink-0 text-profit" />
                <div className="min-w-0">
                  <span className="block truncate font-mono text-sm text-foreground">
                    {selectedFileName}
                  </span>
                  <span className="mt-0.5 block font-sans text-xs text-muted-foreground">
                    Importa in {selectedWorkspaceDisplayLabel}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background/35 p-4">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Importa in
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {workspaceOptions.map((workspace) => {
                    const isSelected = selectedWorkspace === workspace.id;
                    const workspaceDisplayLabel = getWorkspaceDisplayLabel(
                      workspace.id,
                      workspaceOptions
                    );

                    return (
                      <button
                        key={workspace.id}
                        type="button"
                        onClick={() => {
                          setSelectedWorkspace(workspace.id);
                          setIsAppendConfirmOpen(false);
                          setIsOverwriteConfirmOpen(false);
                        }}
                        className={cn(
                          'min-w-0 rounded-lg border px-3 py-2 text-left font-sans text-sm font-semibold transition-colors outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-profit/60',
                          isSelected
                            ? 'border-profit bg-profit/10 text-profit'
                            : 'border-border bg-background/50 text-muted-foreground hover:border-profit/45 hover:bg-profit/5 hover:text-foreground'
                        )}
                      >
                        <span className="block truncate">
                          {workspaceDisplayLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background/35 p-4">
                {!selectedWorkspaceHasData ? (
                  <div className="space-y-2 font-sans text-sm">
                    <p className="text-foreground">
                      {selectedWorkspaceLabel} non contiene ancora dati.
                    </p>
                    <p className="text-muted-foreground">
                      Puoi importare direttamente il file JSON nello spazio di
                      lavoro selezionato.
                    </p>
                  </div>
                ) : canAppendImport ? (
                  <div className="font-sans text-sm">
                    <p className="text-foreground">
                      Puoi aggiungere i dati inseriti nei dati attuali oppure
                      sovrascrivere i dati già esistenti con quelli del file
                      importato:
                    </p>
                    <ul className="mt-3 space-y-2 text-muted-foreground">
                      <li className="flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>
                          <span className="font-semibold text-foreground">
                            Aggiungi ai dati attuali
                          </span>{' '}
                          mantiene i dati già presenti e aggiunge quelli del
                          file importato.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>
                          <span className="font-semibold text-foreground">
                            Sovrascrivi dati
                          </span>{' '}
                          elimina i dati attuali di {selectedWorkspaceLabel} e
                          li sostituisce con quelli del file importato.
                        </span>
                      </li>
                    </ul>
                  </div>
                ) : (
                  <p className="font-sans text-sm text-foreground">
                    Il file importato sovrascriverà i dati attuali di{' '}
                    {selectedWorkspaceLabel}.
                  </p>
                )}
                {selectedWorkspaceHasData && (
                  <p className="mt-2 font-sans text-sm text-muted-foreground">
                    Prima di sovrascrivere, ti consigliamo di esportare un backup
                    dei dati attuali.
                  </p>
                )}
              </div>

              {selectedWorkspaceHasData && (
                <div className="rounded-xl border border-profit/30 bg-profit/10 p-3.5">
                  <p className="font-sans text-xs leading-relaxed text-muted-foreground">
                    L’import modifica solo lo spazio di lavoro selezionato.
                    Gli altri spazi non verranno modificati.
                  </p>
                </div>
              )}

              {importError && (
                <p className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 font-sans text-xs text-loss">
                  {importError}
                </p>
              )}
            </div>

            <DialogFooter className="border-t border-border bg-background/25 px-4 py-3.5 max-sm:[&_button]:w-full sm:px-5 sm:py-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Annulla
              </Button>
              {canAppendImport && (
                <Button
                  type="button"
                  onClick={() => setIsAppendConfirmOpen(true)}
                  className="gap-2 bg-profit text-background hover:bg-profit/90 hover:text-background"
                >
                  <Upload className="size-4" />
                  Aggiungi ai dati attuali
                </Button>
              )}
              {selectedWorkspaceHasData ? (
                <Button
                  type="button"
                  onClick={() => setIsOverwriteConfirmOpen(true)}
                  className="gap-2 bg-loss text-white hover:bg-loss/90"
                >
                  <Upload className="size-4" />
                  Sovrascrivi dati
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleReplaceImport}
                  className="gap-2 bg-profit text-background hover:bg-profit/90 hover:text-background"
                >
                  <Upload className="size-4" />
                  Importa dati
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="ej-scrollbar max-h-[calc(92dvh-8rem)] space-y-3 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'h-32 w-full flex-col gap-2 rounded-xl border-dashed transition-colors',
                  isDragging
                    ? 'border-profit bg-profit/10 text-profit'
                    : 'border-border bg-background/35 hover:border-profit/70 hover:bg-profit/5'
                )}
              >
                <Upload
                  className={cn(
                    'size-7',
                    isDragging ? 'text-profit' : 'text-muted-foreground'
                  )}
                />
                <span className="font-mono text-sm">
                  {isDragging ? 'Rilascia qui il file JSON' : 'Scegli o trascina un file JSON'}
                </span>
              </Button>

              {importError && (
                <p className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 font-sans text-xs text-loss">
                  {importError}
                </p>
              )}
            </div>

            <DialogFooter className="border-t border-border bg-background/25 px-4 py-3.5 sm:px-5 sm:py-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Annulla
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>

      <Dialog
        open={isAppendConfirmOpen}
        onOpenChange={setIsAppendConfirmOpen}
      >
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.75rem)] max-w-[500px] overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-[0_20px_48px_rgba(0,0,0,0.36)] outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0">
          <DialogHeader className="border-b border-border px-4 py-3.5 sm:px-5 sm:py-4">
            <DialogTitle className="font-mono text-base text-profit">
              Conferma import
            </DialogTitle>
            <DialogDescription className="font-sans text-sm">
              Stai per aggiungere i dati del file importato ai dati già presenti
              in {selectedWorkspaceLabel}.
            </DialogDescription>
          </DialogHeader>

          <div className="ej-scrollbar max-h-[calc(92dvh-9rem)] space-y-3 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            <p className="font-sans text-sm leading-relaxed text-foreground">
              I dati attuali non verranno eliminati, ma il journal potrebbe
              contenere operazioni duplicate se il file è già stato importato in
              precedenza.
            </p>

            <div className="rounded-xl border border-profit/30 bg-profit/10 p-4">
              <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                Ti consigliamo di controllare il file prima in Preview oppure
                esportare un backup dei dati attuali.
              </p>
            </div>
          </div>

          <DialogFooter className="border-t border-border bg-background/25 px-4 py-3.5 max-sm:[&_button]:w-full sm:px-5 sm:py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAppendConfirmOpen(false)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={handleAppendImport}
              className="gap-2 bg-profit text-background hover:bg-profit/90 hover:text-background"
            >
              <Upload className="size-4" />
              Aggiungi dati
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isOverwriteConfirmOpen}
        onOpenChange={setIsOverwriteConfirmOpen}
      >
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.75rem)] max-w-[500px] overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-[0_20px_48px_rgba(0,0,0,0.36)] outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0">
          <DialogHeader className="border-b border-border px-4 py-3.5 sm:px-5 sm:py-4">
            <DialogTitle className="font-mono text-base text-loss">
              Prima di sovrascrivere
            </DialogTitle>
            <DialogDescription className="font-sans text-sm">
              La sovrascrittura sostituirà i dati attuali di questo spazio di
              lavoro con quelli del file importato.
            </DialogDescription>
          </DialogHeader>

          <div className="ej-scrollbar max-h-[calc(92dvh-9rem)] space-y-3 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            <div className="rounded-xl border border-loss/30 bg-loss/10 p-4">
              <p className="font-sans text-sm leading-relaxed text-foreground">
                Prima di continuare, ti consigliamo di esportare un backup dei
                dati attuali.
              </p>
            </div>

            <p className="font-sans text-xs leading-relaxed text-muted-foreground">
              Il backup esportato riguarda i dati attuali di{' '}
              {selectedWorkspaceLabel} e non importa ancora nulla.
            </p>
          </div>

          <DialogFooter className="border-t border-border bg-background/25 px-4 py-3.5 max-sm:[&_button]:w-full sm:px-5 sm:py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOverwriteConfirmOpen(false)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={handleBackupDownload}
              className="gap-2 bg-profit text-background hover:bg-profit/90 hover:text-background"
            >
              <Download className="size-4" />
              Esporta backup
            </Button>
            <Button
              type="button"
              onClick={handleReplaceImport}
              className="gap-2 bg-loss text-white hover:bg-loss/90"
            >
              <Upload className="size-4" />
              Sovrascrivi direttamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
