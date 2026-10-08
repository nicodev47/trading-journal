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

const getPnlFontSize = (text: string) =>
  text.length <= 12 ? 96 : text.length <= 14 ? 80 : 66;

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[14px] font-medium text-white/45">{label}</div>
      <div className="mt-2 whitespace-nowrap text-[28px] font-semibold leading-none tracking-tight text-white">
        {value || '--'}
      </div>
    </div>
  );
}

export function ProfileShareCard({
  profile,
  streamerMode,
  className,
}: ProfileShareCardProps) {
  const displayName = profile.traderName.trim() || 'Trader';
  const accent = profile.totalPnl < 0 ? '#ff6568' : '#34d27b';
  const pnlText = formatCurrency(profile.totalPnl, streamerMode);

  return (
    <div
      className={cn(
        'relative aspect-[16/9] w-[840px] max-w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0a0b] p-12 text-white',
        className
      )}
    >
      <div className="relative z-10 flex h-full flex-col">
        <header className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10">
              <Moon className="size-5 text-white" />
            </div>
            <div className="text-[22px] font-semibold tracking-tight text-white">
              EclipseJournal
            </div>
          </div>
          <div className="text-[18px] font-medium text-white/50">Profilo trader</div>
        </header>

        <main className="flex flex-1 flex-col justify-center">
          <div className="text-[22px] font-medium text-white/55">
            {profile.rank.emoji} {profile.rank.name} · Livello {profile.level}
          </div>
          <div
            className="mt-3 whitespace-nowrap font-semibold leading-none tracking-[-0.03em]"
            style={{ color: accent, fontSize: getPnlFontSize(pnlText) }}
          >
            {pnlText}
          </div>
          <div className="mt-10 flex gap-14">
            <ProfileMetric label="Winrate" value={formatPercent(profile.winRate)} />
            <ProfileMetric label="Trade totali" value={profile.totalTrades.toString()} />
            <ProfileMetric label="Streak migliore" value={`${profile.longestWinStreak} win`} />
            <ProfileMetric label="Giorni positivi" value={profile.greenDays.toString()} />
          </div>
        </main>

        <footer className="text-[22px] font-medium text-white/70">{displayName}</footer>
      </div>
    </div>
  );
}
