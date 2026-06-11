'use client';

import { DragEvent, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Download, Upload, CheckCircle, XCircle, FileJson } from 'lucide-react';

interface ImportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'import' | 'export';
  exportData?: string;
  onImport?: (data: string) => boolean;
}

export function ImportExportDialog({
  isOpen,
  onClose,
  mode,
  exportData,
  onImport,
}: ImportExportDialogProps) {
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = () => {
    if (!exportData) return;

    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eclipse-journal-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Dati esportati correttamente');
    onClose();
  };

  const importFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      setImportStatus('error');
      setFileName(file.name);
      toast.error('Importa un file JSON');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const success = onImport?.(text);
        if (success) {
          setImportStatus('success');
          toast.success('Dati importati correttamente');
        } else {
          setImportStatus('error');
          toast.error('Formato dati non valido');
        }
      } catch {
        setImportStatus('error');
        toast.error('Impossibile leggere i dati JSON');
      }
    };
    reader.onerror = () => {
      setImportStatus('error');
      toast.error('Impossibile leggere il file JSON');
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    importFile(file);
  };

  const handleClose = () => {
    setImportStatus('idle');
    setFileName('');
    setIsDragging(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono">
            {mode === 'export' ? (
              <>
                <Download className="size-5 text-profit" />
                Esporta dati
              </>
            ) : (
              <>
                <Upload className="size-5 text-profit" />
                Importa dati
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'export'
              ? 'Scarica tutti i dati del journal in un file JSON.'
              : 'Carica un file JSON esportato in precedenza per ripristinare i dati.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'export' ? (
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
              <FileJson className="size-8 text-profit" />
              <div className="flex-1">
                <p className="font-mono text-sm font-medium">eclipse-journal-export.json</p>
                <p className="text-xs text-muted-foreground">
                  Include tutti i trade, i piani settimanali e le impostazioni
                </p>
              </div>
            </div>
            <Button onClick={handleDownload} className="w-full gap-2 bg-profit hover:bg-profit/90">
              <Download className="size-4" />
              Scarica file JSON
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {importStatus === 'idle' ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`h-32 w-full flex-col gap-2 border-dashed transition-colors ${
                  isDragging
                    ? 'border-profit bg-profit/10 text-profit'
                    : 'border-border hover:border-profit/70 hover:bg-profit/5'
                }`}
              >
                <Upload className={`size-8 ${isDragging ? 'text-profit' : 'text-muted-foreground'}`} />
                <span className="font-mono text-sm">
                  {isDragging ? 'Rilascia qui il file JSON' : 'Clicca o trascina qui il file JSON'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Importa il file esportato da EclipseJournal
                </span>
              </Button>
            ) : importStatus === 'success' ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-profit/50 bg-profit/10 p-6">
                <CheckCircle className="size-12 text-profit" />
                <div className="text-center">
                  <p className="font-mono font-medium text-profit">Import completato!</p>
                  <p className="text-sm text-muted-foreground">{fileName}</p>
                </div>
                <Button onClick={handleClose} className="mt-2 bg-profit hover:bg-profit/90">
                  Fatto
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-loss/50 bg-loss/10 p-6">
                <XCircle className="size-12 text-loss" />
                <div className="text-center">
                  <p className="font-mono font-medium text-loss">Import fallito</p>
                  <p className="text-sm text-muted-foreground">Il formato del file non è valido</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setImportStatus('idle');
                    setFileName('');
                  }}
                  className="mt-2"
                >
                  Riprova
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
