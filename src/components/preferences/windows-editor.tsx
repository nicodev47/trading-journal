import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MAX_LABEL_LENGTH, type OperatingWindowConfig } from '@/lib/preferences';

interface WindowsEditorProps {
  value: OperatingWindowConfig[];
  onChange: (windows: OperatingWindowConfig[]) => void;
}

const displayTime = (time: string) => (time === '24:00' ? '23:59' : time);

export function WindowsEditor({ value, onChange }: WindowsEditorProps) {
  const update = (id: string, patch: Partial<OperatingWindowConfig>) =>
    onChange(value.map(item => (item.id === id ? { ...item, ...patch } : item)));

  const add = () =>
    onChange([
      ...value,
      { id: `w-${Date.now()}`, name: '', start: '09:00', end: '12:00' },
    ]);

  return (
    <div className="flex flex-col gap-3">
      {value.map(window => (
        <div
          key={window.id}
          className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 max-sm:grid-cols-[1fr_auto]"
        >
          <Input
            value={window.name}
            maxLength={MAX_LABEL_LENGTH}
            placeholder="Nome (es. Apertura)"
            onChange={event => update(window.id, { name: event.target.value })}
            className="max-sm:col-span-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Rimuovi finestra"
            className="text-muted-foreground sm:order-last"
            onClick={() => onChange(value.filter(item => item.id !== window.id))}
          >
            <Trash2 className="size-4" />
          </Button>
          <Input
            type="time"
            value={displayTime(window.start)}
            onChange={event => update(window.id, { start: event.target.value })}
            className="w-[110px] max-sm:w-full"
          />
          <Input
            type="time"
            value={displayTime(window.end)}
            onChange={event => update(window.id, { end: event.target.value })}
            className="w-[110px] max-sm:w-full"
          />
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" className="w-fit gap-2" onClick={add}>
        <Plus className="size-4" />
        Aggiungi finestra
      </Button>

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Non hai una finestra fissa? Nessun problema: userai fasce orarie automatiche calcolate dai tuoi trade.
        </p>
      )}
    </div>
  );
}
