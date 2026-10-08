import { useState } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, Check, Clock, Moon, ShieldCheck, Target, UserRound } from 'lucide-react';
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
    why: 'Così le card che condividi sono davvero tue, con le tue iniziali o la tua foto.',
  },
  {
    title: 'Su quali asset operi?',
    description: 'Scegli quelli che operi: sono gli unici che vedrai nei menu, nel calendario e nelle statistiche.',
    why: 'Il journal mostra solo i tuoi asset, senza menu pieni di cose che non operi.',
  },
  {
    title: 'Che setup usi?',
    description: 'Scrivi i nomi dei tuoi setup come li chiami tu. Potrai cambiarli quando vuoi dal profilo.',
    why: 'Le statistiche confrontano i tuoi setup tra loro e ti dicono quale funziona meglio.',
  },
  {
    title: 'Hai una finestra operativa?',
    description: 'Indica gli orari in cui di solito operi. Le statistiche ti diranno quando funzioni meglio.',
    why: 'Capiamo se rispetti i tuoi orari e in quale fascia ottieni i risultati migliori.',
  },
];

const INTRO_POINTS = [
  { icon: Target, title: 'I tuoi Asset preferiti a portata di mano', text: 'Menu, calendario e filtri mostrano solo quello che operi.' },
  { icon: BarChart3, title: 'Statistiche basate sulle tue performance', text: 'Parlano la tua lingua, con i nomi che scegli tu.' },
  { icon: Clock, title: 'Le tue sessioni operative', text: 'Vediamo in quali finestre funzioni meglio.' },
  { icon: UserRound, title: 'Un profilo tuo', text: 'Nome e foto compaiono nelle card che condividi.' },
];

export function OnboardingScreen() {
  const { completeOnboarding } = usePreferences();
  const [step, setStep] = useState(-1);
  const [draft, setDraft] = useState<JournalPreferences>(EMPTY_PREFERENCES);

  const isIntro = step === -1;
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

        <div
          className={cn('mb-8 flex gap-2', isIntro && 'invisible')}
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
          {isIntro ? (
            <>
              <h1 className="text-3xl font-semibold tracking-tight">Benvenuto in EclipseJournal!</h1>
              <p className="mt-2 text-xl font-medium tracking-tight text-foreground/80">
                Prima di incominciare, rendiamo la tua esperienza unica.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Ti facciamo quattro domande veloci, circa un minuto. Servono a far funzionare il
                journal sul tuo modo di operare, invece di darti uno strumento uguale per tutti.
              </p>

              <ul className="mt-8 grid gap-5">
                {INTRO_POINTS.map(point => (
                  <li key={point.title} className="flex gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                      <point.icon className="size-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{point.title}</div>
                      <div className="mt-0.5 text-sm text-muted-foreground">{point.text}</div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex items-start gap-3 rounded-xl border border-border bg-white/[0.03] p-4 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                <span>
                  Puoi cambiare tutto quando vuoi dal profilo. I tuoi dati restano nel tuo browser.
                </span>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-semibold tracking-tight">{STEPS[step].title}</h1>
              <p className="mt-3 text-sm text-muted-foreground">{STEPS[step].description}</p>
              <p className="mt-2 text-xs text-muted-foreground/80">
                <span className="font-medium text-muted-foreground">Perché te lo chiediamo: </span>
                {STEPS[step].why}
              </p>

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
            </>
          )}

          <div className="mt-auto flex items-center justify-between gap-3 pt-10">
            <Button
              type="button"
              variant="ghost"
              className={cn('gap-2', isIntro && 'invisible')}
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
              {isIntro ? 'Iniziamo' : isLast ? 'Inizia' : 'Avanti'}
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
