import type { AccountKind, DrawdownType, PropRules } from './types.ts';

export interface SizeDef {
  label: string;
  size: number;
  rules: PropRules;
  /** Applied on top of the rules for funded and live accounts. */
  fundedOverrides?: Partial<PropRules>;
}

export interface RuleSetDef {
  id: string;
  name: string;
  /** Where these numbers come from and when they were checked. */
  note: string;
  /** No evaluation: the plan starts as a funded account. */
  fundedOnly?: boolean;
  sizes: SizeDef[];
}

export interface FirmDef {
  id: string;
  name: string;
  initials: string;
  /** Official logo copied from the firm's website (public/logos). */
  logo?: string;
  /** The logo has a transparent background: draw it on a dark tile. */
  logoOnDark?: boolean;
  /** Tailwind classes for the firm tile. */
  tile: string;
  /** Rules are written by the user instead of copied from a firm. */
  custom?: boolean;
  ruleSets: RuleSetDef[];
}

interface RuleInput {
  target: number | null;
  drawdown: number | null;
  type?: DrawdownType;
  locks?: boolean;
  lockOffset?: number;
  dailyLoss?: { amount: number; effect: 'breach' | 'lock-day' } | null;
  consistency?: PropRules['consistency'];
  minDays?: number;
  split: number;
  minRequest?: number;
  minWinningDays?: number;
  winningDayMin?: number;
  buffer?: number;
  cap?: number | null;
  caps?: number[];
  firstPayoutShare?: number;
  contracts?: string | null;
}

const rule = (input: RuleInput): PropRules => ({
  profitTarget: input.target,
  drawdown: {
    amount: input.drawdown,
    type: input.type ?? 'eod-trailing',
    locksAtStart: input.locks ?? true,
    lockOffset: input.lockOffset ?? 0,
  },
  dailyLossLimit: input.dailyLoss ?? null,
  consistency: input.consistency ?? null,
  minTradingDays: input.minDays ?? 0,
  payout: {
    split: input.split,
    minRequest: input.minRequest ?? 0,
    minWinningDays: input.minWinningDays ?? 0,
    winningDayMin: input.winningDayMin ?? 0,
    buffer: input.buffer ?? 0,
    capPerPayout: input.cap ?? null,
    ...(input.caps ? { capSchedule: input.caps } : {}),
    ...(input.firstPayoutShare !== undefined ? { firstPayoutShare: input.firstPayoutShare } : {}),
  },
  maxContracts: input.contracts ?? null,
});

const k = (size: number) => `${size / 1000}K`;

/** Rows of per-size numbers: zip({ target: [..], dd: [..] }, [25000, 50000]). */
const rows = <T extends Record<string, (number | string | null)[]>>(sizes: number[], columns: T) =>
  sizes.map((size, index) => ({
    size,
    ...(Object.fromEntries(Object.entries(columns).map(([key, values]) => [key, values[index]])) as {
      [K in keyof T]: T[K][number];
    }),
  }));

const note = (who: string, extra = '') =>
  `Regole dal centro assistenza ufficiale di ${who}, lette il 16 ott 2026.${extra ? ` ${extra}` : ''}`;

const num = (value: number | string | null | undefined) => (typeof value === 'number' ? value : 0);
const soft = (amount: number | string | null | undefined) =>
  typeof amount === 'number' && amount > 0 ? { amount, effect: 'lock-day' as const } : null;
const share = (maxDayShare: number, appliesTo: 'evaluation' | 'funded' | 'both') => ({ maxDayShare, appliesTo });
const trailing = (amount: number, type: DrawdownType, lockOffset: number): PropRules['drawdown'] => ({
  amount,
  type,
  locksAtStart: true,
  lockOffset,
});

const SIZES4 = [25000, 50000, 100000, 150000];

const lucidEval = rows(SIZES4, {
  target: [1250, 3000, 6000, 9000],
  dd: [1000, 2000, 3000, 4500],
  contracts: ['2 Mini OR 20 Micros', '4 Mini OR 40 Micros', '6 Mini OR 60 Micros', '10 Mini OR 100 Micros'],
  dll: [600, 1200, 1800, 2700],
});

const lucidDailyDll = [600, 1200, 1800, 2700];

