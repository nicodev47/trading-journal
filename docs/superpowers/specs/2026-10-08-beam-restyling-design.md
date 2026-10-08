# EclipseJournal – Restyling "Beam" (design)

## Obiettivo
Restyling puramente visivo, ispirato a joinbeam.app e b-r.io (estetica Apple). Nessuna funzione, layout o dato cambia. Lavoro nel branch `redesign`, senza pubblicare.

## Vincoli
- Solo tema scuro (come oggi e come i riferimenti).
- Nessuna modifica alla logica; i test esistenti e `npm run build` devono continuare a passare.
- `main` e il deploy Netlify restano intatti fino a decisione esplicita.

## Palette (src/styles.css)
- Sfondo `#0a0a0b`; card `#111113` con bordo `rgba(255,255,255,0.08)`; superfici secondarie `#1a1a1d`.
- Testo `#f5f5f7`; secondario `#8e8e93`.
- Accento blu `#0a84ff` (primary, ring, link, selezione).
- Profitto `#30d158`, perdita `#ff453a` (solo colori funzionali).

## Forme
- `--radius` 16px; card/dialog 20px; bottoni/input 12px; pill tonde.
- Niente ombre pesanti: bordi sottili, lieve glow in hover.

## Tipografia
- Inter per tutto il testo; cifre con `tabular-nums` (no monospace).
- Titoli più grandi con tracking negativo; testi secondari discreti; più spazio tra sezioni.

## Componenti
Nav a pill compatta; bottoni primario blu / secondario grigio / ghost; input, select, dialog con focus ring blu; calendario, statistiche e grafici con card ariose, griglie leggere e tinte coerenti; share card e tutorial sui nuovi token.

## Esecuzione
1. Token globali + font in `styles.css`.
2. Ritocco per componente (nav, card, dialog, calendario, grafici), colori hardcoded inclusi, verifica nel preview.
3. Verifica finale: `npm run build` + `npm test`.

## Rischio
Molti colori sono hardcoded nei componenti (classi Tailwind/hex): serve toccare più file, solo stile.
