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
import type { JournalWorkspace } from '@/hooks/use-trades';
import { useStreamerMode } from '@/contexts/streamer-mode-context';

interface ImportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'import' | 'export';
  activeWorkspace: JournalWorkspace;
  exportData?: string;
  onImport?: (data: string, workspace: JournalWorkspace) => boolean;
}

const getDefaultFileName = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return `calendario-pl-${now.getFullYear()}-${month}`;
};

const normalizeFileName = (value: string) => {
  const fallback = getDefaultFileName();
  const withoutExtension = value.trim().replace(/\.json$/i, '');
  const normalized = withoutExtension
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '');

  return `${normalized || fallback}.json`;
};

export function ImportExportDialog({
  isOpen,
  onClose,
  mode,
  activeWorkspace,
  exportData,
  onImport,
}: ImportExportDialogProps) {
  const { streamerMode } = useStreamerMode();
  const [exportFileName, setExportFileName] = useState(getDefaultFileName);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [pendingImportData, setPendingImportData] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const [targetWorkspace, setTargetWorkspace] =
    useState<JournalWorkspace>(activeWorkspace);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setExportFileName(getDefaultFileName());
    setSelectedFileName('');
    setPendingImportData(null);
    setImportError('');
    setTargetWorkspace(activeWorkspace);
    setIsDragging(false);
  }, [activeWorkspace, isOpen, mode]);

  const handleClose = () => {
    setSelectedFileName('');
    setPendingImportData(null);
    setImportError('');
    setIsDragging(false);
    onClose();
  };

  const handleDownload = () => {
    if (!exportData) return;

    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = normalizeFileName(exportFileName);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    toast.success('Dati esportati correttamente');
    handleClose();
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

  const handleImportConfirmation = () => {
    if (!pendingImportData || !onImport) return;

    const success = onImport(pendingImportData, targetWorkspace);

    if (!success) {
      setImportError('Il formato dei dati non è valido.');
      toast.error('Importazione non riuscita');
      return;
    }

    toast.success(
      `Dati importati in ${targetWorkspace === 'personal' ? 'Personale' : 'Preview'}`
    );
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-[0_16px_36px_rgba(0,0,0,0.28)] sm:max-w-md">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 font-mono text-base">
            {mode === 'export' ? (
              <>
                <Download className="size-4 text-profit" />
                Esporta dati
              </>
            ) : (
              <>
                <Upload className="size-4 text-profit" />
                Importa dati
              </>
            )}
          </DialogTitle>
          <DialogDescription className="font-sans text-sm">
            {mode === 'export'
              ? 'Scegli il nome del file JSON da scaricare.'
              : pendingImportData
                ? 'Scegli dove caricare i dati importati.'
                : 'Seleziona un file JSON esportato dal calendario.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'export' ? (
          <>
            <div className="space-y-3 px-5 py-5">
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
                  {normalizeFileName(exportFileName)}
                </span>
              </p>
            </div>

            <DialogFooter className="border-t border-border bg-background/25 px-5 py-4">
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
            <div className="space-y-4 px-5 py-5">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background/45 p-3">
                <FileJson className="size-6 shrink-0 text-profit" />
                <span className="min-w-0 truncate font-mono text-sm text-foreground">
                  {selectedFileName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetWorkspace('personal')}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-colors',
                    targetWorkspace === 'personal'
                      ? 'border-profit/60 bg-profit/10 text-foreground'
                      : 'border-border bg-background/40 text-muted-foreground hover:bg-secondary/50'
                  )}
                >
                  <span className="block font-sans text-sm font-semibold">👤 Personale</span>
                  <span className="mt-1 block font-sans text-xs text-muted-foreground">
                    Journal personale
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetWorkspace('student')}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-colors',
                    targetWorkspace === 'student'
                      ? 'border-profit/60 bg-profit/10 text-foreground'
                      : 'border-border bg-background/40 text-muted-foreground hover:bg-secondary/50'
                  )}
                >
                  <span className="block font-sans text-sm font-semibold">👁️ Preview</span>
                  <span className="mt-1 block font-sans text-xs text-muted-foreground">
                    Area separata di prova
                  </span>
                </button>
              </div>

              {importError && (
                <p className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 font-sans text-xs text-loss">
                  {importError}
                </p>
              )}
            </div>

            <DialogFooter className="border-t border-border bg-background/25 px-5 py-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Annulla
              </Button>
              <Button type="button" onClick={handleImportConfirmation} className="gap-2">
                <Upload className="size-4" />
                Importa
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-3 px-5 py-5">
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

            <DialogFooter className="border-t border-border bg-background/25 px-5 py-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Annulla
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
