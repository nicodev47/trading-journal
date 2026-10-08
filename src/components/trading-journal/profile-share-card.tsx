import { Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const formatCurrency = (value: number, streamerMode: boolean) => {
  if (streamerMode) return '****** USD';

  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const formatted = Math.abs(value).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${sign}${formatted} USD`;
};

const formatPercent = (value: number) =>
  `${value.toLocaleString('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;

function ProfileMetric({
  label,
  value,
  subtitle,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone?: 'profit' | 'loss' | 'neutral';
}) {
  return (
    <div className="border-t border-white/10 pt-4">
      <div className="font-sans text-[14px] font-medium leading-none text-white/45">
        {label}
      </div>
      <div
        className={cn(
          'mt-3 break-words font-sans tabular-nums text-[28px] font-semibold leading-tight tracking-tight',
          tone === 'profit'
            ? 'text-[#34d27b]'
            : tone === 'loss'
              ? 'text-[#ff6568]'
              : 'text-white'
        )}
      >
        {value}
      </div>
      {subtitle && (
        <div className="mt-1 font-sans tabular-nums text-[13px] leading-none text-white/45">
          {subtitle}
        </div>
      )}
    </div>
  );
}

export function ProfileShareCard({
  profile,
  streamerMode,
  className,
}: ProfileShareCardProps) {
  const displayName = profile.traderName.trim() || 'Trader';
  const pnlTone = profile.totalPnl < 0 ? 'loss' : 'profit';
  const progressWidth = Math.max(0, Math.min(100, profile.currentLevelXP));
  const bestWindowTone =
    profile.bestOperatingWindowName === '—' ? 'neutral' : 'profit';

  return (
    <div
      className={cn(
        'relative aspect-square w-[760px] max-w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0a0b] p-10 text-white',
        className
      )}
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-white/10">
              <Moon className="size-[18px] text-white" />
            </div>
            <div className="font-sans text-[20px] font-semibold tracking-tight text-white">
              EclipseJournal
            </div>
          </div>
          <div className="font-sans text-[16px] font-medium text-white/50">
            Profilo trader
          </div>
        </header>

        <section className="mt-9 flex items-center gap-6">
          <div className="flex size-[84px] shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-white/[0.07] text-[48px] leading-none">
            {profile.profileIcon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="break-words font-sans text-[18px] font-medium leading-tight text-white/55">
              {displayName}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 break-words font-sans text-[34px] font-semibold leading-tight tracking-tight text-white">
              <span aria-hidden="true">{profile.rank.emoji}</span>
              <span>{profile.rank.name}</span>
            </div>
            <div className="mt-1 font-sans tabular-nums text-[16px] font-medium text-white/50">
              Livello {profile.level} · {profile.totalXP} XP totali
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
          <div className="mt-3 flex items-start justify-between gap-6 font-sans tabular-nums text-[14px] font-medium leading-snug text-white/45">
            <span>{profile.currentLevelXP} / 100 XP</span>
            <span className="max-w-[420px] text-right">{profile.nextLevelLabel}</span>
          </div>
        </section>

        <section className="mt-9 grid grid-cols-2 gap-x-10 gap-y-6">
          <ProfileMetric label="P&L totale" value={formatCurrency(profile.totalPnl, streamerMode)} tone={pnlTone} />
          <ProfileMetric label="Winrate" value={formatPercent(profile.winRate)} />
          <ProfileMetric label="Trade totali" value={profile.totalTrades.toString()} />
          <ProfileMetric label="Streak migliore" value={`${profile.longestWinStreak} win`} />
          <ProfileMetric label="Giorni positivi" value={profile.greenDays.toString()} tone="profit" />
          <ProfileMetric label="Giorni negativi" value={profile.redDays.toString()} tone="loss" />
          <ProfileMetric label="Vincita media" value={formatCurrency(profile.avgWin, streamerMode)} />
          <ProfileMetric
            label="Orario migliore"
            value={profile.bestOperatingWindowName}
            subtitle={profile.bestOperatingWindowDescription}
            tone={bestWindowTone}
          />
        </section>
      </div>
    </div>
  );
}
