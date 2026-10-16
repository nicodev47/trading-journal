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
  ruleSets: RuleSetDef[];
}

interface RuleInput {
  target: number | null;
  drawdown: number | null;
  type?: DrawdownType;
  locks?: boolean;
  dailyLoss?: { amount: number; effect: 'breach' | 'lock-day' } | null;
  consistency?: PropRules['consistency'];
  minDays?: number;
  split: number;
  minRequest?: number;
  minWinningDays?: number;
  winningDayMin?: number;
  buffer?: number;
  cap?: number | null;
  contracts?: string | null;
}

const rule = (input: RuleInput): PropRules => ({
  profitTarget: input.target,
  drawdown: {
    amount: input.drawdown,
    type: input.type ?? 'eod-trailing',
    locksAtStart: input.locks ?? true,
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
  },
  maxContracts: input.contracts ?? null,
});

const k = (size: number) => `${size / 1000}K`;

const MISSING = 'Numeri di questo piano non verificati: completali nella scheda Regole del conto.';

/** A rule set whose numbers are not known with certainty: they are left to fill in. */
const partialSet = (
  id: string,
  name: string,
  sizes: number[],
  options: { type?: DrawdownType; note?: string; split?: number } = {}
): RuleSetDef => ({
  id,
  name,
  note: options.note ?? MISSING,
  sizes: sizes.map(size => ({
    label: k(size),
    size,
    rules: rule({
      target: null,
      drawdown: null,
      type: options.type,
      split: options.split ?? 0.9,
    }),
  })),
});

