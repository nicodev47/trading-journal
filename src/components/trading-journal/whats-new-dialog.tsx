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
    icon: "😤",
    title: "Emozioni nei trade",
    description:
      "Sotto i tag scegli come ti sentivi (Sicuro, Ansioso, FOMO, Avido, Paziente...). Puoi crearne di tue e con Gestisci cambi colore o elimini quelle che non usi. Nel calendario le mostri sotto il P&L.",
  },
  {
    icon: "📈",
    title: "Emotion Analytics",
    description:
      "Nei Reports, accanto ai Tag Analytics, vedi per ogni emozione trade, P&L e winrate. Con Apri leggi i trade collegati.",
  },
  {
    icon: "🏷️",
    title: "Nuovi tag predefiniti",
    description:
      "Uscita Anticipata, Uscita in Ritardo, Stop Spostato, Size Eccessiva, Revenge Trade, Fuori Piano e Mercato Laterale si aggiungono ai tag di entrata. FOMO si sposta tra le emozioni.",
  },
  {
    icon: "🏆",
    title: "Progress Tracker per ogni conto",
    description:
      "Personale, Secondario e Backtest hanno ognuno il proprio Progress Tracker: serie, mappa della costanza, analisi giornaliere e trade mancati. La mappa è un rettangolo e puoi dividerla in Q1, Q2, Q3 e Q4 dalle impostazioni.",
  },
  {
    icon: "🖼️",
    title: "Immagini con Google Drive",
    description:
      "Grafici e screenshot si aggiungono con un link di TradingView o di Google Drive. La prima volta che inserisci un trade ti guidiamo, con un video, nel caricamento su Drive.",
  },
  {
    icon: "📦",
    title: "Export e Preview più completi",
    description:
      "I file esportati includono il Progress Tracker e il profilo di chi li invia. In Preview vedi il profilo del mittente, il suo Progress Tracker e le News, senza toccare il tuo journal.",
  },
  {
    icon: "🧭",
    title: "Tutorial aggiornato",
    description:
      "Due passi nuovi spiegano Progress Tracker e News, con i bank holiday: i giorni in cui conviene non operare perché il mercato è più laterale. La barra laterale resta ferma mentre scorri.",
  },
  {
    icon: "🛠️",
    title: "Bug Fix & Improvements",
    description:
      "• Orario e direzione non inseriti restano vuoti. • Trade log e finestre dei trade con colonne centrate. • Caselle dei dettagli trade alla stessa altezza. • Campo note più comodo. • Impostazioni dashboard e Progress Tracker nel profilo.",
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
                🚀 EclipseJournal v1.1
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Versione: v1.1
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-border/70 p-2 text-muted-foreground transition-colors hover:border-highlight/50 hover:text-foreground"
              aria-label="Chiudi novità"
            >
              <X className="size-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-5">
          <h2 className="mb-4 font-sans tabular-nums text-xs font-semibold tracking-normal text-blue-200">
            ✨ Nuove funzionalità
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {updates.map((update) => (
              <article
                key={update.title}
                className="rounded-lg border border-border/70 bg-background/45 p-4 transition-colors hover:border-highlight/35 hover:bg-primary/[0.03]"
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
            className="rounded-lg border border-blue-300/30 bg-blue-300/10 px-4 py-2 font-sans text-xs font-semibold text-blue-100 transition hover:border-blue-200/50 hover:bg-blue-300/15"
          >
            Ho capito
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