export const FIRMS: FirmDef[] = [
  {
    id: 'topstep',
    name: 'Topstep',
    initials: 'TS',
    logo: '/logos/topstep.png',
    tile: 'from-[#4a4a4d] to-[#3a3a3d] border-white/15',
    ruleSets: [
      {
        id: 'combine',
        name: 'Trading Combine',
        note: note(
          'Topstep',
          'Il Combine non ha limite giornaliero (è facoltativo e si aggiunge all’acquisto). Nel conto funded valgono i 5 giorni vincenti da 150 USD; esiste anche il percorso con consistenza al 40% e 3 giorni di trading, con cap più alti (3.000 / 4.000 / 6.000). Dopo il primo payout il drawdown si azzera al saldo iniziale.'
        ),
        sizes: rows([50000, 100000, 150000], {
          dd: [2000, 3000, 4500],
          target: [3000, 6000, 9000],
          cap: [2000, 3000, 5000],
          contracts: ['5 Mini OR 50 Micros', '10 Mini OR 100 Micros', '15 Mini OR 150 Micros'],
        }).map(item => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            consistency: share(0.55, 'evaluation'),
            split: 0.9,
            minRequest: 125,
            minWinningDays: 5,
            winningDayMin: 150,
            cap: item.cap,
            contracts: item.contracts,
          }),
        })),
      },
    ],
  },
  {
    id: 'apex',
    name: 'Apex',
    initials: 'AP',
    logo: '/logos/apex.png',
    tile: 'from-[#1d3557] to-[#14243d] border-[#2a4a7a]/60',
    ruleSets: (['eod', 'intraday'] as const).map(mode => {
      const eod = mode === 'eod';
      const type: DrawdownType = eod ? 'eod-trailing' : 'intraday-trailing';

      return {
        id: mode,
        name: eod ? 'EOD' : 'Intraday',
        note: note(
          'Apex',
          eod
            ? 'Valutazione con limite giornaliero (fa solo fermare la giornata). Il Performance Account ha un limite giornaliero a livelli che qui non è incluso; i payout sono al 100%, massimo 6 per account.'
            : 'Valutazione senza limite giornaliero: il drawdown segue anche i profitti non chiusi (qui approssimato con i saldi a fine giornata). Il Performance Account ha un limite giornaliero a livelli che qui non è incluso; i payout sono al 100%, massimo 6 per account.'
        ),
        sizes: rows(SIZES4, {
          target: [1500, 3000, 6000, 9000],
          dd: [1000, 2000, 3000, 4000],
          dll: [500, 1000, 1500, 2000],
          contracts: ['4 contratti', '6 contratti', '8 contratti', '12 contratti'],
          fContracts: ['2 contratti', '4 contratti', '6 contratti', '10 contratti'],
          winDay: eod ? [100, 250, 300, 350] : [100, 200, 250, 300],
        }).map((item, index) => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            type,
            locks: false,
            dailyLoss: eod ? soft(item.dll) : null,
            consistency: share(0.5, 'funded'),
            split: 1,
            minRequest: 500,
            minWinningDays: 5,
            winningDayMin: item.winDay,
            buffer: item.dd + 100,
            caps: eod
              ? [
                  [1000, 1000, 1000, 1000, 1000, 1000],
                  [1500, 1500, 2000, 2500, 2500, 3000],
                  [2000, 2500, 2500, 3000, 4000, 4000],
                  [2500, 3000, 3000, 3000, 4000, 5000],
                ][index]
              : [
                  [1000, 1000, 1000, 1000, 1000, 1000],
                  [1500, 2000, 2500, 2500, 3000, 3000],
                  [2000, 2500, 3000, 3000, 4000, 4000],
                  [2500, 3000, 3000, 4000, 4000, 5000],
                ][index],
            contracts: item.contracts,
          }),
          fundedOverrides: {
            drawdown: trailing(item.dd, type, 100),
            dailyLossLimit: null,
            maxContracts: item.fContracts,
          },
        })),
      };
    }),
  },
  {
    id: 'alpha',
    name: 'Alpha Futures',
    initials: 'AF',
    logo: '/logos/alpha-futures.png',
    tile: 'from-[#1f4d36] to-[#17382a] border-[#2c7a53]/50',
    ruleSets: [
      {
        id: 'standard',
        name: 'Standard',
        note: note(
          'Alpha Futures',
          'Il Daily Loss Guard c’è solo sul conto qualificato. Consistenza 50% in valutazione e 40% sul qualificato. Massimo 4 payout al mese.'
        ),
        sizes: rows([50000, 100000, 150000], {
          target: [3000, 6000, 9000],
          dd: [2000, 3000, 4500],
          dll: [1000, 2000, 3000],
          cap: [3000, 4000, 5000],
          contracts: ['5 Mini OR 50 Micros', '10 Mini OR 100 Micros', '15 Mini OR 150 Micros'],
        }).map(item => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            consistency: share(0.5, 'evaluation'),
            split: 0.9,
            minRequest: 500,
            minWinningDays: 5,
            winningDayMin: 200,
            cap: item.cap,
            contracts: item.contracts,
          }),
          fundedOverrides: {
            dailyLossLimit: soft(item.dll),
            consistency: share(0.4, 'funded'),
          },
        })),
      },
      {
        id: 'advanced',
        name: 'Advanced',
        note: note(
          'Alpha Futures',
          'Nessun Daily Loss Guard. Consistenza 40% solo in valutazione, nessuna sul conto qualificato.'
        ),
        sizes: rows([50000, 100000, 150000], {
          target: [4000, 8000, 12000],
          dd: [1750, 3500, 5250],
          contracts: ['5 Mini OR 50 Micros', '10 Mini OR 100 Micros', '15 Mini OR 150 Micros'],
        }).map(item => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            consistency: share(0.4, 'evaluation'),
            split: 0.9,
            minRequest: 1000,
            minWinningDays: 5,
            winningDayMin: 200,
            cap: 15000,
            contracts: item.contracts,
          }),
        })),
      },
      {
        id: 'zero',
        name: 'Zero',
        note: note('Alpha Futures', 'Consistenza 40% solo sul conto qualificato; Daily Loss Guard sempre attivo.'),
        sizes: rows([25000, 50000, 100000], {
          target: [1500, 3000, 6000],
          dd: [1000, 2000, 3000],
          dll: [500, 1000, 2000],
          cap: [1000, 1500, 2500],
          contracts: ['1 Mini OR 10 Micros', '3 Mini OR 30 Micros', '6 Mini OR 60 Micros'],
        }).map(item => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            dailyLoss: soft(item.dll),
            consistency: share(0.4, 'funded'),
            split: 0.9,
            minRequest: 200,
            minWinningDays: 5,
            winningDayMin: 200,
            cap: item.cap,
            contracts: item.contracts,
          }),
        })),
      },
      {
        id: 'direct',
        name: 'Direct',
        fundedOnly: true,
        note: note('Alpha Futures', 'Conto funded diretto, senza valutazione. Consistenza 20% sui payout.'),
        sizes: rows(SIZES4, {
          dd: [1000, 2000, 3000, 4500],
          dll: [500, 1000, 2000, 3000],
          cap: [1000, 2000, 2500, 3000],
          contracts: ['2 Mini OR 20 Micros', '4 Mini OR 40 Micros', '8 Mini OR 80 Micros', '10 Mini OR 100 Micros'],
        }).map(item => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: null,
            drawdown: item.dd,
            dailyLoss: soft(item.dll),
            consistency: share(0.2, 'funded'),
            split: 0.9,
            minRequest: 500,
            cap: item.cap,
            contracts: item.contracts,
          }),
        })),
      },
    ],
  },
  {
    id: 'lucid',
    name: 'Lucid Trading',
    initials: 'LT',
    logo: '/logos/lucid.png',
    tile: 'from-[#555558] to-[#434346] border-white/15',
    ruleSets: [
      ...[false, true].map(withDll => ({
        id: withDll ? 'flex-dll' : 'flex',
        name: withDll ? 'Flex · con DLL' : 'Flex · senza DLL',
        note: note(
          'Lucid Trading',
          withDll
            ? 'Il limite giornaliero è facoltativo e si sceglie all’acquisto: fa solo fermare la giornata. Lucid non pubblica gli importi per il Flex: qui sono usati quelli di LucidPro. Nessuna consistenza in funded, nessun buffer, massimo 5 payout. Il primo payout è il 50% del profitto, i successivi possono prelevare tutto.'
            : 'Il limite giornaliero è facoltativo e si sceglie all’acquisto: qui è disattivato. Nessuna consistenza in funded, nessun buffer, massimo 5 payout. Il primo payout è il 50% del profitto, i successivi possono prelevare tutto.'
        ),
        sizes: lucidEval.map((item, index) => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            lockOffset: 100,
            dailyLoss: withDll && index > 0 ? soft(item.dll) : null,
            consistency: share(0.5, 'evaluation'),
            split: 0.9,
            minRequest: 500,
            minWinningDays: 5,
            winningDayMin: [100, 150, 200, 250][index],
            firstPayoutShare: 0.5,
            contracts: item.contracts,
          }),
        })),
      })),
      {
        id: 'pro',
        name: 'Pro',
        note: note(
          'Lucid Trading',
          'In funded il limite giornaliero diventa il 60% del miglior profitto a fine giornata (LucidScale): qui resta fisso. Consistenza 40% sui payout.'
        ),
        sizes: lucidEval.map((item, index) => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            lockOffset: 100,
            dailyLoss: index > 0 ? soft(item.dll) : null,
            consistency: share(0.4, 'funded'),
            split: 0.9,
            minRequest: 500,
            buffer: item.dd + 100,
            caps: [
              [1000, 1500],
              [2000, 2500],
              [2500, 3000],
              [3000, 3500],
            ][index],
            contracts: item.contracts,
          }),
        })),
      },
      {
        id: 'direct',
        name: 'Direct',
        fundedOnly: true,
        note: note(
          'Lucid Trading',
          'Conto funded diretto, senza valutazione. Consistenza 20% sui payout. Gli obiettivi di profitto per ogni payout non sono simulati.'
        ),
        sizes: rows(SIZES4, {
          dd: [1000, 2000, 3500, 5000],
          dll: [0, 1200, 2100, 3000],
          contracts: ['2 Mini OR 20 Micros', '4 Mini OR 40 Micros', '6 Mini OR 60 Micros', '10 Mini OR 100 Micros'],
        }).map((item, index) => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: null,
            drawdown: item.dd,
            lockOffset: 100,
            dailyLoss: soft(item.dll),
            consistency: share(0.2, 'funded'),
            split: 0.9,
            minRequest: 500,
            caps: [
              [1000],
              [2000, 2000, 2000, 2500],
              [2500, 2500, 2500, 3000],
              [3000, 3000, 3000, 3500],
            ][index],
            contracts: item.contracts,
          }),
        })),
      },
      ...([
        ['intraday', true, 'Daily · Intraday · con DLL'],
        ['eod', true, 'Daily · EOD · con DLL'],
        ['intraday', false, 'Daily · Intraday · senza DLL'],
        ['eod', false, 'Daily · EOD · senza DLL'],
      ] as const).map(([mode, withDll, name]) => ({
        id: `daily-${mode}-${withDll ? 'dll' : 'nodll'}`,
        name,
        note: note(
          'Lucid Trading',
          `Drawdown della valutazione ${mode === 'eod' ? 'a fine giornata' : 'intraday (qui approssimato con i saldi a fine giornata)'}; in funded è sempre intraday. ${withDll ? 'Il limite giornaliero fa solo fermare la giornata.' : 'Nessun limite giornaliero.'} Consistenza 50% solo in valutazione.`
        ),
        sizes: lucidEval.map((item, index) => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            type: mode === 'eod' ? 'eod-trailing' : 'intraday-trailing',
            lockOffset: 100,
            dailyLoss: withDll ? soft(lucidDailyDll[index]) : null,
            consistency: share(0.5, 'evaluation'),
            split: 0.9,
            minRequest: 500,
            buffer: item.dd + 100,
            contracts: item.contracts,
          }),
          fundedOverrides: { drawdown: trailing(item.dd, 'intraday-trailing', 100) },
        })),
      })),
    ],
  },
  {
    id: 'mffu',
    name: 'MyFundedFutures',
    initials: 'MF',
    logo: '/logos/myfundedfutures.png',
    tile: 'from-[#2f2f5a] to-[#25254a] border-[#4a4a8a]/50',
    ruleSets: [
      {
        id: 'rapid',
        name: 'Rapid',
        note: note(
          'MyFundedFutures',
          'Valutazione a fine giornata, nessun limite giornaliero. In sim funded il drawdown segue anche i profitti non chiusi (qui approssimato con i saldi a fine giornata), payout ogni 24 ore.'
        ),
        sizes: rows(SIZES4, {
          target: [1500, 3000, 6000, 9000],
          dd: [1000, 2000, 3000, 4500],
          contracts: ['3 Mini OR 30 Micros', '5 Mini OR 50 Micros', '8 Mini OR 80 Micros', '10 Mini OR 100 Micros'],
        }).map(item => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            lockOffset: 100,
            consistency: share(0.5, 'evaluation'),
            minDays: 2,
            split: 0.9,
            minRequest: 500,
            buffer: item.dd + 100,
            contracts: item.contracts,
          }),
          fundedOverrides: { drawdown: trailing(item.dd, 'intraday-trailing', 100) },
        })),
      },
      {
        id: 'rapid-eod',
        name: 'Rapid EOD',
        note: note(
          'MyFundedFutures',
          'Valutazione e sim funded a fine giornata, nessun limite giornaliero, consistenza 30% in valutazione, payout ogni giorno senza limite per payout.'
        ),
        sizes: rows([25000, 50000], {
          target: [1500, 3000],
          dd: [1000, 2000],
          contracts: ['2 Mini OR 20 Micros', '3 Mini OR 30 Micros'],
        }).map(item => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            lockOffset: 100,
            consistency: share(0.3, 'evaluation'),
            minDays: 4,
            split: 0.9,
            minRequest: 500,
            buffer: item.dd + 100,
            contracts: item.contracts,
          }),
        })),
      },
      {
        id: 'pro',
        name: 'Pro',
        note: note(
          'MyFundedFutures',
          'Nessun limite giornaliero. In sim funded split 80/20, payout dopo 14 giorni dal primo trade e massimo 100.000 USD per utente.'
        ),
        sizes: rows([50000, 100000, 150000], {
          target: [3000, 6000, 9000],
          dd: [2000, 3000, 4500],
          contracts: ['3 Mini OR 30 Micros', '6 Mini OR 60 Micros', '9 Mini OR 90 Micros'],
        }).map(item => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            lockOffset: 100,
            consistency: share(0.5, 'evaluation'),
            minDays: 2,
            split: 0.8,
            minRequest: 1000,
            buffer: item.dd + 100,
            contracts: item.contracts,
          }),
        })),
      },
      {
        id: 'pro-one-day',
        name: 'Pro One Day',
        note: note('MyFundedFutures', 'Variante del Pro: obiettivo 4.000 USD, nessuna consistenza, basta un giorno.'),
        sizes: [
          {
            label: '50K',
            size: 50000,
            rules: rule({
              target: 4000,
              drawdown: 2000,
              lockOffset: 100,
              minDays: 1,
              split: 0.8,
              minRequest: 1000,
              buffer: 2100,
              contracts: '3 Mini OR 30 Micros',
            }),
          },
        ],
      },
      {
        id: 'builder',
        name: 'Builder',
        note: note(
          'MyFundedFutures',
          'Limite giornaliero morbido (ferma la giornata). Drawdown standard: l’add-on con drawdown ridotto non è incluso. Consistenza 50% solo sui payout, massimo 5 payout simulati.'
        ),
        sizes: rows(SIZES4, {
          target: [1500, 3000, 6000, 9000],
          dd: [1000, 2000, 3000, 4500],
          dll: [600, 1000, 1750, 2500],
          minRequest: [250, 500, 1000, 1500],
          cap: [1000, 2000, 3000, 4500],
          contracts: ['2 Mini OR 20 Micros', '4 Mini OR 40 Micros', '6 Mini OR 60 Micros', '9 Mini OR 90 Micros'],
        }).map(item => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            lockOffset: 100,
            dailyLoss: soft(item.dll),
            consistency: share(0.5, 'funded'),
            minDays: 1,
            split: 0.8,
            minRequest: item.minRequest,
            buffer: item.dd + 100,
            cap: item.cap,
            contracts: item.contracts,
          }),
        })),
      },
    ],
  },
  {
    id: 'tradeify',
    name: 'Tradeify',
    initials: 'TF',
    logo: '/logos/tradeify.png',
    tile: 'from-[#14522a] to-[#0f3d20] border-[#1f8a45]/50',
    ruleSets: [
      ...(['flex', 'daily'] as const).map(policy => {
        const flex = policy === 'flex';

        return {
          id: `select-${policy}`,
          name: flex ? 'Select · Flex (5 giorni)' : 'Select · Daily',
          note: note(
            'Tradeify',
            `Valutazione identica per Select Flex e Daily: nessun limite giornaliero, consistenza 40%, almeno 3 giorni. ${
              flex
                ? 'Payout ogni 5 giorni vincenti, fino al 50% dei profitti, nessun buffer. Cap per i conti acquistati dopo il 1 set 2026.'
                : 'Payout giornalieri sopra il buffer, fino a 2 volte il profitto tra due richieste: qui vale solo il tetto per payout. Cap per i conti acquistati dopo il 1 set 2026.'
            }`
          ),
          sizes: rows(SIZES4, {
            target: [1500, 3000, 6000, 9000],
            dd: [1000, 2000, 3000, 4500],
            fDd: flex ? [1000, 2000, 3000, 4500] : [1000, 2000, 2500, 3500],
            dll: [500, 1000, 1250, 1750],
            buffer: [1100, 2100, 2600, 3600],
            cap: flex ? [1250, 2500, 3500, 4500] : [600, 1250, 1750, 2500],
            winDay: [100, 150, 200, 250],
            contracts: ['1 Mini OR 10 Micros', '4 Mini OR 40 Micros', '8 Mini OR 80 Micros', '12 Mini OR 120 Micros'],
          }).map(item => ({
            label: k(item.size),
            size: item.size,
            rules: rule({
              target: item.target,
              drawdown: item.dd,
              lockOffset: 100,
              consistency: share(0.4, 'evaluation'),
              minDays: 3,
              split: 0.9,
              minRequest: flex ? 0 : 250,
              minWinningDays: flex ? 5 : 0,
              winningDayMin: flex ? item.winDay : 0,
              buffer: flex ? 0 : item.buffer,
              cap: item.cap,
              contracts: item.contracts,
            }),
            fundedOverrides: {
              drawdown: trailing(num(item.fDd), 'eod-trailing', 100),
              dailyLossLimit: flex ? null : soft(item.dll),
            },
          })),
        };
      }),
      {
        id: 'growth',
        name: 'Growth',
        note: note(
          'Tradeify',
          'Valutazione con limite giornaliero morbido (ferma la giornata) e senza consistenza, si può passare in un giorno. Consistenza 35% sui payout funded; il limite giornaliero in funded non è incluso.'
        ),
        sizes: rows(SIZES4, {
          target: [1500, 3000, 6000, 9000],
          dd: [1000, 2000, 3500, 5000],
          dll: [600, 1250, 2500, 3750],
          buffer: [1500, 3000, 4500, 6500],
          minRequest: [250, 500, 1000, 1500],
          winDay: [100, 150, 200, 250],
          caps: [1000, 1500, 2000, 2500],
          contracts: ['1 Mini OR 10 Micros', '4 Mini OR 40 Micros', '8 Mini OR 80 Micros', '12 Mini OR 120 Micros'],
        }).map((item, index) => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            lockOffset: 100,
            dailyLoss: soft(item.dll),
            consistency: share(0.35, 'funded'),
            minDays: 1,
            split: 0.9,
            minRequest: item.minRequest,
            minWinningDays: 5,
            winningDayMin: item.winDay,
            buffer: item.buffer,
            caps: [
              [1000],
              [1500, 2000, 2500, 3000],
              [2000, 2500, 3000, 4000],
              [2500, 3000, 4000, 5000],
            ][index],
            contracts: item.contracts,
          }),
          fundedOverrides: { dailyLossLimit: null },
        })),
      },
      {
        id: 'lightning',
        name: 'Lightning',
        fundedOnly: true,
        note: note(
          'Tradeify',
          'Conto funded diretto, senza valutazione. Consistenza 20% sul primo payout, 25% sul secondo, 30% dal terzo: qui è usata quella del primo. Gli obiettivi di profitto per ogni payout non sono simulati.'
        ),
        sizes: rows(SIZES4, {
          dd: [1000, 2000, 4000, 5250],
          dll: [0, 1250, 2500, 3000],
          contracts: ['1 Mini OR 10 Micros', '4 Mini OR 40 Micros', '8 Mini OR 80 Micros', '12 Mini OR 120 Micros'],
        }).map((item, index) => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: null,
            drawdown: item.dd,
            lockOffset: 100,
            dailyLoss: soft(item.dll),
            consistency: share(0.2, 'funded'),
            split: 0.9,
            minRequest: 1000,
            caps: [[1000], [2000, 2000, 2000, 2500], [2500, 2500, 2500, 3000], [3000, 3000, 3000, 3500]][index],
            contracts: item.contracts,
          }),
        })),
      },
    ],
  },
  {
    id: 'tpt',
    name: 'Take Profit Trader',
    initials: 'TP',
    logo: '/logos/take-profit-trader.svg',
    logoOnDark: true,
    tile: 'from-[#2c4338] to-[#22362d] border-[#3d6a55]/50',
    ruleSets: [
      {
        id: 'test-pro',
        name: 'Test → PRO',
        note: note(
          'Take Profit Trader',
          'Nessun limite giornaliero. Nel PRO il drawdown segue anche i profitti non chiusi (qui approssimato con i saldi a fine giornata) e il buffer è pari al drawdown. Se il giorno migliore supera il 50%, l’obiettivo sale a più del doppio di quel giorno.'
        ),
        sizes: rows([25000, 50000, 75000, 100000, 150000], {
          target: [1500, 3000, 4500, 6000, 9000],
          dd: [1500, 2000, 2500, 3000, 4500],
          contracts: ['3 contratti', '6 contratti', '9 contratti', '12 contratti', '15 contratti'],
        }).map(item => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            consistency: share(0.5, 'evaluation'),
            minDays: 3,
            split: 0.8,
            buffer: item.dd,
            contracts: item.contracts,
          }),
          fundedOverrides: { drawdown: trailing(item.dd, 'intraday-trailing', 0) },
        })),
      },
    ],
  },
  {
    id: 'custom',
    name: 'Personalizzata',
    initials: '＋',
    tile: 'from-[#2a2a2d] to-[#1f1f22] border-white/10',
    custom: true,
    ruleSets: [
      {
        id: 'custom',
        name: 'Regole tue',
        note: 'Prop simulata con regole scelte da te: imposti obiettivo, drawdown, limiti e payout come vuoi.',
        sizes: [25000, 50000, 100000, 150000].map(size =>
          ({
            label: k(size),
            size,
            rules: rule({
              target: Math.round(size * 0.06),
              drawdown: Math.round(size * 0.04),
              split: 0.9,
            }),
          })
        ),
      },
    ],
  },
];

