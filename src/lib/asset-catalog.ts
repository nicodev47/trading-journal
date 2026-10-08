export interface AssetGroup {
  group: string;
  items: string[];
}

export const ASSET_CATALOG: AssetGroup[] = [
  {
    group: 'Futures indici',
    items: ['NQ', 'MNQ', 'ES', 'MES', 'YM', 'MYM', 'RTY', 'M2K', 'DAX', 'FDAX', 'FESX'],
  },
  {
    group: 'Futures materie prime',
    items: ['GC', 'MGC', 'SI', 'CL', 'MCL', 'NG', 'HG', 'ZC', 'ZS', 'ZW'],
  },
  {
    group: 'Futures valute e tassi',
    items: ['6E', '6B', '6J', '6A', '6C', '6S', 'ZB', 'ZN', 'ZF'],
  },
  {
    group: 'Forex',
    items: [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
      'EURGBP', 'EURJPY', 'GBPJPY', 'AUDJPY', 'EURCHF', 'EURAUD', 'GBPAUD',
    ],
  },
  {
    group: 'Metalli e energia (CFD)',
    items: ['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL'],
  },
  {
    group: 'Crypto',
    items: ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'BNBUSD', 'ADAUSD', 'DOGEUSD'],
  },
  {
    group: 'Indici (CFD)',
    items: ['US100', 'US500', 'US30', 'GER40', 'UK100', 'JP225', 'FRA40', 'EU50'],
  },
  {
    group: 'Azioni',
    items: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL', 'AMD', 'SPY', 'QQQ'],
  },
];

export const ALL_CATALOG_ASSETS = ASSET_CATALOG.flatMap(group => group.items);
