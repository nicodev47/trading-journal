import type { CSSProperties, ReactNode } from 'react';
import { ArrowRight, Moon, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

        <Reveal delay={600} className="mt-10 flex items-start gap-3 text-left text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <span>
            Puoi modificare queste impostazioni quando vuoi successivamente all&apos;interno del tuo profilo.
          </span>
        </Reveal>

        <Reveal delay={800} className="mt-10">
          <Button type="button" size="lg" className="gap-2 px-8" onClick={onStart}>
            Iniziamo
            <ArrowRight className="size-4" />
          </Button>
        </Reveal>
      </div>
    </div>
  );
}
