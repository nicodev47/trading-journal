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
    icon: "🙈",
    title: "Modalità Streamer",
    description:
      "Nasconde i valori economici con ****** durante live, video e screenshot senza cancellare i dati reali.",
  },
  {
    icon: "👤",
    title: "Profilo trader",
    description:
      "Statistiche, discipline score, punti di forza e PNG condivisibile del tuo profilo.",
  },
  {
    icon: "⭐",
    title: "Trade preferiti",
    description:
      "Contrassegna le operazioni più importanti e ritrovale rapidamente nel journal.",
  },
  {
    icon: "📊",
    title: "Analisi avanzata",
    description:
      "Equity, performance mensile, setup, direzione, giorni della settimana e statistiche operative.",
  },
  {
    icon: "🧠",
    title: "Errori personalizzati",
    description:
      "Crea errori su misura per riconoscere pattern ricorrenti e migliorare la disciplina.",
  },
  {
    icon: "🔗",
    title: "Link nei trade",
    description:
      "Aggiungi e rinomina link TradingView o Google Drive mantenendo ogni riferimento ordinato.",
  },
  {
    icon: "📥📤",
    title: "Import ed export",
    description:
      "Crea backup JSON e ripristina il journal conservando la struttura dei dati.",
  },
  {
    icon: "🧾",
    title: "Trade log e dettaglio",
    description:
      "Consulta un registro compatto e apri ogni trade per visualizzarne tutte le informazioni.",
  },
  {
    icon: "🎨",
    title: "Interfaccia aggiornata",
    description:
      "Nuove card, tooltip più leggibili e una UI dark più coerente e responsive.",
  },
];

export function WhatsNewDialog({ open, onOpenChange }: WhatsNewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[88vh] max-w-4xl overflow-y-auto border-border/80 bg-card p-0 sm:rounded-2xl"
      >
        <DialogHeader className="sticky top-0 z-10 border-b border-border/70 bg-card/95 px-6 py-5 text-left backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl text-foreground">
                Novità EclipseJournal v0.1
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Una panoramica delle nuove funzioni e dei miglioramenti disponibili.
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
      </DialogContent>
    </Dialog>
  );
}
