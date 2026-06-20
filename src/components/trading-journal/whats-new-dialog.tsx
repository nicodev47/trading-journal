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
    icon: "📸",
    title: "Trade Share Card",
    description:
      "Ora puoi generare una card visiva del singolo trade da condividere o salvare.",
    bullets: [
      "Nuova Trade Share Card per ogni trade.",
      "Mostra P&L, asset, direzione, orario, setup e data.",
      "Puoi copiarla o salvarla come immagine.",
      "Pensata per social, recap personali e journaling visivo.",
    ],
  },
  {
    icon: "🧪",
    title: "Backtest",
    description:
      "Aggiunto uno spazio dedicato al Backtest, separato dal journal personale.",
    bullets: [
      "Nuova area Backtest nel calendario.",
      "Puoi importare dati nel Backtest senza sporcare il journal reale.",
      "Puoi aggiungere nuovi trade al Backtest per costruire un archivio unico.",
      "Personale, Backtest e Preview restano separati.",
    ],
  },
  {
    icon: "🧭",
    title: "Execution Map",
    description:
      "Nuova mappa mensile per visualizzare le esecuzioni reali.",
    bullets: [
      "Mostra giorni profittevoli, giorni in perdita e giorni senza attività.",
      "Evidenzia P&L e numero di trade per giornata.",
      "Aiuta a leggere meglio frequenza, distribuzione e qualità operativa.",
      "Integrata nella sezione Analisi.",
    ],
  },
  {
    icon: "📊",
    title: "Analisi interattiva",
    description:
      "La sezione Analisi è ora più interattiva.",
    bullets: [
      "I grafici sono cliccabili.",
      "Ogni grafico può aprire i trade filtrati.",
      "Puoi analizzare più velocemente setup, direzione, mese e performance.",
      "Migliora la lettura dei pattern operativi.",
    ],
  },
  {
    icon: "🛠️",
    title: "Fix UI e stabilità",
    description: "Abbiamo rifinito diversi dettagli dell’interfaccia.",
    bullets: [
      "Migliorata la UI generale.",
      "Sistemati dettagli visuali del calendario.",
      "Migliorati input e formattazioni.",
      "Rifinite scrollbar, hover, card e stati vuoti.",
      "Versione più stabile e pronta per l’uso quotidiano.",
    ],
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
                EclipseJournal v0.2
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Un nuovo aggiornamento dedicato a condivisione, backtest, analisi interattiva e stabilità dell’interfaccia.
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

        <div className="p-5">
          <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
            Novità principali
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
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
                <ul className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
                  {update.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex gap-2 text-xs leading-relaxed text-muted-foreground"
                    >
                      <span className="text-violet-300" aria-hidden="true">
                        •
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <div className="border-t border-border/70 px-5 pb-5 pt-4">
          <p className="font-sans text-xs leading-relaxed text-muted-foreground">
            EclipseJournal v0.2 è una nuova versione importante, pensata per condividere, testare e analizzare meglio ogni operazione.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
