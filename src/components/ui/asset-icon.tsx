import { getAssetLogos, getFuturesBadge } from '@/lib/asset-logos';
import { cn } from '@/lib/utils';

/**
 * Round icon of an asset: a badge with the contract name for futures (like NQ),
 * the logo for indices, metals and crypto, two flags for a forex pair.
 */
export function AssetIcon({
  symbol,
  size = 20,
  className,
}: {
  symbol?: string | null;
  size?: number;
  className?: string;
}) {
  const key = (symbol ?? '').trim().toUpperCase();
  const badge = getFuturesBadge(key);

  if (badge) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-full font-sans font-bold leading-none tracking-tight',
          badge.dark ? 'text-black' : 'text-white',
          className
        )}
        style={{
          width: size,
          height: size,
          backgroundColor: badge.color,
          fontSize: Math.max(6, Math.round(size * (key.length > 3 ? 0.28 : key.length > 2 ? 0.34 : 0.42))),
        }}
      >
        {key}
      </span>
    );
  }

  const logos = getAssetLogos(key);

  if (logos.length === 0) return null;

  return (
    <span className={cn('inline-flex shrink-0 items-center -space-x-1.5', className)} aria-hidden="true">
      {logos.map(name => (
        <img
          key={name}
          src={`/asset-logos/${name}.svg`}
          alt=""
          style={{ width: size, height: size }}
          className="rounded-full object-cover ring-1 ring-background"
        />
      ))}
    </span>
  );
}

/** Asset symbol with its icon in front. */
export function AssetName({
  symbol,
  fallback = '—',
  className,
  size,
}: {
  symbol?: string | null;
  fallback?: string;
  className?: string;
  size?: number;
}) {
  const text = symbol?.trim();

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <AssetIcon symbol={text} size={size} />
      {text || fallback}
    </span>
  );
}
