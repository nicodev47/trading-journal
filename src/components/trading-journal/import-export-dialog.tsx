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
  getGuidedExportBaseName,
  normalizeExportFileName,
} from '@/lib/export-filename';
import { parseJournalExport } from '@/lib/journal-export';
import {
  SYSTEM_WORKSPACES,
  type JournalWorkspace,
  type JournalWorkspaceMeta,
} from '@/hooks/use-trades';
import { useStreamerMode } from '@/contexts/streamer-mode-context';

interface ImportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'import' | 'export';
  activeWorkspace: JournalWorkspace;
  workspaceOptions?: JournalWorkspaceMeta[];
  exportData?: string;
  getWorkspaceExportData?: (workspace: JournalWorkspace) => string;
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
  getWorkspaceExportData,
  workspaceHasData,
  onImport,
  onAppendImport,
  workspaceOptions: providedWorkspaceOptions,
}: ImportExportDialogProps) {
  const { streamerMode } = useStreamerMode();
  const workspaceOptions = providedWorkspaceOptions ?? SYSTEM_WORKSPACES;
  const [exportFileName, setExportFileName] = useState(() =>
    getGuidedExportBaseName(activeWorkspace)
  );
  const [selectedFileName, setSelectedFileName] = useState('');
  const [pendingImportData, setPendingImportData] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const [isAppendConfirmOpen, setIsAppendConfirmOpen] = useState(false);
  const [isOverwriteConfirmOpen, setIsOverwriteConfirmOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isBackupNameOpen, setIsBackupNameOpen] = useState(false);
  const [returnToOverwriteAfterBackup, setReturnToOverwriteAfterBackup] = useState(false);
  const [backupFileName, setBackupFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedWorkspaceLabel = getWorkspaceLabel(activeWorkspace, workspaceOptions);
  const selectedWorkspaceExportData =
    getWorkspaceExportData?.(activeWorkspace) || exportData;
  const selectedWorkspaceHasData = workspaceHasData
    ? workspaceHasData(activeWorkspace)
    : hasImportableWorkspaceTrades(selectedWorkspaceExportData);
  const canAppendImport =
    selectedWorkspaceHasData &&
    !!onAppendImport;
  const selectedExportLabel = getWorkspaceLabel(activeWorkspace, workspaceOptions);
  const selectedExportData = getWorkspaceExportData?.(activeWorkspace) || exportData;
  const suggestedExportFileName = getGuidedExportBaseName(activeWorkspace);

  useEffect(() => {
    if (!isOpen) return;

    setExportFileName(getGuidedExportBaseName(activeWorkspace));
    setSelectedFileName('');
    setPendingImportData(null);
    setImportError('');
    setIsAppendConfirmOpen(false);
    setIsOverwriteConfirmOpen(false);
    setIsDragging(false);
    setIsBackupNameOpen(false);
    setReturnToOverwriteAfterBackup(false);
    setBackupFileName('');
  }, [activeWorkspace, isOpen, mode, workspaceHasData]);

  const handleClose = () => {
    setExportFileName(getGuidedExportBaseName(activeWorkspace));
    setSelectedFileName('');
    setPendingImportData(null);
    setImportError('');
    setIsAppendConfirmOpen(false);
    setIsOverwriteConfirmOpen(false);
    setIsDragging(false);
    setIsBackupNameOpen(false);
    setReturnToOverwriteAfterBackup(false);
    setBackupFileName('');
    onClose();
  };

  const downloadJson = (data: string, fileName: string) => {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleDownload = () => {
    if (!selectedExportData) return;

    downloadJson(
      selectedExportData,
      normalizeExportFileName(exportFileName, suggestedExportFileName)
    );

    toast.success('Dati esportati correttamente');
    handleClose();
  };

  const handleBackupDownload = (returnToOverwrite = false) => {
    if (!selectedWorkspaceExportData) {
      toast.error('Backup non disponibile');
      return;
    }

    setBackupFileName(getGuidedExportBaseName(activeWorkspace));
    setReturnToOverwriteAfterBackup(returnToOverwrite);
    setIsOverwriteConfirmOpen(false);
    setIsBackupNameOpen(true);
  };

  const confirmBackupDownload = () => {
    if (!selectedWorkspaceExportData) return;

    const fallback = getGuidedExportBaseName(activeWorkspace);
    downloadJson(
      selectedWorkspaceExportData,
      normalizeExportFileName(backupFileName, fallback)
    );
    setBackupFileName(fallback);
    setIsBackupNameOpen(false);
    setIsOverwriteConfirmOpen(returnToOverwriteAfterBackup);
    toast.success(`Backup ${selectedWorkspaceLabel} esportato`);
  };

  const importDirectly = (data: string) => {
    if (!onImport) return false;

    const success = onImport(data, activeWorkspace);

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
        const parsed = parseJournalExport(text);

        if (!parsed) {
          throw new Error('Invalid journal structure');
        }

        if (parsed.kind === 'full-backup') {
          const activeWorkspaceData = parsed.data.workspaces[activeWorkspace];

          if (!activeWorkspaceData) {
            setImportError(
              `Il backup non contiene dati per la pagina ${selectedWorkspaceLabel}.`
            );
            toast.error('La pagina aperta non è presente nel backup');
            return;
          }

          setPendingImportData(JSON.stringify(activeWorkspaceData));
          return;
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
    if (
      !pendingImportData ||
      !onAppendImport ||
      !canAppendImport
    ) return;

    const success = onAppendImport(pendingImportData, activeWorkspace);

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
                Salva esportazione
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
              ? `Stai esportando i dati della pagina aperta: ${selectedExportLabel}.`
              : pendingImportData
                ? `Scegli come importare i dati in ${selectedWorkspaceLabel}.`
                : `Seleziona un file JSON da importare in ${selectedWorkspaceLabel}.`}
          </DialogDescription>
        </DialogHeader>

        {mode === 'export' ? (
          <>
              <div className="ej-scrollbar max-h-[calc(92dvh-9rem)] space-y-3 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                {streamerMode && (
                  <div className="rounded-xl border border-violet-400/35 bg-violet-500/10 p-3.5">
                    <div className="flex items-start gap-3">
                      <span className="text-lg leading-none" aria-hidden="true">🙈</span>
                      <div>
                        <p className="font-sans text-sm font-semibold text-violet-200">
                          Modalità Streamer attiva
                        </p>
                        <p className="mt-1 font-sans text-xs leading-relaxed text-violet-100/70">
                          Attenzione! I dati che stai per esportare hanno la modalità
                          Streamer attiva: i tuoi profitti e le tue perdite sono
                          censurati.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Label htmlFor="export-file-name" className="font-mono text-xs uppercase tracking-wider">
                  Nome del file
                </Label>
                <Input
                  id="export-file-name"
                  value={exportFileName}
                  onChange={event => setExportFileName(event.target.value)}
                  onBlur={() => {
                    if (!exportFileName.trim()) setExportFileName(suggestedExportFileName);
                  }}
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
                  <span className="break-all font-mono text-foreground">
                    {normalizeExportFileName(exportFileName, suggestedExportFileName)}
                  </span>
                </p>
              </div>

              <DialogFooter className="border-t border-border bg-background/25 px-4 py-3.5 max-sm:[&_button]:w-full sm:px-5 sm:py-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Annulla
                </Button>
                <Button
                  type="button"
                  disabled={!selectedExportData}
                  onClick={handleDownload}
                  className="gap-2"
                >
                  <Download className="size-4" />
                  Scarica file
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
                    Importa nella pagina aperta: {selectedWorkspaceLabel}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background/35 p-4">
                {!selectedWorkspaceHasData ? (
                  <div className="space-y-2 font-sans text-sm">
                    <p className="text-foreground">
                      {selectedWorkspaceLabel} non contiene ancora dati.
                    </p>
                    <p className="text-muted-foreground">
                      Puoi importare direttamente il file JSON nella pagina aperta.
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
                    L’import modifica solo la pagina attualmente aperta.
                    Gli altri spazi non verranno modificati.
                  </p>
                </div>
              )}

              {selectedWorkspaceHasData && (
                <div className="rounded-xl border border-violet-400/35 bg-violet-500/10 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-semibold text-violet-200">
                        Proteggi i dati attuali
                      </p>
                      <p className="mt-1 font-sans text-xs leading-relaxed text-violet-100/70">
                        Scarica una copia della pagina aperta prima di procedere con l’importazione.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleBackupDownload(false)}
                      className="shrink-0 gap-2 border-violet-400/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 hover:text-violet-100"
                    >
                      <Download className="size-4" />
                      Scarica backup
                    </Button>
                  </div>
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
              La sovrascrittura sostituirà i dati della pagina aperta con quelli del file importato.
            </DialogDescription>
          </DialogHeader>

          <div className="ej-scrollbar max-h-[calc(92dvh-9rem)] space-y-3 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            <div className="rounded-xl border border-loss/30 bg-loss/10 p-4">
              <p className="font-sans text-sm leading-relaxed text-foreground">
                Prima di continuare, ti consigliamo di esportare un backup dei dati attuali.
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
              onClick={() => handleBackupDownload(true)}
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

      <Dialog
        open={isBackupNameOpen}
        onOpenChange={(open) => {
          setIsBackupNameOpen(open);
          if (!open && returnToOverwriteAfterBackup) {
            setIsOverwriteConfirmOpen(true);
          }
        }}
      >
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.75rem)] max-w-[500px] overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-[0_20px_48px_rgba(0,0,0,0.36)] outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0">
          <DialogHeader className="border-b border-border px-4 py-3.5 sm:px-5 sm:py-4">
            <DialogTitle className="flex items-center gap-2 font-mono text-base">
              <Download className="size-4 text-profit" />
              Salva esportazione
            </DialogTitle>
            <DialogDescription className="font-sans text-sm">
              Stai esportando i dati di {selectedWorkspaceLabel}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">
            <Label htmlFor="backup-file-name" className="font-mono text-xs uppercase tracking-wider">
              Nome del file
            </Label>
            <Input
              id="backup-file-name"
              value={backupFileName}
              onChange={(event) => setBackupFileName(event.target.value)}
              onBlur={() => {
                if (!backupFileName.trim()) {
                  setBackupFileName(getGuidedExportBaseName(activeWorkspace));
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  confirmBackupDownload();
                }
              }}
              className="h-10 border-border bg-background/70 font-mono text-sm"
              autoFocus
            />
            <p className="font-sans text-xs text-muted-foreground">
              Il file verrà salvato come{' '}
              <span className="break-all font-mono text-foreground">
                {normalizeExportFileName(
                  backupFileName,
                  getGuidedExportBaseName(activeWorkspace)
                )}
              </span>
            </p>
          </div>

          <DialogFooter className="border-t border-border bg-background/25 px-4 py-3.5 max-sm:[&_button]:w-full sm:px-5 sm:py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsBackupNameOpen(false);
                setIsOverwriteConfirmOpen(returnToOverwriteAfterBackup);
              }}
            >
              Indietro
            </Button>
            <Button type="button" onClick={confirmBackupDownload} className="gap-2">
              <Download className="size-4" />
              Scarica file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
