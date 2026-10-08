import {
  ShareCardFooter,
  ShareCardFrame,
  ShareCardHeader,
  ShareCaption,
  ShareGlowAmount,
  ShareRow,
  SHARE_PROFILE_CARD_HEIGHT,
  getShareIdentity,
} from './share-card-parts';

export interface ProfileShareData {
  traderName: string;
  rank: {
    emoji: string;
    name: string;
  };
  profileIcon: string;
  level: number;
  totalXP: number;
  currentLevelXP: number;
  nextLevelLabel: string;
  totalTrades: number;
  totalPnl: number;
  winRate: number;
  longestWinStreak: number;
  greenDays: number;
  redDays: number;
  avgWin: number;
  bestOperatingWindowName: string;
  bestOperatingWindowDescription?: string;
}

interface ProfileShareCardProps {
  profile: ProfileShareData;
  streamerMode: boolean;
  className?: string;
}

const splitCurrency = (value: number, streamerMode: boolean) => {
  if (streamerMode) return { sign: '', amount: '******' };

  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const amount = Math.abs(value).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return { sign, amount };
};

const formatPercent = (value: number) =>
  `${value.toLocaleString('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;

export function ProfileShareCard({
  profile,
  streamerMode,
  className,
}: ProfileShareCardProps) {
  const identity =
    profile.traderName.trim() === 'Trader'
      ? { initials: 'TR', displayName: 'Trader' }
      : getShareIdentity(profile.traderName) ?? { initials: 'TR', displayName: 'Trader' };
  const accent = profile.totalPnl < 0 ? '#ff6568' : '#34d27b';
  const { sign, amount } = splitCurrency(profile.totalPnl, streamerMode);
  const todayLabel = new Date().toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <ShareCardFrame className={className} glow={`${accent}26`} height={SHARE_PROFILE_CARD_HEIGHT}>
      <ShareCardHeader dateLabel={todayLabel} />

      <ShareGlowAmount
        sign={sign}
        amount={amount}
        currency="USD"
        label="P&L totale"
        accent={accent}
        trend={profile.totalPnl > 0 ? 'up' : profile.totalPnl < 0 ? 'down' : 'flat'}
      />

      <ShareCaption
        lines={[
          `${profile.rank.name} · Livello ${profile.level}`,
          `${profile.totalXP} XP totali`,
        ]}
      />

      <div className="mt-5 space-y-3">
        <ShareRow label="Winrate" value={formatPercent(profile.winRate)} />
        <ShareRow label="Trade totali" value={profile.totalTrades.toString()} />
        <ShareRow label="Streak migliore" value={`${profile.longestWinStreak} win`} />
        <ShareRow label="Giorni positivi" value={profile.greenDays.toString()} tone="profit" />
      </div>

      <ShareCardFooter
        avatar={identity.initials}
        name={identity.displayName}
        caption="Profilo trader"
        right={`Livello ${profile.level}`}
      />
    </ShareCardFrame>
  );
}
