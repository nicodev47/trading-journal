# Onboarding e personalizzazione del journal (design)

## Obiettivo
Rendere il journal usabile da qualunque trader: alla prima apertura un onboarding raccoglie nome, foto, asset, setup e finestre operative; il resto dell'app (menu, filtri, statistiche) si adatta a queste scelte. Le stesse scelte sono modificabili dal profilo.

## Vincoli
- Chi ha già dati salvati non vede l'onboarding: le preferenze vengono create in silenzio con i valori attuali (asset NQ, MNQ; setup Continuation, Reversal Sequence, Reversal Sequence Failed; le quattro finestre di `src/lib/operating-windows.ts`).
- Nessun trade, simbolo o setup già salvato deve sparire o cambiare.
- Stile: palette e tipografia attuali (nero neutro, font di sistema, raggi 16px card / 10px controlli).
- Lavoro nel branch `onboarding` (da `redesign`); niente pubblicazione.

## Dati
`JournalPreferences` (globale, localStorage `eclipse-trading-journal-preferences`):
- `onboardingCompleted: boolean`
- `name: string` (riusa `PROFILE_NAME_KEY`), `photo: string | null` (data URL, 256x256)
- `assets: string[]` (almeno 1)
- `setups: string[]` (testo libero; parole con iniziale maiuscola all'invio, il resto invariato; duplicati ignorati senza distinguere maiuscole)
- `windows: { id: string; name: string; start: string; end: string }[]` (HH:MM, facoltative)

Avvio: se non esistono preferenze → se esiste almeno un conto con dati: crea i default sopra con `onboardingCompleted: true`; altrimenti mostra l'onboarding. Un valore già usato in un trade (simbolo o setup) resta nelle statistiche anche se tolto dalle preferenze. Nel menu del trade che lo usa viene sempre proposto, in fondo alla lista e con la nota "non più nelle preferenze", così si può cambiare o ripristinare; nei menu degli altri trade non compare.

## Onboarding (schermo intero, diviso in due)
Sinistra, 4 passi con Indietro/Avanti: (1) Profilo: nome, foto facoltativa; (2) Asset: scelta multipla con ricerca da un catalogo (futures, forex, crypto, indici), minimo 1; (3) Setup: input a invio con rimozione ×; (4) Finestre: righe nome/inizio/fine, "Non ho una finestra fissa" per saltare.
Destra: anteprima dal vivo (card profilo con iniziali o foto, nome, asset scelti; mini calendario con asset e setup). Su telefono l'anteprima sta sopra, più piccola.

## Profilo con schede
Il profilo ha tre schede: **Profilo** (nome, foto, statistiche e livello, condivisione), **Operatività** (asset, setup, finestre: gli stessi componenti dell'onboarding), **Dati** (modalità streamer, esporta tutto, elimina tutti i dati).

## Integrazione
- Menu Simbolo e Setup del dialog trade e del dialog dettaglio usano le preferenze, più il valore già presente in quel trade (anche se non è più nelle preferenze, con la nota "non più nelle preferenze").
- Analisi: filtro asset e grafici per setup dalle preferenze unite ai valori presenti nei trade. `VALID_TRADE_SETUPS`/`isValidTradeSetup` sostituiti da "setup non vuoto".
- Finestre: `OPERATING_WINDOWS` fisse sostituite da `preferences.windows`; se vuote, "Finestra operativa migliore" usa la fascia oraria di 1 ora con il miglior risultato dai trade.
- Calendario: le etichette corte dei setup storici restano; gli altri sono troncati.
- Card di condivisione: foto al posto delle iniziali se presente.
- Esporta tutto include le preferenze; l'importazione le applica se presenti.

## Struttura codice
`src/lib/preferences.ts` (tipi, default legacy, normalizzazione, maiuscola), `src/lib/asset-catalog.ts`, `src/contexts/preferences-context.tsx`, `src/components/onboarding/*` (schermata, passi, anteprima), `src/components/trading-journal/preferences-editor.tsx` (componenti condivisi con la scheda Operatività), modifiche a day-editor, trade-detail, analysis, advanced-stats, operating-windows, profile-dialog.

## Test
Automatici (node --test): maiuscola setup e duplicati; decisione migrazione/onboarding; finestre personalizzate; fascia automatica; catalogo senza duplicati. Manuali nel preview: onboarding desktop e telefono, modifica dal profilo, utente con dati esistenti.

## Fuori da questa versione
Account utente e sincronizzazione tra dispositivi; ritaglio foto; eliminazione forzata di asset usati nei trade.
