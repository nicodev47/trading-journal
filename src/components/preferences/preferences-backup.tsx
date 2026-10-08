import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/preferences-context';
import { parseStoredPreferences } from '@/lib/preferences';

export function PreferencesBackup() {
  const { preferences, updatePreferences } = usePreferences();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(preferences, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'eclipsejournal-preferenze.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;

    const imported = parseStoredPreferences(await file.text());

    if (!imported) {
      toast.error('File non valido: non contiene preferenze di EclipseJournal');
      return;
    }

    updatePreferences(imported);
    toast.success('Preferenze importate');
  };

  return (
    <section className="rounded-[14px] border border-border bg-background/35 p-3.5 sm:p-4">
      <p className="mb-2 font-sans text-xs font-semibold tracking-normal text-muted-foreground">
        Backup delle preferenze
      </p>
      <p className="max-w-xl font-sans text-xs leading-relaxed text-muted-foreground">
        Salva nome, foto, asset, setup e finestre operative in un file, oppure ripristinali da un file esportato in precedenza.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 max-sm:[&_button]:w-full">
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <Download className="size-4" />
          Esporta preferenze
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" />
          Importa preferenze
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={event => {
            void handleImport(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
    </section>
  );
}
