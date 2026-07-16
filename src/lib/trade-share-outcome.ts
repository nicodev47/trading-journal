import { classifyPnl } from './calculations.ts';

export type TradeShareOutcome = 'profit' | 'loss' | 'missed';

export interface TradeSharePresentation {
  outcome: TradeShareOutcome;
  badgeLabel: 'PROFIT' | 'LOSS' | 'MISSED';
  accent: string;
  accentGlow: string;
  accentBorder: string;
  accentShadow: string;
  orbOpacity: number;
}

const PRESENTATIONS: Record<TradeShareOutcome, TradeSharePresentation> = {
  profit: {
    outcome: 'profit',
    badgeLabel: 'PROFIT',
    accent: '#00d68f',
    accentGlow: 'rgba(0, 214, 143, 0.18)',
    accentBorder: 'rgba(0, 214, 143, 0.42)',
    accentShadow: 'rgba(0, 214, 143, 0.16)',
    orbOpacity: 0.2,
  },
  loss: {
    outcome: 'loss',
    badgeLabel: 'LOSS',
    accent: '#ff4d70',
    accentGlow: 'rgba(255, 77, 112, 0.18)',
    accentBorder: 'rgba(255, 77, 112, 0.42)',
    accentShadow: 'rgba(255, 77, 112, 0.16)',
    orbOpacity: 0.2,
  },
  missed: {
    outcome: 'missed',
    badgeLabel: 'MISSED',
    accent: '#e5e7eb',
    accentGlow: 'rgba(229, 231, 235, 0.09)',
    accentBorder: 'rgba(229, 231, 235, 0.3)',
    accentShadow: 'rgba(229, 231, 235, 0.08)',
    orbOpacity: 0.1,
  },
};

export function getTradeSharePresentation(pnl: number): TradeSharePresentation {
  const outcome = classifyPnl(pnl);

  if (outcome === 'win') return PRESENTATIONS.profit;
  if (outcome === 'loss') return PRESENTATIONS.loss;
  return PRESENTATIONS.missed;
}
