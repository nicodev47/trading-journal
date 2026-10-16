/** Logo files (public/asset-logos) for the assets in the catalog, TradingView style. */
const SYMBOL_LOGOS: Record<string, string[]> = {
  NQ: ['nasdaq-100'],
  MNQ: ['nasdaq-100'],
  US100: ['nasdaq-100'],
  ES: ['s-and-p-500'],
  MES: ['s-and-p-500'],
  US500: ['s-and-p-500'],
  YM: ['dow-30'],
  MYM: ['dow-30'],
  US30: ['dow-30'],
  RTY: ['russell-2000'],
  M2K: ['russell-2000'],
  DAX: ['dax'],
  FDAX: ['dax'],
  GER40: ['dax'],
  FESX: ['euro-stoxx-50'],
  EU50: ['euro-stoxx-50'],
  UK100: ['uk-100'],
  JP225: ['nikkei-225'],
  FRA40: ['cac-40'],
  GC: ['gold'],
  MGC: ['gold'],
  XAUUSD: ['gold'],
  SI: ['silver'],
  SIL: ['silver'],
  XAGUSD: ['silver'],
  CL: ['crude-oil'],
  MCL: ['crude-oil'],
  USOIL: ['crude-oil'],
  UKOIL: ['crude-oil'],
  HG: ['copper'],
  MHG: ['copper'],
  NG: ['natural-gas'],
  ZC: ['corn'],
  ZS: ['soybean'],
  ZW: ['wheat'],
  '6E': ['country-eu', 'country-us'],
  M6E: ['country-eu', 'country-us'],
  '6B': ['country-gb', 'country-us'],
  M6B: ['country-gb', 'country-us'],
  '6A': ['country-au', 'country-us'],
  M6A: ['country-au', 'country-us'],
  '6J': ['country-jp', 'country-us'],
  '6C': ['country-ca', 'country-us'],
  '6S': ['country-ch', 'country-us'],
  ZB: ['country-us'],
  ZN: ['country-us'],
  ZF: ['country-us'],
  BTCUSD: ['crypto-btc'],
  ETHUSD: ['crypto-eth'],
  SOLUSD: ['crypto-sol'],
  XRPUSD: ['crypto-xrp'],
  BNBUSD: ['crypto-bnb'],
  ADAUSD: ['crypto-ada'],
  DOGEUSD: ['crypto-doge'],
};

const CURRENCY_FLAGS: Record<string, string> = {
  EUR: 'country-eu',
  USD: 'country-us',
  GBP: 'country-gb',
  JPY: 'country-jp',
  CHF: 'country-ch',
  AUD: 'country-au',
  CAD: 'country-ca',
  NZD: 'country-nz',
};

/** Logo names for a symbol (two flags for a forex pair), empty when there is none. */
export function getAssetLogos(symbol: string | undefined | null): string[] {
  const key = (symbol ?? '').trim().toUpperCase();

  if (!key) return [];
  if (SYMBOL_LOGOS[key]) return SYMBOL_LOGOS[key];

  const base = CURRENCY_FLAGS[key.slice(0, 3)];
  const quote = CURRENCY_FLAGS[key.slice(3, 6)];

  return key.length === 6 && base && quote ? [base, quote] : [];
}

/** Futures: a round badge with the contract root on the colour of its market. */
const FUTURES_BADGES: Record<string, { color: string; dark?: boolean }> = {
  NQ: { color: '#0091BA' },
  MNQ: { color: '#0091BA' },
  ES: { color: '#C4162E' },
  MES: { color: '#C4162E' },
  YM: { color: '#13A3D7' },
  MYM: { color: '#13A3D7' },
  RTY: { color: '#511732' },
  M2K: { color: '#511732' },
  DAX: { color: '#2F68AE' },
  FDAX: { color: '#2F68AE' },
  FESX: { color: '#192E8B' },
  GC: { color: '#D69A00' },
  MGC: { color: '#D69A00' },
  SI: { color: '#8E8C9A' },
  SIL: { color: '#8E8C9A' },
  CL: { color: '#4B5563' },
  MCL: { color: '#4B5563' },
  HG: { color: '#C26A44' },
  MHG: { color: '#C26A44' },
  NG: { color: '#42A5F5' },
  ZC: { color: '#FBC02D', dark: true },
  ZS: { color: '#388E3C' },
  ZW: { color: '#FFD600', dark: true },
  '6E': { color: '#1565C0' },
  M6E: { color: '#1565C0' },
  '6B': { color: '#2F3C7E' },
  M6B: { color: '#2F3C7E' },
  '6A': { color: '#0D47A1' },
  M6A: { color: '#0D47A1' },
  '6J': { color: '#BC002D' },
  '6C': { color: '#D52B1E' },
  '6S': { color: '#EF5350' },
  ZB: { color: '#1E88E9' },
  ZN: { color: '#1E88E9' },
  ZF: { color: '#1E88E9' },
};

export function getFuturesBadge(symbol: string | undefined | null) {
  return FUTURES_BADGES[(symbol ?? '').trim().toUpperCase()] ?? null;
}
