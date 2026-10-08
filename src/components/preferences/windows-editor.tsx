import { useEffect, useRef, useState } from 'react';
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
  placeholder = '00:00',
  inputRef,
  onCommit,
  onComplete,
}: {
  value: string;
  label: string;
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  onCommit: (value: string) => void;
  onComplete?: () => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  return (
    <Input
      ref={inputRef}
      value={draft}
      inputMode="numeric"
      maxLength={5}
      placeholder={placeholder}
      aria-label={label}
      onChange={event => {
        const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
        const formatted = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;

        setDraft(formatted);

        if (isValidClock(formatted)) {
          onCommit(formatted);
          if (formatted.length === 5) onComplete?.();
        }
      }}
      onBlur={() => {
        if (!isValidClock(draft)) setDraft(value);
      }}
      className="w-[96px] text-center tabular-nums max-sm:w-full"
    />
  );
}

function WindowRow({
  window,
  index,
  onUpdate,
  onRemove,
}: {
  window: OperatingWindowConfig;
  index: number;
  onUpdate: (patch: Partial<OperatingWindowConfig>) => void;
  onRemove: () => void;
}) {
  const endRef = useRef<HTMLInputElement>(null);
  const suggest = index === 0;

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 max-sm:grid-cols-[1fr_auto]">
      <Input
        value={window.name}
        maxLength={MAX_LABEL_LENGTH}
        placeholder={suggest ? 'Apertura NY' : 'Nome (es. Apertura)'}
        onChange={event => onUpdate({ name: event.target.value })}
        onBlur={event => onUpdate({ name: capitalizeSetup(event.target.value) })}
        className="max-sm:col-span-1"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Rimuovi finestra"
        className="text-muted-foreground sm:order-last"
        onClick={onRemove}
      >
        <Trash2 className="size-4" />
      </Button>
      <TimeInput
        value={window.start}
        label="Inizio"
        placeholder={suggest ? '15:30' : '00:00'}
        onCommit={start => onUpdate({ start })}
        onComplete={() => endRef.current?.focus()}
      />
      <TimeInput
        value={window.end}
        label="Fine"
        placeholder={suggest ? '16:10' : '00:00'}
        inputRef={endRef}
        onCommit={end => onUpdate({ end })}
      />
    </div>
  );
}

export function WindowsEditor({ value, onChange }: WindowsEditorProps) {
  const update = (id: string, patch: Partial<OperatingWindowConfig>) =>
    onChange(value.map(item => (item.id === id ? { ...item, ...patch } : item)));

  const add = () =>
    onChange([
      ...value,
      { id: `w-${Date.now()}`, name: '', start: '', end: '' },
    ]);

  return (
    <div className="flex flex-col gap-3">
      {value.map((window, index) => (
        <WindowRow
          key={window.id}
          window={window}
          index={index}
          onUpdate={patch => update(window.id, patch)}
          onRemove={() => onChange(value.filter(item => item.id !== window.id))}
        />
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
