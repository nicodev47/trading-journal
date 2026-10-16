import { getAssetLogos } from '@/lib/asset-logos';
import { cn } from '@/lib/utils';

/** Round logo of an asset (index, metal, crypto, or the two flags of a forex pair). */
export function AssetIcon({ symbol, className }: { symbol?: string | null; className?: string }) {
  const logos = getAssetLogos(symbol);

  if (logos.length === 0) return null;

  return (
    <span className={cn('inline-flex shrink-0 items-center -space-x-1.5', className)} aria-hidden="true">
      {logos.map(name => (
        <img
          key={name}
          src={`/asset-logos/${name}.svg`}
          alt=""
          className="size-5 rounded-full object-cover ring-1 ring-background"
        />
      ))}
    </span>
  );
}

/** Asset symbol with its logo in front. */
export function AssetName({
  symbol,
  fallback = '—',
  className,
}: {
  symbol?: string | null;
  fallback?: string;
  className?: string;
}) {
  const text = symbol?.trim();

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <AssetIcon symbol={text} />
      {text || fallback}
    </span>
  );
}
