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
