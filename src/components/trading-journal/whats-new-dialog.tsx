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
    icon: "➕",
    title: "Inserimento trade Breakeven / Missed",
    description:
      "Ora è possibile registrare trade con P&L pari a 0 USD. Questo permette di tracciare anche i trade chiusi in pari o i trade mancati, ottenendo statistiche e analisi più realistiche.",
  },
  {
    icon: "📥",
    title: "Import / Export migliorati",
    description:
      "L'anteprima dei dati è ora integrata direttamente nel flusso di Importa. Anche il processo di esportazione è stato ottimizzato, rendendo Import ed Export più semplici, intuitivi e affidabili.",
  },
  {
    icon: "⚙️",
    title: "Nuove impostazioni calendario",
    description:
      "Ora puoi scegliere se mostrare nel calendario i tag e il tipo di setup dei trade. Puoi anche includere o escludere dalla visualizzazione i trade con P&L pari a 0 USD, senza modificare i dati salvati.",
  },
  {
    icon: "⚖️",
    title: "Risk-to-Reward Ratio",
    description:
      "Il Risk-to-Reward Ratio sostituisce il Profit Factor e confronta la media dei trade vincenti con quella dei trade perdenti, fornendo un dato più rilevante per valutare l'efficacia della strategia.",
  },
  {
    icon: "🧭",
    title: "Tutorial Migliorato",
    description:
      "Il tutorial guidato è ora più completo e accompagna passo dopo passo tra statistiche principali, dati dettagliati, curva Equity e sezione Analisi.",
  },
  {
    icon: "🛠️",
    title: "Bug Fix & Improvements",
    description:
      "• Risolti numerosi bug minori. • Migliorata la stabilità generale. • Ottimizzazioni dell'interfaccia e dell'esperienza utente. • Miglioramenti generali delle prestazioni.",
  },
];

export function WhatsNewDialog({ open, onOpenChange }: WhatsNewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="ej-scrollbar max-h-[90dvh] w-[calc(100vw-1.75rem)] max-w-4xl overflow-y-auto overscroll-contain border-border/80 bg-card p-0 sm:rounded-2xl"
      >
        <DialogHeader className="sticky top-0 z-10 border-b border-border/70 bg-card/95 px-4 py-3.5 text-left backdrop-blur sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-lg text-foreground sm:text-xl">
                🚀 EclipseJournal v0.5
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Versione: v0.5
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

        <div className="p-4 sm:p-5">
          <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
            ✨ Nuove funzionalità
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
              </article>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-border/70 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-violet-300/30 bg-violet-300/10 px-4 py-2 font-sans text-xs font-semibold text-violet-100 transition hover:border-violet-200/50 hover:bg-violet-300/15"
          >
            Ho capito
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
