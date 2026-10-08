import { Moon } from 'lucide-react';
import { ProfileAvatar } from '@/components/preferences/profile-fields';
import { getShareIdentity } from '@/components/trading-journal/share-card-parts';
import { getCalendarAssets } from '@/lib/asset-catalog';
import type { JournalPreferences } from '@/lib/preferences';
import { cn } from '@/lib/utils';

const SAMPLE_DAYS: Record<number, number> = {
  2: 1, 3: 1, 6: -1, 8: 1, 9: 1, 10: -1, 14: 1, 15: 1, 17: 1, 21: -1, 22: 1, 24: 1,
};

function Chips({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground/70">{empty}</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <span
          key={item}
          className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function OnboardingPreview({ draft }: { draft: JournalPreferences }) {
  const identity = getShareIdentity(draft.name);
  const calendarAssets = getCalendarAssets(draft.assets);
  const assets = calendarAssets.length > 0 ? calendarAssets : ['XX'];
  const outcomeDays = Object.keys(SAMPLE_DAYS).map(Number);

  return (
    <div className="flex w-full max-w-[460px] flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <ProfileAvatar name={draft.name} photo={draft.photo} fallbackInitials="MR" className="size-16 text-xl" />
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold">
              {identity?.displayName ?? 'Il tuo nome'}
            </div>
            <div className="text-sm text-muted-foreground">Trader</div>
          </div>
          <Moon className="ml-auto size-5 shrink-0 text-muted-foreground max-md:hidden" />
        </div>

        <div className="mt-6 grid gap-5">
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Asset</div>
            <Chips items={draft.assets} empty="Scegli gli asset che operi" />
          </div>
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Setup</div>
            <Chips items={draft.setups} empty="Aggiungi i tuoi setup" />
          </div>
          {draft.windows.some(window => window.name.trim()) && (
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Finestre operative</div>
              <div className="grid gap-1 text-sm">
                {draft.windows
                  .filter(window => window.name.trim())
                  .map(window => (
                    <div key={window.id} className="flex justify-between gap-4">
                      <span>{window.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {window.start}–{window.end}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 max-md:hidden">
        <div className="mb-3 text-xs font-medium text-muted-foreground">Il tuo calendario</div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 28 }, (_, index) => {
            const day = index + 1;
            const outcome = SAMPLE_DAYS[day];
            const outcomeIndex = outcomeDays.indexOf(day);
            const asset = assets[outcomeIndex % assets.length];

            return (
              <div
                key={day}
                className={cn(
                  'flex aspect-square flex-col rounded-lg p-1.5 text-[10px] text-muted-foreground',
                  outcome === 1 && 'bg-profit/15 text-profit',
                  outcome === -1 && 'bg-loss/15 text-loss',
                  !outcome && 'bg-white/[0.03]'
                )}
              >
                <span>{day}</span>
                {outcome && (
                  <span className="mt-auto truncate text-[9px] font-medium leading-tight">
                    {asset}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
