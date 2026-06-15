'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImageDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { calculateStatistics } from '@/lib/calculations';
import { getBestOperatingWindow } from '@/lib/operating-windows';
import type { Trade } from '@/lib/types/trade';
import { useStreamerMode } from '@/contexts/streamer-mode-context';

interface ProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  onClearPersonal: () => void;
}

const PROFILE_NAME_KEY = 'eclipse-trading-journal-profile-name';
const DEFAULT_PROFILE_AVATAR = '🍀';

const TRADER_RANKS = [
  { emoji: '🍀', name: 'Principiante' },
  { emoji: '🧑‍🎓', name: 'Apprendista' },
  { emoji: '🧭', name: 'Esploratore' },
  { emoji: '⚔️', name: 'Stratega' },
  { emoji: '🦅', name: 'Cacciatore' },
  { emoji: '🐺', name: 'Trader Disciplinato' },
  { emoji: '📈', name: 'Analista' },
  { emoji: '🐉', name: 'Maestro' },
  { emoji: '👑', name: 'Élite' },
  { emoji: '🧙‍♂️', name: 'Mago dei mercati' },
] as const;

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

const drawRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
};

const fitCanvasText = (
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number
) => {
  if (context.measureText(value).width <= maxWidth) {
    return value;
  }

  let shortened = value;

  while (
    shortened.length > 1 &&
    context.measureText(`${shortened}…`).width > maxWidth
  ) {
    shortened = shortened.slice(0, -1);
  }

  return `${shortened}…`;
};

const normalizeProfileFileName = (name: string) => {
  const normalizedName = name
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return normalizedName
    ? `profilo-trader-${normalizedName}.png`
    : 'profilo-trader.png';
};

