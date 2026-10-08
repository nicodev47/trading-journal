import type { CSSProperties, ReactNode } from 'react';
import { ArrowRight, BarChart3, Clock, Moon, ShieldCheck, Target, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';

const INTRO_POINTS = [
  { icon: Target, title: 'I tuoi Asset preferiti a portata di mano', text: 'Menu, calendario e filtri mostrano solo quello che operi.' },
  { icon: BarChart3, title: 'Statistiche basate sulle tue performance', text: 'Parlano la tua lingua, con i nomi che scegli tu.' },
  { icon: Clock, title: 'Le tue sessioni operative', text: 'Vediamo in quali finestre funzioni meglio.' },
  { icon: UserRound, title: 'Un profilo personalizzato', text: 'Nome e foto compaiono nelle card che condividi.' },
];

function Reveal({
  delay,
  className = '',
  children,
}: {
  delay: number;
  className?: string;
  children: ReactNode;
}) {
  const style: CSSProperties = { animationDelay: `${delay}ms`, animationFillMode: 'backwards' };

  return (
    <div
      className={`animate-in fade-in slide-in-from-bottom-4 duration-700 motion-reduce:animate-none ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function OnboardingIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-[640px] flex-col items-center justify-center px-6 py-12 text-center">
        <Reveal delay={0}>
          <div className="mb-8 flex size-14 items-center justify-center rounded-2xl bg-white/10">
            <Moon className="size-7" />
          </div>
        </Reveal>

        <Reveal delay={150}>
          <h1 className="text-4xl font-semibold tracking-tight max-sm:text-3xl">
            Benvenuto in EclipseJournal !
          </h1>
        </Reveal>

        <Reveal delay={300}>
          <p className="mt-3 text-xl font-medium tracking-tight text-foreground/80 max-sm:text-lg">
            Prima di incominciare, rendiamo la tua esperienza unica.
          </p>
          <p className="mx-auto mt-4 max-w-[520px] text-sm text-muted-foreground">
            Ti facciamo quattro domande veloci, serviranno per andare ad impostare e calibrare il
            journal in base alla tua operatività e obiettivi.
          </p>
        </Reveal>

        <ul className="mt-10 grid w-full gap-3 text-left">
          {INTRO_POINTS.map((point, index) => (
            <li key={point.title}>
              <Reveal
                delay={600 + index * 180}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <point.icon className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{point.title}</div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{point.text}</div>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal delay={1450} className="mt-8 flex items-start gap-3 text-left text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <span>
            Puoi modificare queste impostazioni quando vuoi successivamente all&apos;interno del tuo profilo.
          </span>
        </Reveal>

        <Reveal delay={1650} className="mt-10">
          <Button type="button" size="lg" className="gap-2 px-8" onClick={onStart}>
            Iniziamo
            <ArrowRight className="size-4" />
          </Button>
        </Reveal>
      </div>
    </div>
  );
}
