import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MAX_LABEL_LENGTH, addSetup } from '@/lib/preferences';

interface SetupInputProps {
  value: string[];
  onChange: (setups: string[]) => void;
}

export function SetupInput({ value, onChange }: SetupInputProps) {
  const [draft, setDraft] = useState('');

  const submit = () => {
    if (!draft.trim()) return;

    onChange(addSetup(value, draft));
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          value={draft}
          maxLength={MAX_LABEL_LENGTH}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Scrivi un setup e premi Invio"
        />
        <Button type="button" variant="outline" size="icon" aria-label="Aggiungi setup" onClick={submit}>
          <Plus className="size-4" />
        </Button>
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map(setup => (
            <span
              key={setup}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 py-1 pl-3 pr-1.5 text-xs font-medium"
            >
              {setup}
              <button
                type="button"
                aria-label={`Rimuovi ${setup}`}
                onClick={() => onChange(value.filter(item => item !== setup))}
                className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Chiamali come vuoi: l&apos;iniziale di ogni parola diventa maiuscola in automatico.
        </p>
      )}
    </div>
  );
}
