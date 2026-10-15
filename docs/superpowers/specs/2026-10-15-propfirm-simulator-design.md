# Simulatore Prop Firm — design

Data: 2026-10-15 · Stato: da approvare

## Obiettivo
Permettere di simulare conti prop firm (futures) con le regole di ogni firm: fase di valutazione, fase funded e tracciamento dei payout. Il simulatore legge i trade già presenti nei journal, senza doppio inserimento.

## Decisioni già prese con l'utente
- I risultati vengono **dai trade del journal**: ogni conto simulato è collegato a un journal (conto o Backtest) e a una data di inizio.
- Le regole sono **modelli per firm e piano, precompilati e modificabili** (le firm le cambiano spesso e le fonti trovate sono in parte in conflitto).
- Firm iniziali: Topstep, Apex Trader Funding, MyFundedFutures, Tradeify, Alpha Futures, Lucid Trading, Take Profit Trader.
- Nuova scheda **Propfirm** accanto a Calendario e Analisi, ispirata alla schermata di riferimento (griglia di firm, poi i conti).

## Fuori scopo (prima versione)
Costi e commissioni delle firm (attivazione, reset), scheda "Certificates", copy trading, promozioni, drawdown intraday esatto (vedi Limiti).

## Modello dati
`PropAccount`
- `id`, `firmId`, `planId`, `name`, `accountSize`
- `journalId` (workspace collegato), `startDate`
- `rules`: copia modificabile delle regole del piano (vedi sotto), con `templateVersion` e `verifiedAt` del modello di partenza
- `phases`: elenco di `PropPhase` { `kind`: `evaluation` | `funded`, `startDate`, `endDate?`, `status`: `active` | `passed` | `failed`, `failReason?`, `startingBalance` }
- `payouts`: elenco di { `id`, `date`, `gross`, `note?` }

`PropRules` (uguali per tutte le firm, i valori cambiano)
- `profitTarget` (importo, o `null` in funded)
- `drawdown`: { `amount`, `type`: `eod-trailing` | `intraday-trailing` | `static`, `locksAtStart`: boolean (smette di salire quando raggiunge il saldo iniziale) }
- `dailyLossLimit`: { `amount`, `effect`: `breach` | `lock-day` } oppure `null`
- `consistency`: { `maxDayShare` (es. 0.5), `appliesTo`: `evaluation` | `funded` | `both` } oppure `null`
- `minTradingDays`
- `payout`: { `split` (es. 0.9), `minRequest`, `minWinningDays`, `winningDayMin`, `bufferAboveStart`, `capPerPayout?`, `cadenceDays?` }
- `maxContracts?` (solo informativo)

Salvataggio: chiave `eclipse-trading-journal-propfirm` nel browser. Esportata e ripristinata col backup completo (nuova sezione `propAccounts`, retrocompatibile).

## Motore delle regole (funzioni pure, testate)
Input: trade del journal collegato dalla data di inizio, regole, fase. Output per giorno e totale:
- saldo, profitto, picco del saldo a fine giornata
- soglia di drawdown corrente (trailing a fine giornata, bloccata al saldo iniziale se `locksAtStart`; fissa se `static`)
- P&L del giorno vs limite giornaliero
- miglior giorno / profitto totale (consistenza), giorni di trading, giorni vincenti
- esito: `active` | `passed` (obiettivo raggiunto + giorni minimi + consistenza) | `failed` (drawdown o limite giornaliero violato, con data e motivo)
- per il funded: payout disponibile (profitto sopra il buffer, giorni vincenti, consistenza), quota spettante (`split`), totale incassato

Un trade senza orario o a P&L zero non cambia saldo né giorni vincenti. I giorni si raggruppano per data di uscita.

## Interfaccia
1. **Elenco firm**: griglia di carte per firm; clic → scelta piano e dimensione → conto simulato (nome, journal, data inizio).
2. **Conti**: schede con stato (valutazione / funded / superato / fallito), saldo, barra obiettivo, margine di drawdown, avvisi.
3. **Dettaglio conto**: grafico del saldo con linea di drawdown, tabella per giorno, regole modificabili, passaggio di fase (`Avvia funded` dopo un esito superato, `Reset` dopo un fallimento), registro payout con totale incassato e payout disponibile.
4. Ogni numero delle regole è modificabile e mostra "modello del <data>, controlla sul sito della firm".

## Limiti dichiarati
- Il journal ha solo trade chiusi: il drawdown **intraday** (che segue anche i profitti non chiusi) viene approssimato con i saldi dopo ogni trade; l'app lo segnala sul conto.
- Le regole dei modelli vengono da fonti non ufficiali e in parte discordanti: ogni modello riporta data di verifica e fonti, e va controllato dall'utente.

## Dati dei modelli (da verificare, ricerca del 2026-10-15)
Valori più concordanti nelle fonti; tutto il resto resta `null` e va compilato dall'utente.

| Firm / piano | Obiettivo | Drawdown | Limite giornaliero | Consistenza | Payout |
|---|---|---|---|---|---|
| Topstep 50K/100K/150K | 3.000 / 6.000 / 9.000 | 2.000 / 3.000 / 4.500, EOD trailing, si blocca al saldo iniziale | 1.000 / 2.000 / 3.000, blocca il giorno | valutazione 50% | split 90/10, minimo 125; XFA: 5 giorni vincenti da 150, o 3 giorni con 40% |
| Apex EOD 25K/50K/100K/150K | 1.500 / 3.000 / 6.000 / 9.000 | 1.000 / 2.000 / 3.000 / 4.000, EOD trailing | — | 50% solo nei payout | 5 giorni qualificanti, 50% consistenza |
| MyFundedFutures Core 50K | da verificare | 1.500, EOD trailing | — | 40–50% | split 80/20, ogni 5 giorni vincenti |
| Tradeify Select 50K | 3.000 | EOD trailing | — | 40% | split 90/10 |
| Alpha Futures Advanced | 8% | 3,5%, EOD trailing | — | 40% in valutazione | split 90/10, ogni 5 giorni vincenti, minimo 200 |
| Lucid Flex 50K–150K | 3.000 / 6.000 / 9.000 | 2.000 / 3.000 / 4.500, EOD trailing | — | 50% nella valutazione | split 90/10 |
| Take Profit Trader Test | 6% | 1.500 (25K) … 4.500 (150K) | nessuno | 50% | PRO split 80/20, payout da subito, drawdown intraday in PRO |

Fonti: guide di TradersPost, TradeTanto, PropTradingVibes, TradingFunder, Futures Hive e Curved Trading, consultate il 2026-10-15.

## Test
- Motore: drawdown trailing a fine giornata con blocco, drawdown fisso, limite giornaliero (blocco giorno e violazione), consistenza, giorni minimi, passaggio superato/fallito, calcolo payout e split.
- Dati: salvataggio, backup completo con `propAccounts`, import di backup senza `propAccounts`.
- Interfaccia: creazione conto, modifica regole, passaggio di fase, registrazione payout, prova nel browser.

## Rischi
- Regole sbagliate nei modelli → mitigato con data di verifica, avviso e regole modificabili.
- Spazio nel browser: i conti simulati occupano poco (solo configurazione e payout).
