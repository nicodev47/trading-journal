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
    icon: "📥",
    title: "Import ed Export sulla pagina aperta",
    description:
      "Import ed Export lavorano direttamente sul conto, Backtest o Preview che stai visualizzando. Non serve più scegliere una destinazione e gli altri spazi non vengono modificati.",
  },
  {
    icon: "🛡️",
    title: "Backup prima dell'importazione",
    description:
      "Se la pagina contiene già dati, una nuova card viola permette di scaricare subito una copia di sicurezza prima di aggiungere o sovrascrivere i dati importati.",
  },
  {
    icon: "📝",
    title: "Note durante la creazione dei conti",
    description:
      "Quando crei un nuovo conto, una sessione Backtest o uno spazio Preview puoi aggiungere subito una nota facoltativa con obiettivi, regole e informazioni utili.",
  },
  {
    icon: "🗂️",
    title: "Gestione degli spazi più chiara",
    description:
      "I flussi di creazione, modifica, backup e importazione mantengono sempre visibile il contesto della pagina corrente, riducendo il rischio di intervenire sul conto sbagliato.",
  },
  {
    icon: "🛠️",
    title: "Bug Fix & Improvements",
    description:
      "• Tutorial e sezione Help aggiornati. • Flussi Import/Export semplificati. • Migliorata la chiarezza delle conferme. • Ottimizzazioni generali dell'interfaccia.",
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
                🚀 EclipseJournal v0.6
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Versione: v0.6
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