export function ProfileDialog({
  isOpen,
  onClose,
  trades,
  onClearPersonal,
}: ProfileDialogProps) {
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [traderName, setTraderName] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const { streamerMode, toggleStreamerMode } = useStreamerMode();

  useEffect(() => {
    setTraderName(localStorage.getItem(PROFILE_NAME_KEY) || '');
  }, []);

  const profile = useMemo(() => {
    const stats = calculateStatistics(trades);
    const totalXP = trades.length * 10;
    const level = Math.floor(totalXP / 100) + 1;
    const currentLevelXP = totalXP % 100;
    const rank = TRADER_RANKS[Math.min(level, 10) - 1];
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

  const handleShare = async () => {
    setIsGeneratingImage(true);

    try {
      await document.fonts.ready;

      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;

      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Canvas unavailable');
      }

      const displayName = traderName.trim() || 'Trader';
      const teal = '#00d68f';
      const foreground = '#f4f7f6';
      const muted = '#89928f';
      const loss = '#ff4d70';
      const backgroundGradient = context.createLinearGradient(0, 0, 1080, 1080);
      backgroundGradient.addColorStop(0, '#030608');
      backgroundGradient.addColorStop(0.55, '#07100f');
      backgroundGradient.addColorStop(1, '#020405');
      context.fillStyle = backgroundGradient;
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.save();
      context.shadowColor = 'rgba(0, 214, 143, 0.16)';
      context.shadowBlur = 45;
      drawRoundedRect(context, 48, 48, 984, 984, 34);
      context.fillStyle = '#080d0f';
      context.fill();
      context.restore();
      context.strokeStyle = 'rgba(0, 214, 143, 0.55)';
      context.lineWidth = 2;
      drawRoundedRect(context, 48, 48, 984, 984, 34);
      context.stroke();

      context.fillStyle = foreground;
      context.font = '700 34px system-ui, sans-serif';
      context.fillText('Profilo Trader', 92, 115);
      context.fillStyle = muted;
      context.font = '500 18px ui-monospace, monospace';
      context.textAlign = 'right';
      context.fillText('CALENDARIO P/L', 988, 112);
      context.textAlign = 'left';

      const playerGradient = context.createLinearGradient(90, 155, 990, 455);
      playerGradient.addColorStop(0, 'rgba(0, 214, 143, 0.15)');
      playerGradient.addColorStop(1, 'rgba(8, 17, 18, 0.95)');
      drawRoundedRect(context, 90, 155, 900, 300, 28);
      context.fillStyle = playerGradient;
      context.fill();
      context.strokeStyle = 'rgba(0, 214, 143, 0.3)';
      context.lineWidth = 2;
      context.stroke();

      context.font =
        '88px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      context.fillText(DEFAULT_PROFILE_AVATAR, 130, 285);

      context.fillStyle = muted;
      context.font = '600 24px system-ui, sans-serif';
      context.fillText(fitCanvasText(context, displayName, 560), 280, 215);
      context.fillStyle = foreground;
      context.font = '800 46px system-ui, sans-serif';
      context.fillText(
        fitCanvasText(
          context,
          `${profile.rank.emoji} ${profile.rank.name}`,
          620
        ),
        280,
        270
      );
      context.fillStyle = teal;
      context.font = '700 23px ui-monospace, monospace';
      context.fillText(`LIVELLO ${profile.level}`, 280, 310);
      context.textAlign = 'right';
      context.fillText(`${profile.totalXP} XP TOTALI`, 945, 310);
      context.textAlign = 'left';

      drawRoundedRect(context, 130, 350, 820, 20, 10);
      context.fillStyle = '#17211f';
      context.fill();
      const progressWidth = (profile.currentLevelXP / 100) * 820;

      if (progressWidth > 0) {
        drawRoundedRect(context, 130, 350, progressWidth, 20, 10);
        context.fillStyle = teal;
        context.fill();
      }

      context.fillStyle = muted;
      context.font = '500 18px ui-monospace, monospace';
      context.fillText(`${profile.currentLevelXP} / 100 XP`, 130, 405);
      context.textAlign = 'right';
      context.fillText(
        fitCanvasText(context, profile.nextLevelLabel.toUpperCase(), 560),
        950,
        405
      );
      context.textAlign = 'left';

      const imageStats = [
        ['Trade totali', profile.stats.totalTrades.toString(), teal],
        [
          'P&L totale',
          streamerMode ? '******' : formatPnlCurrency(profile.stats.totalPnl),
          profile.stats.totalPnl >= 0 ? teal : loss,
        ],
        ['Winrate', formatPercent(profile.stats.winRate), teal],
        ['Streak migliore', `${profile.stats.longestWinStreak} win`, teal],
        ['Giorni positivi', profile.stats.greenDays.toString(), teal],
        ['Giorni negativi', profile.stats.redDays.toString(), loss],
        [
          'Vincita media',
          streamerMode ? '******' : formatCurrency(profile.stats.avgWin),
          teal,
        ],
        [
          'Orario migliore',
          profile.bestOperatingWindow?.name ?? '—',
          profile.bestOperatingWindow ? teal : muted,
          profile.bestOperatingWindow?.description,
        ],
      ] as const;

      imageStats.forEach(([label, value, color, subtitle], index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = 90 + column * 465;
        const y = 495 + row * 117;

        drawRoundedRect(context, x, y, 435, 92, 18);
        context.fillStyle = '#0c1315';
        context.fill();
        context.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        context.lineWidth = 1;
        context.stroke();

        context.fillStyle = muted;
        context.font = '600 16px system-ui, sans-serif';
        context.fillText(label.toUpperCase(), x + 24, y + 31);
        context.fillStyle = color;
        context.font = subtitle
          ? '700 22px ui-monospace, monospace'
          : '700 27px ui-monospace, monospace';
        context.fillText(
          fitCanvasText(context, value, 385),
          x + 24,
          subtitle ? y + 60 : y + 68
        );

        if (subtitle) {
          context.fillStyle = muted;
          context.font = '500 13px ui-monospace, monospace';
          context.fillText(
            fitCanvasText(context, subtitle, 385),
            x + 24,
            y + 80
          );
        }
      });

      context.fillStyle = muted;
      context.font = '500 17px system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText('Generato da EclipseJournal 🌙', 540, 992);
      context.textAlign = 'left';

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(result => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('PNG generation failed'));
          }
        }, 'image/png');
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = normalizeProfileFileName(traderName);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success('Profilo PNG scaricato.');
    } catch {
      toast.error('Impossibile generare il profilo PNG.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
        <DialogContent
          className="max-h-[88vh] overflow-y-auto rounded-2xl border border-border bg-card p-0 shadow-[0_20px_50px_rgba(0,0,0,0.35)] sm:max-w-2xl"
          onOpenAutoFocus={event => event.preventDefault()}
        >
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle className="font-mono text-lg">Profilo trader</DialogTitle>
            <DialogDescription>
              Progressi e statistiche calcolati dal journal Personale.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-5">
            <section className="rounded-[14px] border border-profit/25 bg-gradient-to-br from-profit/10 via-background/60 to-background/30 p-4">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border/70 pb-4">
                <div className="min-w-[190px] flex-1 space-y-1.5">
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
                  className="gap-2 bg-profit text-background hover:bg-profit/90"
                  onClick={handleShare}
                  disabled={isGeneratingImage}
                >
                  <ImageDown className="size-3.5" />
                  {isGeneratingImage ? 'Genero...' : 'Share'}
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-profit/30 bg-profit/10 text-[46px] leading-none shadow-[0_0_24px_rgba(0,214,143,0.08)]">
                  {DEFAULT_PROFILE_AVATAR}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-end justify-between gap-2">
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

            <section className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 lg:grid-cols-4">
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

            <section className="rounded-[14px] border border-violet-400/35 bg-violet-500/5 p-4">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">
                Modalità Streamer
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
                  className="border-violet-400/45 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 hover:text-violet-100"
                  onClick={toggleStreamerMode}
                >
                  {streamerMode
                    ? 'Disattiva modalità streamer'
                    : 'Attiva modalità streamer'}
                </Button>
              </div>
            </section>

            <section className="rounded-[14px] border border-loss/30 bg-loss/5 p-4">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-loss">
                Zona pericolosa
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-md font-sans text-xs leading-relaxed text-muted-foreground">
                  Cancella trade, piani, strategie ed errori personalizzati salvati nel
                  journal Personale. La Preview non verrà modificata.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 border-loss/50 text-loss hover:bg-loss/10 hover:text-loss"
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
        <DialogContent className="rounded-2xl border border-loss/35 bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-loss">
              Svuota journal Personale
            </DialogTitle>
            <DialogDescription>
              Questa azione è irreversibile e non toccherà i dati Preview.
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

          <DialogFooter>
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
    </>
  );
}
