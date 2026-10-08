export interface AssetItem {
  /** What the user sees on the chip, e.g. "NQ/MNQ". */
  label: string;
  /** Symbols stored in the preferences when the chip is selected. */
  symbols: string[];
}

export interface AssetGroup {
  group: string;
  items: AssetItem[];
}

const single = (symbol: string): AssetItem => ({ label: symbol, symbols: [symbol] });
const pair = (full: string, micro: string): AssetItem => ({
  label: `${full}/${micro}`,
  symbols: [full, micro],
});

export const ASSET_CATALOG: AssetGroup[] = [
  {
    group: 'Futures indici',
    items: [
      pair('NQ', 'MNQ'),
      pair('ES', 'MES'),
      pair('YM', 'MYM'),
      pair('RTY', 'M2K'),
      single('DAX'),
      single('FDAX'),
      single('FESX'),
    ],
  },
  {
    group: 'Futures materie prime',
    items: [
      pair('GC', 'MGC'),
      pair('SI', 'SIL'),
      pair('CL', 'MCL'),
      pair('HG', 'MHG'),
      single('NG'),
      single('ZC'),
      single('ZS'),
      single('ZW'),
    ],
  },
  {
    group: 'Futures valute e tassi',
    items: [
      pair('6E', 'M6E'),
      pair('6B', 'M6B'),
      pair('6A', 'M6A'),
      single('6J'),
      single('6C'),
      single('6S'),
      single('ZB'),
      single('ZN'),
      single('ZF'),
    ],
  },
  {
    group: 'Forex',
    items: [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
      'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'EURCHF', 'EURAUD', 'GBPAUD',
    ].map(single),
  },
  {
    group: 'Metalli e energia (CFD)',
    items: ['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL'].map(single),
  },
  {
    group: 'Crypto',
    items: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'BNBUSD', 'ADAUSD', 'DOGEUSD'].map(single),
  },
  {
    group: 'Indici (CFD)',
    items: ['US100', 'US500', 'US30', 'GER40', 'UK100', 'JP225', 'FRA40', 'EU50'].map(single),
  },
];

export const ALL_CATALOG_ASSETS = ASSET_CATALOG.flatMap(group =>
  group.items.flatMap(item => item.symbols)
);

export function toggleAssetItem(selected: string[], item: AssetItem): string[] {
  const allSelected = item.symbols.every(symbol => selected.includes(symbol));

  if (allSelected) {
    return selected.filter(symbol => !item.symbols.includes(symbol));
  }

  return [...selected, ...item.symbols.filter(symbol => !selected.includes(symbol))];
}
