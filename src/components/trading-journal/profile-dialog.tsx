'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { calculateStatistics } from '@/lib/calculations';
import { PROFILE_NAME_KEY } from '@/lib/export-filename';
import { getBestOperatingWindow } from '@/lib/operating-windows';
import { TRADER_RANKS, getProfileLevelIcon } from '@/lib/profile-levels';
import type { Trade } from '@/lib/types/trade';
import { useStreamerMode } from '@/contexts/streamer-mode-context';
import { ProfileShareDialog } from './profile-share-dialog';
import type { ProfileShareData } from './profile-share-card';

interface ProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  onClearPersonal: () => void;
}

const formatCurrency = (value: number) =>
  `${value.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;

const formatPnlCurrency = (value: number) => {
  const prefix = value > 0 ? '+' : '';

  return `${prefix}${formatCurrency(value)}`;
};

const formatPercent = (value: number) =>
  `${value.toLocaleString('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;

export function ProfileDialog({
  isOpen,
  onClose,
  trades,
  onClearPersonal,
}: ProfileDialogProps) {
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [traderName, setTraderName] = useState('');
  const [isShareOpen, setIsShareOpen] = useState(false);
  const {
    streamerMode,
    toggleStreamerMode,
    sundayWeekStart,
    setSundayWeekStart,
    showCalendarSetup,
    setShowCalendarSetup,
    showCalendarTags,
    setShowCalendarTags,
  } = useStreamerMode();

  useEffect(() => {
    setTraderName(localStorage.getItem(PROFILE_NAME_KEY) || '');
  }, []);

  const profile = useMemo(() => {
    const stats = calculateStatistics(trades);
    const totalXP = trades.length * 10;
    const level = Math.floor(totalXP / 100) + 1;
    const currentLevelXP = totalXP % 100;
    const rank = TRADER_RANKS[Math.min(level, 10) - 1];
    const profileIcon = getProfileLevelIcon(level);
    const bestOperatingWindow = getBestOperatingWindow(trades);
    const nextRank =
      level >= 10 ? TRADER_RANKS[9] : TRADER_RANKS[level];
    const nextLevelLabel =
      level >= 10
        ? `Livello massimo · ${nextRank.emoji} ${nextRank.name}`
        : `Verso livello ${level + 1} · ${nextRank.emoji} ${nextRank.name}`;

    return {
      stats,
      totalXP,
      level,
      currentLevelXP,
      rank,
      profileIcon,
      nextLevelLabel,
      bestOperatingWindow,
    };
  }, [trades]);

  const statCards = [
    {
      label: 'Trade totali',
      value: profile.stats.totalTrades.toString(),
      tone: 'yellow',
    },
    {
      label: 'P&L totale',
      value: streamerMode ? '******' : formatCurrency(profile.stats.totalPnl),
      tone: profile.stats.totalPnl >= 0 ? 'profit' : 'loss',
    },
    {
      label: 'Winrate',
      value: formatPercent(profile.stats.winRate),
      tone: 'profit',
    },
    {
      label: 'Streak migliore',
      value: `${profile.stats.longestWinStreak} win`,
      tone: 'profit',
    },
    { label: 'Giorni positivi', value: profile.stats.greenDays.toString(), tone: 'profit' },
    { label: 'Giorni negativi', value: profile.stats.redDays.toString(), tone: 'loss' },
    {
      label: 'Vincita media',
      value: streamerMode ? '******' : formatCurrency(profile.stats.avgWin),
      tone: 'profit',
    },
    {
      label: 'Orario migliore',
      value: profile.bestOperatingWindow?.name ?? '—',
      subtitle: profile.bestOperatingWindow?.description,
      tone: profile.bestOperatingWindow ? 'profit' : undefined,
    },
  ] as const;

  const closeClearDialog = () => {
    setIsClearDialogOpen(false);
    setConfirmationText('');
  };

  const handleClearPersonal = () => {
    if (confirmationText !== 'SVUOTA') return;

    onClearPersonal();
    closeClearDialog();
  };

  const handleTraderNameChange = (value: string) => {
    setTraderName(value);

    const normalizedName = value.trim();

    if (normalizedName) {
      localStorage.setItem(PROFILE_NAME_KEY, normalizedName);
    } else {
      localStorage.removeItem(PROFILE_NAME_KEY);
    }
  };

  const shareProfileData: ProfileShareData = {
    traderName: traderName.trim() || 'Trader',
    rank: profile.rank,
    profileIcon: profile.profileIcon,
    level: profile.level,
    totalXP: profile.totalXP,
    currentLevelXP: profile.currentLevelXP,
    nextLevelLabel: profile.nextLevelLabel,
    totalTrades: profile.stats.totalTrades,
    totalPnl: profile.stats.totalPnl,
    winRate: profile.stats.winRate,
    longestWinStreak: profile.stats.longestWinStreak,
    greenDays: profile.stats.greenDays,
    redDays: profile.stats.redDays,
    avgWin: profile.stats.avgWin,
    bestOperatingWindowName: profile.bestOperatingWindow?.name ?? '—',
    bestOperatingWindowDescription: profile.bestOperatingWindow?.description,
  };

  const handleShare = () => {
    setIsShareOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
        <DialogContent
          className="ej-scrollbar max-h-[90dvh] w-[calc(100vw-1.75rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-0 shadow-[0_20px_50px_rgba(0,0,0,0.35)] sm:max-w-2xl"
          onOpenAutoFocus={event => event.preventDefault()}
        >
          <DialogHeader className="border-b border-border px-4 py-3.5 text-left sm:px-5 sm:py-4">
            <DialogTitle className="font-mono text-base sm:text-lg">Profilo trader</DialogTitle>
            <DialogDescription>
              Progressi e statistiche calcolati dal journal Personale.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 p-4 sm:space-y-4 sm:p-5">
            <section className="rounded-[14px] border border-profit/25 bg-gradient-to-br from-profit/10 via-background/60 to-background/30 p-3.5 sm:p-4">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border/70 pb-4">
                <div className="min-w-0 flex-1 space-y-1.5 sm:min-w-[190px]">
                  <Label
                    htmlFor="trader-profile-name"
                    className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Nome trader
                  </Label>
                  <Input
                    id="trader-profile-name"
                    value={traderName}
                    onChange={event => handleTraderNameChange(event.target.value)}
                    placeholder="Il tuo nome"
                    maxLength={50}
                    className="h-9 border-border/80 bg-background/55 font-sans font-semibold"
                  />
                </div>

                <Button
                  type="button"
                  size="sm"
                  className="gap-2 bg-profit text-background hover:bg-profit/90 max-sm:w-full"
                  onClick={handleShare}
                >
                  <span className="text-base leading-none" aria-hidden="true">
                    📷
                  </span>
                  Share
                </Button>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-profit/30 bg-profit/10 text-[40px] leading-none shadow-[0_0_24px_rgba(0,214,143,0.08)] sm:size-16 sm:text-[46px]">
                  {profile.profileIcon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="truncate font-sans text-sm font-semibold text-muted-foreground">
                        {traderName.trim() || 'Il tuo nome'}
                      </p>
                      <p className="mt-0.5 font-sans text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                        <span className="mr-2" aria-hidden="true">
                          {profile.rank.emoji}
                        </span>
                        {profile.rank.name}
                      </p>
                      <p className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-profit">
                        Livello {profile.level}
                      </p>
                    </div>

                    <p className="font-mono text-sm text-profit">
                      {profile.totalXP} XP totali
                    </p>
                  </div>

                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-profit transition-all"
                      style={{ width: `${profile.currentLevelXP}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between font-mono text-xs text-muted-foreground">
                    <span>
                      {profile.currentLevelXP} / 100 XP
                    </span>
                    <span className="text-right">{profile.nextLevelLabel}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-2.5 min-[460px]:grid-cols-2 sm:gap-3 lg:grid-cols-4">
              {statCards.map(stat => (
                <div
                  key={stat.label}
                  className="min-w-0 rounded-xl border border-border bg-background/45 p-3"
                >
                  <p className="font-sans text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {stat.label}
                  </p>
                  <p
                    className={`mt-2 break-words font-mono font-semibold ${
                      stat.label === 'Orario migliore'
                        ? 'text-xs leading-relaxed'
                        : 'text-sm'
                    } ${
                      stat.tone === 'profit'
                        ? 'text-profit'
                        : stat.tone === 'loss'
                          ? 'text-loss'
                          : stat.tone === 'yellow'
                            ? 'text-[#facc15]'
                          : 'text-foreground'
                    }`}
                  >
                    {stat.value}
                  </p>
                  {'subtitle' in stat && stat.subtitle && (
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {stat.subtitle}
                    </p>
                  )}
                </div>
              ))}
            </section>

            <section className="rounded-[14px] border border-violet-400/35 bg-violet-500/5 p-3.5 sm:p-4">
              <p className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">
                <span>Modalità Streamer</span>
                <span className="text-xl leading-none">🙈</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-md font-sans text-xs leading-relaxed text-muted-foreground">
                  Nasconde profitti e perdite sostituendoli con ******. Utile per
                  registrare video, fare streaming o condividere screenshot senza
                  mostrare i tuoi numeri.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-violet-400/45 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 hover:text-violet-100 max-sm:w-full"
                  onClick={toggleStreamerMode}
                >
                  {streamerMode
                    ? 'Disattiva modalità streamer'
                    : 'Attiva modalità streamer'}
                </Button>
              </div>
            </section>

            <section className="rounded-[14px] border border-border bg-background/35 p-3.5 sm:p-4">
              <p className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <span>Impostazioni calendario</span>
                <span className="text-xl leading-none">🗓️</span>
              </p>
              <p className="mt-3 max-w-xl font-sans text-xs leading-relaxed text-muted-foreground">
                Personalizza la visualizzazione del calendario in base al tuo modo
                di leggere la settimana.
              </p>

              <div className="mt-3 space-y-2.5">
                <div className="rounded-xl border border-border/70 bg-background/35 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-semibold text-foreground">
                        Settimana che inizia di domenica
                      </p>
                      <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
                        Mostra il calendario con la domenica come primo giorno della settimana.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={sundayWeekStart}
                      aria-label="Settimana che inizia di domenica"
                      onClick={() => setSundayWeekStart(!sundayWeekStart)}
                      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
                        sundayWeekStart
                          ? 'border-profit/60 bg-profit'
                          : 'border-border bg-input/80'
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-background shadow-sm transition-transform ${
                          sundayWeekStart ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/35 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-semibold text-foreground">
                        Mostra setup nel calendario
                      </p>
                      <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
                        Mostra il setup principale della giornata sotto il P&L.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showCalendarSetup}
                      aria-label="Mostra setup nel calendario"
                      onClick={() => setShowCalendarSetup(!showCalendarSetup)}
                      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
                        showCalendarSetup
                          ? 'border-profit/60 bg-profit'
                          : 'border-border bg-input/80'
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-background shadow-sm transition-transform ${
                          showCalendarSetup ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/35 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-semibold text-foreground">
                        Mostra tag nel calendario
                      </p>
                      <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
                        Mostra i tag principali della giornata sotto il P&L.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showCalendarTags}
                      aria-label="Mostra tag nel calendario"
                      onClick={() => setShowCalendarTags(!showCalendarTags)}
                      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
                        showCalendarTags
                          ? 'border-profit/60 bg-profit'
                          : 'border-border bg-input/80'
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-background shadow-sm transition-transform ${
                          showCalendarTags ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[14px] border border-loss/30 bg-loss/5 p-3.5 sm:p-4">
              <p className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-loss">
                <span>Zona pericolosa</span>
                <span className="text-xl leading-none">🚨</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-md font-sans text-xs leading-relaxed text-muted-foreground">
                  Cancella trade, piani, strategie e tag personalizzati salvati nel
                  journal Personale. Backtest e Preview non verranno modificati.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 border-loss/50 text-loss hover:bg-loss/10 hover:text-loss max-sm:w-full"
                  onClick={() => setIsClearDialogOpen(true)}
                >
                  <Trash2 className="size-3.5" />
                  Svuota personale
                </Button>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isClearDialogOpen}
        onOpenChange={open => !open && closeClearDialog()}
      >
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.75rem)] rounded-2xl border border-loss/35 bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-loss">
              Svuota journal Personale
            </DialogTitle>
            <DialogDescription>
              Questa azione è irreversibile e non toccherà i dati Backtest o Preview.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="clear-personal-confirmation" className="font-sans text-sm">
              Digita <span className="font-mono font-bold text-foreground">SVUOTA</span>{' '}
              per confermare
            </Label>
            <Input
              id="clear-personal-confirmation"
              value={confirmationText}
              onChange={event => setConfirmationText(event.target.value)}
              className="border-loss/35 bg-background font-mono"
              autoComplete="off"
              autoFocus
            />
          </div>

          <DialogFooter className="max-sm:[&_button]:w-full">
            <Button type="button" variant="outline" onClick={closeClearDialog}>
              Annulla
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={confirmationText !== 'SVUOTA'}
              onClick={handleClearPersonal}
            >
              Svuota personale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProfileShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        profile={shareProfileData}
        streamerMode={streamerMode}
      />
    </>
  );
}
