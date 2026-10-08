import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Moon } from 'lucide-react';
import { AssetPicker } from '@/components/preferences/asset-picker';
import { ProfileFields } from '@/components/preferences/profile-fields';
import { SetupInput } from '@/components/preferences/setup-input';
import { WindowsEditor } from '@/components/preferences/windows-editor';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/preferences-context';
import { EMPTY_PREFERENCES, capitalizeSetup, type JournalPreferences } from '@/lib/preferences';
import { cn } from '@/lib/utils';
import { OnboardingPreview } from './onboarding-preview';

const STEPS = [
  {
    title: 'Come ti chiami?',
    description: 'Il tuo nome e una foto (facoltativa) compaiono nel profilo e nelle card che condividi.',
  },
  {
    title: 'Su quali asset operi?',
    description: 'Scegli quelli che operi: sono gli unici che vedrai nei menu, nel calendario e nelle statistiche.',
  },
  {
    title: 'Che setup usi?',
    description: 'Scrivi i nomi dei tuoi setup come li chiami tu. Potrai cambiarli quando vuoi dal profilo.',
  },
  {
    title: 'Hai una finestra operativa?',
    description: 'Indica gli orari in cui di solito operi. Le statistiche ti diranno quando funzioni meglio.',
  },
];

export function OnboardingScreen() {
  const { completeOnboarding } = usePreferences();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<JournalPreferences>(EMPTY_PREFERENCES);

  const isLast = step === STEPS.length - 1;
  const canContinue = step !== 1 || draft.assets.length > 0;
  const patch = (value: Partial<JournalPreferences>) =>
    setDraft(current => ({ ...current, ...value }));

  const next = () => {
    if (!canContinue) return;

    if (isLast) {
      completeOnboarding({
        ...draft,
        windows: draft.windows
          .filter(window => window.name.trim())
          .map(window => ({ ...window, name: capitalizeSetup(window.name) })),
      });
      return;
    }

    setStep(current => current + 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-background md:grid md:grid-cols-2 md:overflow-hidden">
      <div className="order-last flex min-h-0 flex-col px-6 py-8 md:order-first md:overflow-y-auto md:px-14 md:py-12">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/10">
            <Moon className="size-[18px]" />
          </div>
          <span className="text-lg font-semibold tracking-tight">EclipseJournal</span>
        </div>

        <div className="mb-8 flex gap-2" aria-label={`Passo ${step + 1} di ${STEPS.length}`}>
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={cn(
                'h-1 flex-1 rounded-full',
                index <= step ? 'bg-white' : 'bg-white/10'
              )}
            />
          ))}
        </div>

        <div className="flex max-w-[480px] flex-1 flex-col">
          <h1 className="text-3xl font-semibold tracking-tight">{STEPS[step].title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{STEPS[step].description}</p>

          <div className="mt-8">
            {step === 0 && (
              <ProfileFields
                autoFocus
                name={draft.name}
                photo={draft.photo}
                onChange={patch}
              />
            )}
            {step === 1 && (
              <AssetPicker value={draft.assets} onChange={assets => patch({ assets })} />
            )}
            {step === 2 && (
              <SetupInput value={draft.setups} onChange={setups => patch({ setups })} />
            )}
            {step === 3 && (
              <WindowsEditor value={draft.windows} onChange={windows => patch({ windows })} />
            )}
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 pt-10">
            <Button
              type="button"
              variant="ghost"
              className={cn('gap-2', step === 0 && 'invisible')}
              onClick={() => setStep(current => Math.max(0, current - 1))}
            >
              <ArrowLeft className="size-4" />
              Indietro
            </Button>
            <Button
              type="button"
              disabled={!canContinue}
              className="gap-2 px-6"
              onClick={next}
            >
              {isLast ? 'Inizia' : 'Avanti'}
              {isLast ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
            </Button>
          </div>
          {step === 1 && !canContinue && (
            <p className="mt-3 text-right text-xs text-muted-foreground">
              Scegli almeno un asset per continuare.
            </p>
          )}
        </div>
      </div>

      <div className="order-first flex items-center justify-center border-b border-border bg-white/[0.02] px-6 py-6 md:order-last md:border-b-0 md:border-l md:py-12">
        <OnboardingPreview draft={draft} />
      </div>
    </div>
  );
}