const UNOFFICIAL = 'Fonti non ufficiali (guide e recensioni), ricerca del 16 ott 2026: controlla sul sito della firm.';

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
        note: `${UNOFFICIAL} Il limite giornaliero blocca il giorno, non fa fallire il conto.`,
        sizes: [
          { size: 50000, target: 3000, dd: 2000, dll: 1000, cap: 2000 },
          { size: 100000, target: 6000, dd: 3000, dll: 2000, cap: 3000 },
          { size: 150000, target: 9000, dd: 4500, dll: 3000, cap: 5000 },
        ].map(item => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            dailyLoss: { amount: item.dll, effect: 'lock-day' },
            consistency: { maxDayShare: 0.5, appliesTo: 'evaluation' },
            split: 0.9,
            minRequest: 125,
            minWinningDays: 5,
            winningDayMin: 150,
            cap: item.cap,
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
    ruleSets: [
      {
        id: 'eod',
        name: 'EOD',
        note: `${UNOFFICIAL} La consistenza del 50% vale per i payout; buffer e giorni qualificanti vanno verificati.`,
        sizes: [
          { size: 25000, target: 1500, dd: 1000 },
          { size: 50000, target: 3000, dd: 2000 },
          { size: 100000, target: 6000, dd: 3000 },
          { size: 150000, target: 9000, dd: 4000 },
        ].map(item => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            consistency: { maxDayShare: 0.5, appliesTo: 'funded' },
            split: 1,
            minWinningDays: 5,
          }),
        })),
      },
      {
        id: 'intraday',
        name: 'Intraday',
        note: `${UNOFFICIAL} Stessi numeri dell'EOD, ma il drawdown segue anche i profitti non chiusi (qui approssimato con i saldi a fine giornata).`,
        sizes: [
          { size: 25000, target: 1500, dd: 1000 },
          { size: 50000, target: 3000, dd: 2000 },
          { size: 100000, target: 6000, dd: 3000 },
          { size: 150000, target: 9000, dd: 4000 },
        ].map(item => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            type: 'intraday-trailing',
            consistency: { maxDayShare: 0.5, appliesTo: 'funded' },
            split: 1,
            minWinningDays: 5,
          }),
        })),
      },
    ],
  },
  {
    id: 'alpha',
    name: 'Alpha Futures',
    initials: 'AF',
    logo: '/logos/alpha-futures.png',
    tile: 'from-[#1f4d36] to-[#17382a] border-[#2c7a53]/50',
    ruleSets: [
      {
        id: 'advanced',
        name: 'Advanced',
        note: `${UNOFFICIAL} Obiettivo 8% e drawdown 3,5% del conto.`,
        sizes: [25000, 50000, 100000, 150000].map(size => ({
          label: k(size),
          size,
          rules: rule({
            target: Math.round(size * 0.08),
            drawdown: Math.round(size * 0.035),
            consistency: { maxDayShare: 0.4, appliesTo: 'evaluation' },
            split: 0.9,
            minDays: 3,
            minRequest: 200,
            minWinningDays: 5,
          }),
        })),
      },
      partialSet('zero', 'Zero', [25000, 50000, 100000, 150000], {
        note: `${MISSING} Il piano Zero ha split 90/10 dal primo giorno e nessuna attivazione.`,
      }),
    ],
  },
  {
    id: 'lucid',
    name: 'Lucid Trading',
    initials: 'LT',
    logo: '/logos/lucid.png',
    tile: 'from-[#555558] to-[#434346] border-white/15',
    ruleSets: [
      {
        id: 'flex',
        name: 'Flex',
        note: 'Regole dal centro assistenza di Lucid Trading, verificate il 5 ott 2026 (dalla tua schermata). Nessun limite giornaliero e nessuna consistenza in funded.',
        sizes: [
          { size: 25000, target: 1250, dd: 1000, contracts: null },
          { size: 50000, target: 3000, dd: 2000, contracts: '4 Mini OR 40 Micros' },
          { size: 100000, target: 6000, dd: 3000, contracts: null },
          { size: 150000, target: 9000, dd: 4500, contracts: null },
        ].map(item => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            consistency: { maxDayShare: 0.5, appliesTo: 'evaluation' },
            split: 0.9,
            contracts: item.contracts,
          }),
        })),
      },
      partialSet('pro', 'Pro', [25000, 50000, 100000, 150000], {
        note: `${MISSING} Su Lucid Pro il limite giornaliero e la consistenza dei payout dipendono dal piano.`,
      }),
      partialSet('direct', 'Direct', [25000, 50000, 100000, 150000]),
      partialSet('daily-intraday-dll', 'Daily Intraday +DLL', [25000, 50000, 100000, 150000], {
        type: 'intraday-trailing',
      }),
      partialSet('daily-eod-dll', 'Daily EOD +DLL', [25000, 50000, 100000, 150000]),
      partialSet('daily-intraday-nodll', 'Daily Intraday noDLL', [25000, 50000, 100000, 150000], {
        type: 'intraday-trailing',
      }),
      partialSet('daily-eod-nodll', 'Daily EOD noDLL', [25000, 50000, 100000, 150000]),
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
        id: 'core',
        name: 'Core',
        note: `${UNOFFICIAL} Obiettivo e consistenza non trovati con certezza: completali tu.`,
        sizes: [
          {
            label: '50K',
            size: 50000,
            rules: rule({
              target: null,
              drawdown: 1500,
              consistency: { maxDayShare: 0.5, appliesTo: 'evaluation' },
              split: 0.8,
              minWinningDays: 5,
            }),
          },
        ],
      },
      partialSet('rapid', 'Rapid', [50000], {
        type: 'intraday-trailing',
        split: 0.8,
        note: `${MISSING} Su Rapid il drawdown segue anche i profitti non chiusi (qui approssimato).`,
      }),
      partialSet('pro', 'Pro', [50000], { split: 0.8 }),
    ],
  },
  {
    id: 'tradeify',
    name: 'Tradeify',
    initials: 'TF',
    logo: '/logos/tradeify.png',
    tile: 'from-[#14522a] to-[#0f3d20] border-[#1f8a45]/50',
    ruleSets: [
      {
        id: 'select',
        name: 'Select',
        note: `${UNOFFICIAL} Drawdown massimo non trovato con certezza: completalo tu.`,
        sizes: [
          {
            label: '50K',
            size: 50000,
            rules: rule({
              target: 3000,
              drawdown: null,
              consistency: { maxDayShare: 0.4, appliesTo: 'evaluation' },
              split: 0.9,
              minWinningDays: 5,
            }),
          },
        ],
      },
      partialSet('growth', 'Growth', [50000], {
        note: `${MISSING} Growth non ha regola di consistenza in valutazione.`,
      }),
      partialSet('lightning', 'Lightning', [50000], {
        note: `${MISSING} Lightning è un conto funded diretto, senza valutazione.`,
      }),
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
        note: `${UNOFFICIAL} Nel PRO il drawdown segue anche i profitti non chiusi: qui è approssimato con i saldi a fine giornata.`,
        sizes: [
          { size: 25000, target: 1500, dd: 1500 },
          { size: 50000, target: 3000, dd: 2000 },
          { size: 100000, target: 6000, dd: 3000 },
          { size: 150000, target: 9000, dd: 4500 },
        ].map(item => ({
          label: k(item.size),
          size: item.size,
          rules: rule({
            target: item.target,
            drawdown: item.dd,
            consistency: { maxDayShare: 0.5, appliesTo: 'evaluation' },
            split: 0.8,
          }),
          fundedOverrides: {
            drawdown: { amount: item.dd, type: 'intraday-trailing', locksAtStart: true },
          },
        })),
      },
    ],
  },
  {
    id: 'custom',
    name: 'Personalizzata',
    initials: '＋',
    tile: 'from-[#2a2a2d] to-[#1f1f22] border-white/10',
    ruleSets: [
      {
        id: 'custom',
        name: 'Regole tue',
        note: 'Parti da valori tipici e impostali come vuoi nella scheda Regole.',
        sizes: [25000, 50000, 100000, 150000].map(size => ({
          label: k(size),
          size,
          rules: rule({
            target: Math.round(size * 0.06),
            drawdown: Math.round(size * 0.04),
            consistency: null,
            split: 0.9,
          }),
        })),
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

/** True when a number the engine needs is still missing. */
export const isIncomplete = (rules: PropRules, kind: AccountKind) =>
  rules.drawdown.amount === null || (kind === 'evaluation' && rules.profitTarget === null);
