'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { FIRMS } from '@/lib/propfirm/firms';
import { GUIDES, getGuide } from '@/lib/propfirm/guide';
import { cn } from '@/lib/utils';
import { FirmMark } from './shared';

/** Rules and procedures of every firm, phase by phase, with the official sources. */
export function RulesGuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const firms = FIRMS.filter(firm => GUIDES.some(guide => guide.firmId === firm.id));
  const [firmId, setFirmId] = useState(firms[0]?.id ?? '');
  const firm = firms.find(item => item.id === firmId);
  const guide = getGuide(firmId);

  return (
    <Dialog open={open} onOpenChange={next => !next && onClose()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.25rem)] max-w-3xl gap-0 overflow-y-auto rounded-2xl p-0 sm:w-[92vw]">
        <div className="border-b border-border px-5 py-4">
          <DialogTitle className="font-sans text-base font-semibold">Guida alle regole</DialogTitle>
          <DialogDescription className="mt-0.5 font-sans text-xs text-muted-foreground">
            Regole e procedure di ogni prop firm, dal centro assistenza ufficiale (lette il 17 ott 2026).
          </DialogDescription>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {firms.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFirmId(item.id)}
                className={cn(
                  'flex h-9 items-center gap-2 rounded-full border px-3 font-sans text-xs font-medium transition-colors',
                  item.id === firmId ? 'border-white/30 bg-white/10' : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <FirmMark firm={item} className="size-5" />
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {guide && firm && (
          <div className="flex flex-col gap-5 px-5 py-5">
            {guide.sections.map(section => (
              <section key={section.title} className="flex flex-col gap-2">
                <h3 className="font-sans text-sm font-semibold">{section.title}</h3>
                <ul className="flex flex-col gap-1.5">
                  {section.items.map(item => (
                    <li key={item} className="flex gap-2 font-sans text-xs leading-relaxed text-muted-foreground">
                      <span className="mt-1.5 size-1 flex-none rounded-full bg-white/40" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {guide.gaps.length > 0 && (
              <section className="rounded-xl border border-border bg-white/[0.03] p-3.5">
                <h3 className="font-sans text-xs font-semibold">Da sapere sul simulatore</h3>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {guide.gaps.map(item => (
                    <li key={item} className="font-sans text-xs leading-relaxed text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-wrap gap-2">
              {guide.sources.map(source => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-sans text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {source.label}
                  <ExternalLink className="size-3" />
                </a>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
