import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WhatsNewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const updates = [
  {
    icon: "📤",
    title: "Share trade sui social",
    description:
      "Genera una Trade Recap Card del singolo trade e condividila come immagine.",
  },
  {
    icon: "📸",
    title: "Trade Recap Card",
    description:
      "Nuova card esportabile con P&L, asset, direzione, orario, setup e data del trade.",
  },
  {
    icon: "🧪",
    title: "Backtest nel calendario",
    description:
      "Testa strategie in una sezione separata senza modificare i dati reali.",
  },
  {
    icon: "📊",
    title: "Analisi ridisegnata",
    description:
      "UI più pulita, coerente con il tema dell’app e con grafici più leggibili.",
  },
  {
    icon: "🖱️",
    title: "Grafici cliccabili",
    description:
      "Navigazione più chiara e un’esperienza più interattiva nella sezione Analisi.",
  },
  {
    icon: "🗺️",
    title: "Execution Map",
    description:
      "Leggi meglio distribuzione, comportamento e qualità operativa.",
  },
  {
    icon: "🎯",
    title: "Eclipse Score",
    description:
      "Valuta winrate, profit factor, frequenza operativa e timing con un indice sintetico.",
  },
  {
    icon: "🛡️",
    title: "Messaggi di sicurezza",
    description:
      "Conferme prima di azioni delicate come cancellare un trade o importare dati.",
  },
];

export function WhatsNewDialog({ open, onOpenChange }: WhatsNewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="ej-scrollbar max-h-[88vh] max-w-4xl overflow-y-auto overscroll-contain border-border/80 bg-card p-0 sm:rounded-2xl"
      >
        <DialogHeader className="sticky top-0 z-10 border-b border-border/70 bg-card/95 px-6 py-5 text-left backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl text-foreground">
                Novità di questa versione
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Share, Backtest e nuovi strumenti di Analisi per un journaling più completo e sicuro.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-border/70 p-2 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              aria-label="Chiudi novità"
            >
              <X className="size-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {updates.map((update) => (
            <article
              key={update.title}
              className="rounded-xl border border-border/70 bg-background/45 p-4 transition-colors hover:border-primary/35 hover:bg-primary/[0.03]"
            >
              <span className="text-xl" aria-hidden="true">
                {update.icon}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                {update.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {update.description}
              </p>
            </article>
          ))}
        </div>

        <div className="border-t border-border/70 px-5 pb-5 pt-4">
          <p className="font-sans text-xs leading-relaxed text-muted-foreground">
            Una nuova versione importante di EclipseJournal, pensata per condividere, testare e analizzare meglio ogni operazione.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
