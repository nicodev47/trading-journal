import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Moon } from 'lucide-react';
import { AssetPicker } from '@/components/preferences/asset-picker';
import { ProfileFields } from '@/components/preferences/profile-fields';
import { SetupInput } from '@/components/preferences/setup-input';
import { WindowsEditor } from '@/components/preferences/windows-editor';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/preferences-context';
import { EMPTY_PREFERENCES, capitalizeSetup, type JournalPreferences } from '@/lib/preferences';
import { cn } from '@/lib/utils';
import { OnboardingIntro } from './onboarding-intro';
import { OnboardingPreview } from './onboarding-preview';

const STEPS: { title: string; description?: string; why?: string }[] = [
  {
    title: 'Incominciamo con le presentazioni, come ti chiami?',
    why: 'Ti chiediamo questi dati solo per un punto di vista estetico e di personalizzazione del tuo profilo. I tuoi dati non vengono condivisi con nessuno: per i nostri trader la privacy è al primo posto.',
  },
  {
    title: 'Su quali asset operi?',
    description:
      'Scegli su quale asset si basa la tua operatività in modo da avere sempre a portata di mano i tuoi asset preferiti.',
  },
  {
    title: 'Come si chiamano i setup della tua strategia?',
    description: 'Scrivi i nomi dei setup che utilizzi all\'interno della tua operatività.',
  },
  {
    title: 'Hai una finestra operativa?',
    description:
      'Indica gli orari in cui di solito sei a mercato. Se non hai una finestra definita, passa direttamente allo step successivo.',
    why: 'I dati del journal restano nella cache del tuo browser: ricordati di fare backup regolari dalla scheda Dati del profilo.',
  },
];

export function OnboardingScreen() {
  const { completeOnboarding } = usePreferences();
  const [step, setStep] = useState(-1);
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
          .map((window, index) =>
            index === 0 && !window.name.trim() && !window.start && !window.end
              ? { ...window, name: 'Apertura NY', start: '15:30', end: '16:10' }
              : window
          )
          .filter(window => window.name.trim() && window.start && window.end)
          .map(window => ({ ...window, name: capitalizeSetup(window.name) })),
      });
      return;
    }

    setStep(current => current + 1);
  };

  const nextRef = useRef(next);
  nextRef.current = next;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.defaultPrevented || event.isComposing) return;
      if ((event.target as Element | null)?.closest?.('button')) return;
      nextRef.current();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  if (step === -1) {
    return <OnboardingIntro onStart={() => setStep(0)} />;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-background md:grid md:grid-cols-2 md:overflow-hidden">
      <div className="order-last flex min-h-0 flex-col px-6 py-8 md:order-first md:overflow-y-auto md:px-14 md:py-12">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/10">
            <Moon className="size-[18px]" />
          </div>
          <span className="text-lg font-semibold tracking-tight">EclipseJournal</span>
        </div>

        <div
          className="mb-8 flex gap-2"
          aria-label={`Passo ${step + 1} di ${STEPS.length}`}
        >
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
          <>
              <h1 className="text-3xl font-semibold tracking-tight">{STEPS[step].title}</h1>
              {STEPS[step].description && (
                <p className="mt-3 text-sm text-muted-foreground">{STEPS[step].description}</p>
              )}
              {STEPS[step].why && (
                <p className="mt-3 text-xs text-muted-foreground/80">
                  <span className="font-medium text-muted-foreground">Perché te lo chiediamo: </span>
                  {STEPS[step].why}
                </p>
              )}

              <div className="mt-8">
                {step === 0 && (
                  <ProfileFields
                    autoFocus
                    fallbackInitials="MR"
                    hint="Il nome/username che inserisci verrà utilizzato all'interno del tuo profilo da trader."
                    name={draft.name}
                    photo={draft.photo}
                    onChange={patch}
                  />
                )}
                {step === 1 && (
                  <AssetPicker value={draft.assets} onChange={assets => patch({ assets })} />
                )}
                {step === 2 && (
                  <SetupInput
                    enterToAdd={false}
                    value={draft.setups}
                    onChange={setups => patch({ setups })}
                  />
                )}
                {step === 3 && (
                  <WindowsEditor value={draft.windows} onChange={windows => patch({ windows })} />
                )}
              </div>
          </>

          <div className="mt-auto flex items-center justify-between gap-3 pt-10">
            <Button
              type="button"
              variant="ghost"
              className="gap-2"
              onClick={() => setStep(current => Math.max(-1, current - 1))}
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
