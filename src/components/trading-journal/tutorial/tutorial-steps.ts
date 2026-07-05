export type TutorialStep = {
  target: string;
  title: string;
  description: string;
  cta: string;
  action?: 'complete';
};

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: 'calendar',
    title: 'Calendario P/L',
    description:
      'Il calendario è il punto principale dove inserisci i dati delle tue operazioni.\n\nCliccando su un giorno puoi aggiungere i trade, salvare P&L, setup, note e link ai grafici. Una volta inseriti i dati, il calendario terrà traccia di tutte le tue operazioni.',
    cta: 'Avanti',
  },
  {
    target: 'trade-editor',
    title: 'Inserimento trade',
    description:
      'Cliccando su un giorno del calendario si apre la finestra dove puoi inserire le operazioni.\n\nDa qui puoi aggiungere uno o più trade, compilare P&L, simbolo, direzione, orario, setup, note e link ai grafici.\n\nPer le immagini puoi usare i link di TradingView oppure i link a immagini caricate su Google Drive o altri servizi di storage online.',
    cta: 'Avanti',
  },
  {
    target: 'workspace-tabs',
    title: 'Spazi di lavoro',
    description:
      'Gli spazi di lavoro servono a tenere separate le analisi.\n\nPersonale è il journal principale, dove tieni le operazioni reali.\nBacktest serve per analizzare le sessioni di backtest.\nPreview serve per controllare velocemente un journal esterno o un backup importato.',
    cta: 'Avanti',
  },
  {
    target: 'import-export-buttons',
    title: 'Import / Export',
    description:
      'Import ed Export servono per gestire i backup del journal.\n\nI dati vengono salvati in locale nel browser, quindi è sempre consigliato esportare una copia fisica del file JSON e conservarla in un posto sicuro.\n\nQuando importi un file, puoi scegliere se aggiungerlo ai dati attuali oppure sovrascrivere quelli presenti. Prima di sovrascrivere, è sempre meglio esportare un backup dei dati attuali.\n\nPuoi anche inviare i tuoi dati a un’altra persona, per farlo ti basterà inviare il file JSON: chi lo riceve dovrà cliccare sul pulsante “Importa” e inserire il file. Una volta fatto, potrà visualizzare una copia del tuo journal.',
    cta: 'Avanti',
  },
  {
    target: 'stats-grid',
    title: 'Statistiche principali',
    description:
      'Sotto al calendario trovi un riepilogo immediato delle tue performance.\n\nQueste card ti aiutano a leggere velocemente P&L, numero di trade, win rate, media dei risultati e altri dati utili per capire come sta andando il journal.',
    cta: 'Avanti',
  },
  {
    target: 'analysis-section',
    title: 'Analisi',
    description:
      'La sezione Analisi raccoglie grafici e dati più dettagliati sul tuo journal.\n\nScrollando troverai altre statistiche utili, come distribuzioni, tabella mensile ed Execution Map.\n\nPuoi cliccare sui grafici per visualizzare le statistiche e le operazioni collegate a quel dato.',
    cta: 'Vai ad Analisi',
  },
  {
    target: 'profile-button',
    title: 'Profilo trader',
    description:
      'Il profilo raccoglie la tua identità e i tuoi progressi dentro EclipseJournal.\n\nDa qui puoi vedere statistiche personali, livello, rank e impostazioni del Journal.',
    cta: 'Avanti',
  },
  {
    target: 'help-button',
    title: 'Help',
    description:
      'La sezione Help è il punto di riferimento quando vuoi rivedere come funziona l’app.\n\nQui trovi una guida rapida, le novità degli aggiornamenti e il pulsante per riavviare il tutorial quando vuoi.\n\nOra puoi chiudere il tutorial e farti un giro nell’app per esplorare le sezioni, controllare i dati demo e provare EclipseJournal con calma.',
    cta: 'Fine',
    action: 'complete',
  },
];
