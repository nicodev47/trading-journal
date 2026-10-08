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
    icon: "👋",
    title: "Onboarding personalizzato",
    description:
      "Al primo accesso scegli nome e foto, gli asset che operi, i tuoi setup e le finestre operative. Il journal si adatta a te e il tutorial parte subito dopo.",
  },
  {
    icon: "🧩",
    title: "Asset, setup e finestre tuoi",
    description:
      "Menu, analisi, calendario e card di condivisione usano le tue scelte. Puoi modificarle in ogni momento dal profilo, nella scheda Impostazioni.",
  },
  {
    icon: "🪪",
    title: "Profilo rinnovato",
    description:
      "Foto o iniziali, livello e XP in un'unica card, con tre schede: Profilo, Impostazioni e Dati.",
  },
  {
    icon: "📊",
    title: "Nuove analisi",
    description:
      "Setup e finestra operativa migliori e peggiori, giorno e mese migliori con win rate, Long vs Short, RR, drawdown e profitto in una griglia ordinata.",
  },
  {
    icon: "🖼️",
    title: "Card Share ridisegnate",
    description:
      "Le card di trade e profilo hanno un nuovo formato verticale con foto o iniziali, pensato per essere condiviso.",
  },
  {
    icon: "🎨",
    title: "Nuovo stile grafico",
    description:
      "Interfaccia scura ispirata allo stile Apple: colori, font e bordi uniformi, calendario con il giorno corrente evidenziato.",
  },
  {
    icon: "👀",
    title: "Preview dei file importati",
    description:
      "Quando importi un file puoi aprirlo in Preview: vedi profilo, calendario e analisi di chi lo ha esportato, e ne esci quando vuoi senza modificare il tuo journal.",
  },
  {
    icon: "🛠️",
    title: "Bug Fix & Improvements",
    description:
      "• Esc chiude solo il sottomenu aperto. • Conferma prima di eliminare un link immagine. • Salvataggio automatico nelle note. • Miglioramenti su mobile.",
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
                🚀 EclipseJournal v1.0
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Versione: v1.0
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
