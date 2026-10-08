import { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ALL_CATALOG_ASSETS, ASSET_CATALOG, toggleAssetItem } from '@/lib/asset-catalog';
import { addAsset } from '@/lib/preferences';
import { cn } from '@/lib/utils';

interface AssetPickerProps {
  value: string[];
  onChange: (assets: string[]) => void;
}

export function AssetPicker({ value, onChange }: AssetPickerProps) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toUpperCase();

  const groups = useMemo(
    () =>
      ASSET_CATALOG.map(group => ({
        ...group,
        items: group.items.filter(item =>
          item.symbols.some(symbol => symbol.includes(normalizedQuery))
        ),
      })).filter(group => group.items.length > 0),
    [normalizedQuery]
  );

  const customAssets = value.filter(asset => !ALL_CATALOG_ASSETS.includes(asset));

  return (
    <div className="flex flex-col gap-4">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map(asset => (
            <button
              key={asset}
              type="button"
              onClick={() => onChange(value.filter(item => item !== asset))}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0a0a0b]"
            >
              {asset}
              <X className="size-3" />
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && normalizedQuery && groups.length === 0) {
              event.preventDefault();
              onChange(addAsset(value, query));
              setQuery('');
            }
          }}
          placeholder="Cerca il tuo asset (Invio per aggiungerne uno nuovo)"
          className="pl-9"
        />
      </div>

      <div className="ej-scrollbar flex max-h-[280px] flex-col gap-4 overflow-y-auto pr-1">
        {groups.map(group => (
          <div key={group.group}>
            <div className="mb-2 text-[11px] font-medium text-muted-foreground">
              {group.group}
            </div>
            <div className="flex flex-wrap gap-2">
              {group.items.map(item => {
                const selected = item.symbols.every(symbol => value.includes(symbol));

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onChange(toggleAssetItem(value, item))}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      selected
                        ? 'border-white/40 bg-white/10 text-foreground'
                        : 'border-border text-muted-foreground hover:bg-white/5 hover:text-foreground'
                    )}
                  >
                    {selected && <Check className="size-3" />}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nessun asset trovato. Premi Invio per aggiungere «{normalizedQuery}».
          </p>
        )}
        {customAssets.length > 0 && groups.length > 0 && (
          <div>
            <div className="mb-2 text-[11px] font-medium text-muted-foreground">
              Aggiunti da te
            </div>
            <div className="flex flex-wrap gap-2">
              {customAssets.map(asset => (
                <span key={asset} className="rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium">
                  {asset}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
