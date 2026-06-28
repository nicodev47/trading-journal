import { Button } from '@/components/ui/button';

interface TutorialWelcomeDialogProps {
  open: boolean;
  onStart: () => void;
  onSkip: () => void;
}

export function TutorialWelcomeDialog({
  open,
  onStart,
  onSkip,
}: TutorialWelcomeDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-3.5">
      <div
        className="max-h-[90dvh] w-full max-w-[420px] overflow-y-auto rounded-2xl border border-border bg-card p-5 text-center shadow-2xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-welcome-title"
      >
        <h2
          id="tutorial-welcome-title"
          className="font-sans text-xl font-bold text-foreground"
        >
          Benvenuto in EclipseJournal 👋🏻
        </h2>

        <p className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground">
          Questo breve tutorial ti mostra le funzioni principali del journal usando dati demo temporanei.
        </p>

        <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground">
          I tuoi dati reali non verranno modificati e potrai saltare il tutorial in qualsiasi momento.
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:mt-6 sm:flex-row sm:justify-center max-sm:[&_button]:w-full">
          <Button type="button" variant="outline" onClick={onSkip}>
            Salta
          </Button>
          <Button type="button" onClick={onStart}>
            Inizia tutorial
          </Button>
        </div>
      </div>
    </div>
  );
}
