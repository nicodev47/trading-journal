export interface GuideSection {
  title: string;
  items: string[];
}

export interface FirmGuide {
  firmId: string;
  sections: GuideSection[];
  /** Official pages the text comes from. */
  sources: { label: string; url: string }[];
  /** What the firm does not publish or the simulator does not model. */
  gaps: string[];
}

/**
 * Rules and procedures of every firm, written from the firms' own help centers
 * (read on 17 Oct 2026). Numbers change: the source links are the reference.
 */
export const GUIDES: FirmGuide[] = [
  {
    firmId: 'topstep',
    sections: [
      {
        title: 'Trading Combine (valutazione)',
        items: [
          'Taglie 50K / 100K / 150K, obiettivo 3.000 / 6.000 / 9.000 USD, drawdown massimo (MLL) 2.000 / 3.000 / 4.500 USD.',
          'Il MLL segue il saldo a fine giornata verso l’alto e non scende mai; quando arriva al saldo iniziale si blocca per sempre. P&L realizzato e non realizzato contano, il controllo è in tempo reale.',
          'Se tocchi il MLL il conto viene liquidato per quella giornata e non puoi essere finanziato finché non fai un Reset (a pagamento).',
          'Il limite giornaliero è facoltativo e si aggiunge all’acquisto.',
        ],
      },
      {
        title: 'Express Funded Account (XFA)',
        items: [
          'Parti da saldo 0: la taglia indica solo il potere d’acquisto. Il MLL parte da -2.000 / -3.000 / -4.500 e si alza col saldo fino a bloccarsi a 0.',
          'Dopo il primo payout il MLL diventa 0 per sempre: se il saldo arriva a 0 il conto si chiude.',
          'Se tocchi il MLL il conto è chiuso. Puoi riattivarlo a pagamento con Back2Funded: riparte da saldo 0, statistiche azzerate, MLL al valore iniziale. Il Reset vale solo per il Combine.',
          'Payout dal Dashboard durante gli orari CME. Minimo 125 USD, split 90/10 (chi è entrato nel nuovo dashboard prima del 12 gen 2026 prende il 100% dei primi 10.000 USD di profitti totali).',
        ],
      },
      {
        title: 'XFA · Percorso Standard',
        items: [
          '5 giorni vincenti da almeno 150 USD di P&L netto (non consecutivi) e profitto netto positivo dall’ultimo payout (il primo payout è esente dal controllo).',
          'Massimo per richiesta: 50% del saldo, con tetto 2.000 (50K), 3.000 (100K), 5.000 (150K).',
          'Dopo ogni payout il conteggio dei 5 giorni riparte.',
        ],
      },
      {
        title: 'XFA · Percorso Consistenza',
        items: [
          '3 giorni di trading (almeno un trade ciascuno) e il giorno migliore non può superare il 40% del profitto netto totale.',
          'Massimo per richiesta: 50% del saldo, con tetto 3.000 (50K), 4.000 (100K), 6.000 (150K).',
          'Dopo ogni payout il calcolo della consistenza riparte: i profitti del ciclo precedente restano nel saldo ma non contano per il nuovo ciclo.',
        ],
      },
      {
        title: 'Live Funded Account (LFA)',
        items: [
          'Arriva per chiamata di Topstep, a sua discrezione: non esistono criteri pubblicati.',
          'Payout standard: 5 giorni vincenti da 150 USD per ciclo, fino al 50% del saldo senza tetto in dollari.',
          'Dopo 30 giorni vincenti (non consecutivi) da 150 USD nell’LFA si sbloccano i payout giornalieri, minimo 125 USD. I giorni dell’XFA non contano.',
          'Richiedere il 100% chiude l’LFA, perché il saldo arriva al MLL.',
        ],
      },
      {
        title: 'Procedure',
        items: [
          'Giornata di trading: dalle 17:00 CT alle 15:10 CT del giorno dopo. Una richiesta dopo le 17:00 CT conta per il giorno successivo.',
          'Dopo l’approvazione l’importo viene tolto dal saldo; toccare il MLL dopo non annulla il payout.',
          'I conti Live vanno fermati finché il payout non è elaborato.',
        ],
      },
    ],
    gaps: [
      'Il MLL dell’LFA e i criteri di chiamata al Live non sono pubblicati.',
      'Il simulatore usa la taglia come saldo iniziale dell’XFA: i livelli sono gli stessi ma il saldo mostrato è 50.000 e non 0.',
    ],
    sources: [
      { label: 'Maximum Loss Limit', url: 'https://help.topstep.com/en/articles/8284204-what-is-the-maximum-loss-limit' },
      { label: 'Payout', url: 'https://help.topstep.com/en/articles/8284233' },
      { label: 'Reset', url: 'https://help.topstep.com/en/articles/8284128-what-is-a-reset' },
    ],
  },
  {
    firmId: 'apex',
    sections: [
      {
        title: 'Performance Account (dopo la valutazione)',
        items: [
          'Stessa taglia della valutazione superata. Taglie 25K / 50K / 100K / 150K, drawdown massimo 1.000 / 2.000 / 3.000 / 4.000, contratti 2 / 4 / 6 / 10.',
          'EOD: il drawdown si calcola una volta al giorno alla chiusura e si controlla durante la giornata, con limite giornaliero a livelli e scaling dei contratti.',
          'Intraday: il drawdown segue il picco in tempo reale, anche i profitti non chiusi; si ferma a saldo iniziale + 100.',
          'Se il saldo (non realizzato compreso) tocca la soglia, le posizioni vengono chiuse e il conto è chiuso per sempre.',
          'Regole nuove per i conti acquistati dal 1 marzo 2026; i precedenti restano con le regole legacy.',
        ],
      },
      {
        title: 'Payout',
        items: [
          'Fino a un payout a settimana, split 100%, minimo 500 USD, massimo 6 payout per conto: dopo il sesto il PA si chiude e se ne ottiene un altro superando un’altra valutazione.',
          '5 giorni di trading con profitto minimo: EOD 100 / 250 / 300 / 350 USD, Intraday 100 / 200 / 250 / 300 USD (25K / 50K / 100K / 150K). Non devono essere consecutivi e non c’è scadenza.',
          'Consistenza 50%: nessun giorno profittevole può valere il 50% o più del profitto dall’ultimo payout approvato.',
          'Safety net = drawdown + 100 USD, da mantenere per tutta la vita del conto: si può richiedere solo il profitto sopra. Saldo minimo per richiedere: 26.600 / 52.600 / 103.600 / 154.600.',
          'Tetti per payout EOD, payout 1 → 6: 25K sempre 1.000; 50K 1.500, 1.500, 2.000, 2.500, 2.500, 3.000; 100K 2.000, 2.500, 2.500, 3.000, 4.000, 4.000; 150K 2.500, 3.000, 3.000, 3.000, 4.000, 5.000.',
          'Tetti Intraday: 50K 1.500, 2.000, 2.500, 2.500, 3.000, 3.000; 100K 2.000, 2.500, 3.000, 3.000, 4.000, 4.000; 150K 2.500, 3.000, 3.000, 4.000, 4.000, 5.000.',
          'Puoi continuare a fare trading dopo la richiesta, ma se il saldo scende sotto il minimo richiesto la richiesta viene negata in automatico.',
        ],
      },
      {
        title: 'Conto Live',
        items: [
          'Saldo iniziale 0, drawdown EOD 3.000, 3 mini / 30 micro, split 90/10, payout giornalieri con minimo 500 USD.',
          'Safety net 3.100: raggiunto, il drawdown si blocca a +100. Fino a 5 conti live, inattività dopo 30 giorni.',
        ],
      },
    ],
    gaps: [
      'Scaling a livelli e limite giornaliero a livelli del PA non sono applicati dal simulatore.',
      'Il drawdown intraday è approssimato con i saldi a fine giornata.',
      'Le regole legacy (conti prima del 1 marzo 2026) non sono incluse.',
    ],
    sources: [
      { label: 'EOD Payouts', url: 'https://apextraderfunding.com/help-center/eod-trailing-drawdown-accounts/eod-payouts/' },
      { label: 'EOD Performance Accounts', url: 'https://apextraderfunding.com/help-center/eod-trailing-drawdown-accounts/eod-performance-accounts-pa/' },
      { label: 'Intraday Payouts', url: 'https://apextraderfunding.com/help-center/intraday-trailing-drawdown-accounts/intraday-trailing-drawdown-payouts/' },
    ],
  },
  {
    firmId: 'alpha',
    sections: [
      {
        title: 'Standard',
        items: [
          'Taglie 50K / 100K / 150K, obiettivo 3.000 / 6.000 / 9.000, MLL 2.000 / 3.000 / 4.500, Daily Loss Guard 1.000 / 2.000 / 3.000 (solo sul conto qualificato).',
          'Si supera la valutazione raggiungendo l’obiettivo con la consistenza al 50%; l’unico modo di fallire è toccare il MLL. Consistenza 40% sul conto qualificato.',
          'Contratti massimi 5 / 10 / 15 mini; lo scaling vale solo sui conti qualificati. Reset della valutazione 109 / 199 / 289 USD.',
        ],
      },
      {
        title: 'Payout (Standard, Advanced, Zero)',
        items: [
          'Fino a 4 richieste al mese. Ogni richiesta chiede 5 giorni vincenti da almeno 200 USD accumulati dopo l’ultima, non consecutivi.',
          'Importo: fino al 50% del profitto, entro il tetto del conto. L’importo richiesto esce dal conto e ricevi il 90%.',
          'Limiti per richiesta: Standard 50K 500–3.000, 100K 500–4.000, 150K 500–5.000; Zero 25K 200–1.000, 50K 200–1.500, 100K 200–2.500 (consistenza 40%); Advanced 1.000–15.000 senza consistenza.',
          'Il MLL non si azzera al primo prelievo: resta dov’è.',
        ],
      },
      {
        title: 'Direct',
        items: [
          'Nessun giorno vincente: serve un obiettivo di prelievo — primo 1.500 / 3.000 / 6.000 / 9.000, dai successivi 1.000 / 2.000 / 4.000 / 6.000 (25K / 50K / 100K / 150K) — e la consistenza al 20%.',
          'Gli obiettivi si azzerano a ogni prelievo. Limiti per richiesta 500–1.000 / 2.000 / 2.500 / 3.000.',
        ],
      },
      {
        title: 'Path to Live',
        items: [
          'Il percorso verso il Live esiste, con fino a 5 conti live; le regole di accesso non sono pubblicate nelle pagine che ho letto.',
        ],
      },
    ],
    gaps: [
      'Il limite di 4 payout al mese non è applicato dal simulatore.',
      'Le soglie del Path to Live non sono pubblicate: il simulatore non le modella.',
    ],
    sources: [
      { label: 'Payout Policy', url: 'https://help.alpha-futures.com/en/articles/9492051-payout-policy' },
      { label: 'Standard Account Overview', url: 'https://help.alpha-futures.com/en/articles/11632512-standard-account-overview' },
    ],
  },
  {
    firmId: 'lucid',
    sections: [
      {
        title: 'LucidFlex · conto funded',
        items: [
          'Split 90/10, nessun buffer, nessuna consistenza in funded. Il limite giornaliero è facoltativo e si sceglie all’acquisto.',
          'Payout: 5 giorni diversi del ciclo con profitto minimo 100 / 150 / 200 / 250 USD (25K / 50K / 100K / 150K) e profitto netto positivo nel ciclo; il minimo si azzera a ogni payout approvato.',
          'Minimo 500 USD. Massimo 50% del profitto, con tetto 1.000 / 2.000 / 2.500 / 3.000 che non cresce coi payout successivi.',
          'Fino a 5 payout per conto, poi il conto passa a Live. Nessuna finestra fissa: puoi chiedere ogni giorno in cui hai i requisiti.',
          'La richiesta è definitiva: non si modifica né si annulla. Dopo l’approvazione l’importo esce in pochi minuti e arriva entro 2 giorni lavorativi.',
          'Un trade fatto prima dell’elaborazione che porta il saldo sotto l’importo richiesto può far negare il payout.',
        ],
      },
      {
        title: 'Drawdown',
        items: [
          'Valutazione e funded: drawdown 1.000 / 2.000 / 3.000 / 4.500 che segue il saldo e si blocca a saldo iniziale + 100. Dopo il primo payout si blocca per sempre.',
        ],
      },
    ],
    gaps: [
      'La pagina ufficiale è incoerente sulla base del 50% (saldo o profitto): il simulatore usa il profitto.',
      'Importi del limite giornaliero del Flex non pubblicati: uso quelli di LucidPro.',
      'Lo split del Live non è indicato.',
    ],
    sources: [{ label: 'LucidFlex Payouts', url: 'https://support.lucidtrading.com/en/articles/12945796' }],
  },
  {
    firmId: 'mffu',
    sections: [
      {
        title: 'Rapid (Intraday) e Rapid EOD',
        items: [
          'Valutazione: obiettivo 3.000 / 6.000 / 9.000 per 50K / 100K / 150K, MLL 2.000 / 3.000 / 4.500 a fine giornata, nessun limite giornaliero, consistenza 50% (solo valutazione), minimo 2 giorni, news Tier 1 ammesse.',
          'Sim funded: saldo 0. Rapid ha drawdown intraday: segue il picco in tempo reale e si ferma a +100. Nessuna consistenza, news Tier 1 vietate.',
          'Payout giornalieri, il primo 24 ore dopo il primo trade. Buffer 2.100 / 3.100 / 4.600 di profitto realizzato, minimo 500 USD, split 90/10.',
        ],
      },
      {
        title: 'Rapid · Live',
        items: [
          'Passaggio automatico con 10.000 USD di profitto netto in una sessione (il resto oltre i 10.000 si perde) oppure per decisione discrezionale del Risk Management.',
          'Fino a 5.000 USD di profitto sim vanno nella Reserve; il resto è prelevabile. Il sim funded va dormiente.',
          'Live: saldo 0, MLL EOD 1.000 / 2.000 / 3.000 / 4.500, nessun buffer, payout giornalieri, split 90/10. Il MLL sale col saldo e si ferma a 0.',
          'Se il Live viene bruciato la Reserve copre il saldo negativo.',
        ],
      },
      {
        title: 'Pro',
        items: [
          'Valutazione: obiettivo 3.000 / 6.000 / 9.000 (One Day 4.000), MLL EOD 2.000 / 3.000 / 4.500, consistenza 50% (One Day nessuna), minimo 2 giorni (One Day 1).',
          'Sim funded: split 80/20, nessun limite giornaliero né consistenza, news Tier 1 vietate.',
          'Payout dopo 14 giorni di calendario dal primo trade, con buffer 2.100 / 3.100 / 4.600; prima del buffer si può prelevare fino al 60% dei profitti. Minimo 1.000 USD, massimo 100.000 per utente.',
          'Dopo il primo payout il MLL diventa statico a 50.100 / 100.100 / 150.100.',
          'Revisione per il Live: tre payout consecutivi sullo stesso conto, tetto di 100.000 raggiunto, invito del Risk Management o 20.000 USD di profitto (solo revisione).',
          'Live Pro: saldo 0, MLL EOD 2.000 / 3.000 / 4.500, split 80/20, minimo payout 250. La Reserve si sblocca con 20 giorni live in profitto e 10.000 / 20.000 / 30.000 USD di payout lordi.',
        ],
      },
      {
        title: 'Builder (25K e 50K)',
        items: [
          'Consistenza 50%. Payout a partire da 2 giorni, minimo 250 (25K) / 500 (50K), massimo 1.000 / 2.000 per richiesta, split 80/20.',
          'Dopo il primo payout il MLL si azzera a 100.',
        ],
      },
    ],
    gaps: [
      'Il drawdown intraday è approssimato con i saldi a fine giornata.',
      'Reserve e Performance Bonus, la soglia dei 10.000 in una sessione e le chiamate al Live non sono simulati.',
      'Conflitto tra la pagina del Rapid, che chiama EOD il drawdown di valutazione, e quella del sim funded, che lo chiama intraday: seguo la pagina del sim funded.',
    ],
    sources: [
      { label: 'Payout policy', url: 'https://help.myfundedfutures.com/en/articles/13745661-payout-policy-overview-best-and-fastest-prop-firm-payouts' },
      { label: 'Rapid 100K', url: 'https://help.myfundedfutures.com/en/articles/13286542-rapid-plan-100k-a-comprehensive-look' },
      { label: 'Rapid Live', url: 'https://help.myfundedfutures.com/en/articles/13134718-understanding-rapid-live' },
      { label: 'Pro redesign', url: 'https://help.myfundedfutures.com/en/articles/17573707-comprehensive-look-into-redesigned-pro-plan' },
    ],
  },
  {
    firmId: 'tradeify',
    sections: [
      {
        title: 'Select Flex (5 giorni)',
        items: [
          'Drawdown massimo 1.000 / 2.000 / 3.000 / 4.500 (25K / 50K / 100K / 150K). Nessun limite giornaliero, nessuna consistenza, nessun saldo minimo.',
          'Payout ogni 5 giorni vincenti da 100 / 150 / 200 / 250 USD. Fino al 50% del profitto totale (saldo meno saldo iniziale) entro il tetto: 1.250 / 2.500 / 3.500 / 4.500 per i conti acquistati dal 1 settembre 2026 (prima: 1.250 / 3.000 / 4.000 / 5.000).',
          'Il drawdown si blocca a saldo iniziale + 100 quando il saldo a fine giornata raggiunge 26.100 / 52.100 / 103.100 / 154.600, oppure quando chiedi un payout se arriva prima.',
        ],
      },
      {
        title: 'Select Daily',
        items: [
          'Drawdown 1.000 / 2.000 / 2.500 / 3.500, limite giornaliero 500 / 1.000 / 1.250 / 1.750 (soft).',
          'Payout ogni giorno sopra il buffer 1.100 / 2.100 / 2.600 / 3.600. Puoi chiedere fino al doppio del profitto dall’ultimo payout, entro il tetto 600 / 1.250 / 1.750 / 2.500 (prima del 1 settembre 2026: 600 / 1.000 / 1.500 / 2.500).',
          'Blocco del drawdown a saldo iniziale + 100 con saldo a fine giornata 26.100 / 52.100 / 102.600 / 153.600.',
        ],
      },
      {
        title: 'Regole comuni Select',
        items: [
          'Split 90/10, minimo 250 USD. La scelta Flex o Daily è definitiva per ogni conto funded.',
          'Dopo il primo payout il profitto del ciclo deve essere positivo prima di chiedere ancora: le perdite vanno recuperate più almeno 1 USD.',
          'Una sola richiesta aperta alla volta. Fino a 5 conti funded in totale.',
          'Lo scaling dei contratti vale solo sui funded e dipende dall’equity a fine giornata (50K parte con 2 mini e arriva a 4).',
        ],
      },
      {
        title: 'Lightning (funded diretto)',
        items: [
          'Split 90/10. Il profitto da raggiungere per sbloccare il payout 1 è 1.500 / 3.000 / 6.000 / 9.000, dal secondo 1.000 / 2.000 / 3.500 / 4.500 (25K / 50K / 100K / 150K); si azzera a ogni payout.',
          'Consistenza 20% sul primo payout, 25% sul secondo, 30% dai successivi (conti dopo il 12 settembre 2025).',
          'Minimo 1.000 USD. Massimo per payout 1–3: 1.000 / 2.000 / 2.500 / 3.000; dal 4°: 1.000 / 2.500 / 3.000 / 3.500. Sul 25K il payout è sempre 1.000.',
          'Nessun minimo di giorni di trading.',
        ],
      },
      {
        title: 'Elite Live',
        items: [
          'Valutazione per il Live dopo 3 payout su un singolo conto oppure 10 payout complessivi dall’ultimo passaggio. Non è garantito: Tradeify valuta consistenza e gestione del rischio e contatta il trader.',
        ],
      },
    ],
    gaps: [
      'La pagina Select cita il drawdown sia come fine giornata sia come tempo reale: da confermare con Tradeify.',
      'Il numero massimo di payout per conto non è indicato.',
      'Growth non è stato riletto in questa sessione: i numeri vengono dal catalogo già verificato.',
    ],
    sources: [
      { label: 'Select Flex e Select Daily', url: 'https://help.tradeify.co/en/articles/12853966-select-flex-and-select-daily-payout-policies' },
      { label: 'Lightning', url: 'https://help.tradeify.co/en/articles/10495932-lightning-funded-account-payout-policy' },
    ],
  },
  {
    firmId: 'tpt',
    sections: [
      {
        title: 'Test',
        items: [
          'Sei regole: raggiungere l’obiettivo, non superare la posizione massima, non toccare il drawdown massimo a fine giornata, operare solo prodotti e orari approvati, essere consistenti, nessuna posizione opposta.',
        ],
      },
      {
        title: 'PRO',
        items: [
          'Drawdown intraday dal picco, compresi i profitti non chiusi; si ferma a saldo iniziale. Se arrivi al saldo minimo il conto viene liquidato.',
          'Split 80/20. Puoi prelevare dal primo giorno ma devi prima costruire il buffer, uguale al drawdown massimo: 26.500 / 52.000 / 77.500 / 103.000 / 154.500 (25K / 50K / 75K / 100K / 150K).',
          'Dopo il buffer prelevi all’80% del profitto totale. Il 50% del buffer si può prelevare quando il conto è chiuso.',
          'Almeno un giorno di trading per settimana (domenica–venerdì), un round-trip. Niente trading automatico. Posizioni piatte da 1 minuto prima a 1 minuto dopo FOMC, NFP e CPI.',
          'Devi chiudere le posizioni prima del limite giornaliero di prezzo del future.',
        ],
      },
      {
        title: 'PRO+ (live)',
        items: [
          'Il passaggio è deciso da TPT sulla base di consistenza, gestione del rischio e disciplina: non c’è una soglia unica.',
          'Il PRO va in pausa e 5.000 USD di profitto restano congelati finché il PRO+ è attivo; il resto è prelevabile con lo split PRO.',
          'PRO+ parte da saldo 0 con drawdown EOD uguale a quello iniziale del PRO (es. -2.000 sul 50K). Il minimo sale col saldo e si ferma a 0.',
          'Se perdi il PRO+, i profitti rimasti e la tua quota dei 5.000 congelati sono prelevabili; un saldo negativo viene tolto dai 5.000.',
        ],
      },
    ],
    gaps: [
      'Il drawdown intraday è approssimato con i saldi a fine giornata.',
      'Il buffer del PRO è applicato: sopra il buffer il simulatore calcola l’80% del profitto; il prelievo del 50% del buffer a conto chiuso non è modellato.',
      'Lo split del PRO+ (90/10) viene da fonti non ufficiali: la pagina PRO+ che ho letto non lo indica.',
      'Il requisito settimanale e il blocco dei 5.000 non sono simulati.',
    ],
    sources: [
      { label: 'PRO split e prelievi', url: 'https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15172219527581-PRO-Account-Profit-Split-Withdrawal-Rules' },
      { label: 'Upgrade a PRO+', url: 'https://takeprofittraderhelp.zendesk.com/hc/en-us/articles/15171978600349-PRO-Account-Upgrade-Process-Overview-and-Guidelines' },
    ],
  },
];

export const getGuide = (firmId: string) => GUIDES.find(guide => guide.firmId === firmId);