export const getFirm = (id: string) => FIRMS.find(firm => firm.id === id);

/** Rules for a new account of the given kind (funded/live have no profit target). */
export function rulesForKind(size: SizeDef, kind: AccountKind): PropRules {
  if (kind === 'evaluation') return structuredClone(size.rules);

  return structuredClone({ ...size.rules, profitTarget: null, ...size.fundedOverrides });
}

/** The catalog size an account was created from, when it still exists. */
const findSize = (account: { firmId: string; ruleSetId: string; sizeLabel: string }) =>
  getFirm(account.firmId)
    ?.ruleSets.find(set => set.id === account.ruleSetId)
    ?.sizes.find(item => item.label === account.sizeLabel);

/** Rules of the funded account that follows a passed evaluation, from the current catalog. */
export function fundedRulesFor(account: {
  firmId: string;
  ruleSetId: string;
  sizeLabel: string;
  rules: PropRules;
}): PropRules {
  const size = findSize(account);

  return structuredClone({ ...(size?.rules ?? account.rules), profitTarget: null, ...size?.fundedOverrides });
}

/**
 * Official plans always follow the current catalog (accounts created before a rule
 * update get the new numbers); accounts with rules written by the user are left alone.
 */
export function refreshOfficialRules<T extends {
  firmId: string;
  ruleSetId: string;
  sizeLabel: string;
  kind: AccountKind;
  rules: PropRules;
}>(account: T): T {
  if (getFirm(account.firmId)?.custom) return account;

  const size = findSize(account);

  return size ? { ...account, rules: rulesForKind(size, account.kind) } : account;
}
