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
  tone = 'profit',
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone?: 'profit' | 'loss' | 'neutral';
}) {
  return (
    <div className="flex min-h-[64px] flex-col justify-center rounded-[12px] border border-white/10 bg-[#0b1214] px-4 py-3">
      <div className="font-sans text-[11px] font-bold uppercase leading-none text-white/52">
        {label}
      </div>
      <div
        className={cn(
          'mt-2 break-words font-mono text-[20px] font-black leading-tight',
          tone === 'profit'
            ? 'text-[#00d68f]'
            : tone === 'loss'
              ? 'text-[#ff4d70]'
              : 'text-white'
        )}
      >
        {value}
      </div>
      {subtitle && (
        <div className="mt-1 font-mono text-[11px] font-semibold leading-none text-white/44">
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
        'relative aspect-square w-[760px] max-w-full rounded-[28px] border border-[#00a978] bg-[#050b0c] p-8 text-white shadow-2xl',
        className
      )}
      style={{
        boxShadow:
          '0 0 0 1px rgba(0,214,143,0.18), 0 24px 86px rgba(0,214,143,0.12)',
      }}
    >
      <div className="flex h-full flex-col rounded-[22px]">
        <header className="flex items-center px-1">
          <h2 className="font-sans text-[26px] font-black leading-none text-white">
            Profilo Trader
          </h2>
        </header>

        <section className="mt-6 rounded-[22px] border border-[#00a978] bg-[#063f30] px-7 py-6">
          <div className="flex items-center gap-6">
            <div className="flex size-[82px] shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-[#00d68f]/35 bg-[#00d68f]/10 text-[52px] leading-none shadow-[0_0_28px_rgba(0,214,143,0.10)]">
              {profile.profileIcon}
            </div>

            <div className="min-w-0 flex-1">
              <div className="break-words font-sans text-[18px] font-bold leading-tight text-white/58">
                {displayName}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 break-words font-sans text-[31px] font-black leading-tight text-white">
                <span aria-hidden="true">{profile.rank.emoji}</span>
                <span>{profile.rank.name}</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 font-mono text-[17px] font-black uppercase text-[#00d68f]">
                <span>LIVELLO {profile.level}</span>
                <span>{profile.totalXP} XP TOTALI</span>
              </div>
            </div>
          </div>

          <div className="mt-6 h-4 overflow-hidden rounded-full bg-[#14231f]">
            <div
              className="h-full rounded-full bg-[#12d6a0]"
              style={{ width: `${progressWidth}%` }}
            />
          </div>

          <div className="mt-4 flex items-start justify-between gap-6 font-mono text-[13px] font-bold uppercase leading-snug text-white/52">
            <span>
              {profile.currentLevelXP} / 100 XP
            </span>
            <span className="max-w-[420px] text-right">
              {profile.nextLevelLabel}
            </span>
          </div>
        </section>

        <section className="mt-7 grid grid-cols-2 gap-x-5 gap-y-4">
          <ProfileMetric
            label="Trade totali"
            value={profile.totalTrades.toString()}
          />
          <ProfileMetric
            label="P&L Totale"
            value={formatCurrency(profile.totalPnl, streamerMode)}
            tone={pnlTone}
          />
          <ProfileMetric
            label="Winrate"
            value={formatPercent(profile.winRate)}
          />
          <ProfileMetric
            label="Streak migliore"
            value={`${profile.longestWinStreak} win`}
          />
          <ProfileMetric
            label="Giorni positivi"
            value={profile.greenDays.toString()}
          />
          <ProfileMetric
            label="Giorni negativi"
            value={profile.redDays.toString()}
            tone="loss"
          />
          <ProfileMetric
            label="Vincita media"
            value={formatCurrency(profile.avgWin, streamerMode)}
          />
          <ProfileMetric
            label="Orario migliore"
            value={profile.bestOperatingWindowName}
            subtitle={profile.bestOperatingWindowDescription}
            tone={bestWindowTone}
          />
        </section>

        <footer className="mt-auto text-center font-sans text-[13px] font-bold text-white/55">
          Generato da EclipseJournal 🌙
        </footer>
      </div>
    </div>
  );
}
