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
      'Il calendario è il cuore del journal: ogni giorno mostra il risultato delle tue operazioni.\n\nClicca su un giorno per aggiungere i trade con P&L, setup, note e link ai grafici. Il giorno di oggi è evidenziato e il calendario mostra gli asset che hai scelto.',
    cta: 'Avanti',
  },
  {
    target: 'trade-editor',
    title: 'Inserimento trade',
    description:
      'Qui inserisci le operazioni del giorno: puoi aggiungere uno o più trade con P&L, asset, direzione, orario, setup, note e link ai grafici.\n\nI menu di asset e setup mostrano le tue scelte e le modifiche si salvano in automatico.\n\nPer le immagini usa i link di TradingView oppure di Google Drive e altri servizi online.',
    cta: 'Avanti',
  },
  {
    target: 'workspace-tabs',
    title: 'Conti e spazi di lavoro',
    description:
      'Gli spazi di lavoro tengono separate operatività e analisi.\n\nDal selettore crei conti e sessioni Backtest, con una nota facoltativa per obiettivi e regole.\n\nOgni spazio ha i suoi trade, il suo calendario e le sue statistiche, e può essere rinominato, modificato o esportato.',
    cta: 'Avanti',
  },
  {
    target: 'import-export-buttons',
    title: 'Dati e backup',
    description:
      'I dati del journal sono salvati nella cache del tuo browser, non su un server: se la cancelli o cambi dispositivo, li perdi. Per questo è importante fare backup regolari.\n\nExport scarica un file con i dati della pagina aperta e il tuo profilo, senza toccare gli altri conti. Con Import scegli se aggiungere i dati al profilo oppure aprire il file in Preview, una pagina di sola lettura che non cambia nulla nel tuo journal.',
    cta: 'Avanti',
  },
  {
    target: 'stats-grid',
    title: 'Statistiche principali',
    description:
      'Sopra al calendario trovi il riepilogo delle tue performance: P&L, numero di trade, win rate e rapporto rischio rendimento, sempre a colpo d’occhio.',
    cta: 'Avanti',
  },
  {
    target: 'detailed-stats-equity',
    title: 'Statistiche dettagliate ed Equity',
    description:
      'Sotto al calendario trovi le statistiche più dettagliate: setup, finestre operative, giorni e mesi migliori e peggiori, serie, Long vs Short, drawdown e profitto.\n\nInsieme alla curva Equity ti mostrano dove stai performando meglio e dove perdi di più.',
    cta: 'Avanti',
  },
  {
    target: 'analysis-section',
    title: 'Analisi',
    description:
      'La sezione Analisi raccoglie grafici e dati sul tuo journal, filtrabili per i tuoi asset e setup.\n\nLa pagina scorrerà per mostrarti distribuzioni, statistiche mensili, Execution Map e Trade Log.\n\nClicca sui grafici per vedere le operazioni collegate a ogni dato.',
    cta: 'Vai ad Analisi',
  },
  {
    target: 'profile-button',
    title: 'Profilo trader',
    description:
      'Il profilo raccoglie la tua identità e i tuoi progressi.\n\nNella scheda Profilo cambi nome e foto, vedi livello, rank e XP e, con il pulsante Share, crei la card del tuo profilo da condividere. Anche ogni trade ha la sua card Share.',
    cta: 'Avanti',
  },
  {
    target: 'profile-button',
    title: 'Le tue impostazioni',
    description:
      'Nella scheda Impostazioni del profilo modifichi quando vuoi gli asset, i setup e le finestre operative scelti all’inizio: menu, analisi e calendario si aggiornano di conseguenza.\n\nLì trovi anche il backup delle preferenze, mentre nella scheda Dati puoi esportare tutti i tuoi journal.',
    cta: 'Avanti',
  },
  {
    target: 'help-button',
    title: 'Help',
    description:
      'In Help trovi la guida rapida, le novità degli aggiornamenti e il pulsante per rivedere questo tutorial quando vuoi.\n\nOra puoi chiudere il tutorial ed esplorare l’app con calma: i dati che vedi sono demo e spariranno.',
    cta: 'Fine',
    action: 'complete',
  },
];
