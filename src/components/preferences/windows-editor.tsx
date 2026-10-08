import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getRomeUtcLabel } from '@/lib/timezone';
import { MAX_LABEL_LENGTH, capitalizeSetup, type OperatingWindowConfig } from '@/lib/preferences';

interface WindowsEditorProps {
  value: OperatingWindowConfig[];
  onChange: (windows: OperatingWindowConfig[]) => void;
}

const isValidClock = (value: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) return false;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return (hours <= 23 && minutes <= 59) || (hours === 24 && minutes === 0);
};

function TimeInput({
  value,
  label,
  onCommit,
}: {
  value: string;
  label: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  return (
    <Input
      value={draft}
      inputMode="numeric"
      maxLength={5}
      placeholder="00:00"
      aria-label={label}
      onChange={event => {
        const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
        const formatted = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;

        setDraft(formatted);

        if (isValidClock(formatted)) onCommit(formatted);
      }}
      onBlur={() => {
        if (!isValidClock(draft)) setDraft(value);
      }}
      className="w-[96px] text-center tabular-nums max-sm:w-full"
    />
  );
}

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
            onBlur={event => update(window.id, { name: capitalizeSetup(event.target.value) })}
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
          <TimeInput
            value={window.start}
            label="Inizio"
            onCommit={start => update(window.id, { start })}
          />
          <TimeInput
            value={window.end}
            label="Fine"
            onCommit={end => update(window.id, { end })}
          />
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" className="w-fit gap-2" onClick={add}>
        <Plus className="size-4" />
        Aggiungi finestra
      </Button>

      <p className="text-xs text-muted-foreground">
        Questi orari seguono il fuso orario di Roma ({getRomeUtcLabel()}).
      </p>

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Non hai una finestra fissa? Nessun problema: userai fasce orarie automatiche calcolate dai tuoi trade.
        </p>
      )}
    </div>
  );
}
