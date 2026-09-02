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
    title: 'Conti e spazi di lavoro',
    description:
      'Gli spazi di lavoro servono a tenere separate operatività e analisi.\n\nDal selettore puoi creare nuovi conti, sessioni Backtest e spazi Preview. Quando aggiungi un conto puoi inserire anche una nota facoltativa con obiettivi, regole o informazioni utili.\n\nOgni spazio mantiene separati trade, calendario e statistiche e può essere rinominato, modificato o esportato individualmente.',
    cta: 'Avanti',
  },
  {
    target: 'import-export-buttons',
    title: 'Import / Export',
    description:
      'Import ed Export lavorano direttamente sulla pagina che hai aperto, senza chiederti di selezionare un altro conto.\n\nExport scarica il file JSON della pagina corrente. Import carica i dati nella stessa pagina e, se sono già presenti dati, ti permette di aggiungerli oppure sovrascriverli.\n\nPrima di procedere puoi usare la card viola “Scarica i dati attuali” per creare una copia di sicurezza e ripristinarla in seguito se necessario. Gli altri conti e spazi di lavoro non vengono modificati.',
    cta: 'Avanti',
  },
  {
    target: 'stats-grid',
    title: 'Statistiche principali',
    description:
      'Sopra al calendario trovi un riepilogo immediato delle tue performance.\n\nQueste card ti aiutano a leggere velocemente P&L, numero di trade, win rate e rapporto rischio rendimento, in modo da avere sempre a portata di mano i tuoi dati principali.',
    cta: 'Avanti',
  },
  {
    target: 'detailed-stats-equity',
    title: 'Statistiche dettagliate ed Equity',
    description:
      'Sotto al calendario trovi sei card con statistiche più dettagliate sulla tua operatività.\n\nInsieme alla curva Equity ti permettono di osservare serie, medie, setup, direzioni e andamento complessivo del journal con maggiore profondità.',
    cta: 'Avanti',
  },
  {
    target: 'analysis-section',
    title: 'Analisi',
    description:
      'La sezione Analisi raccoglie grafici e dati più dettagliati sul tuo journal.\n\nLa pagina scorrerà lentamente per mostrarti l’intera sezione: troverai distribuzioni, statistiche mensili, Execution Map e il Trade Log.\n\nPuoi cliccare sui grafici per visualizzare le statistiche e le operazioni collegate a quel dato.',
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
