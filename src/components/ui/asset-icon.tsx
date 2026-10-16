import { getAssetLogos } from '@/lib/asset-logos';
import { cn } from '@/lib/utils';

/** Round logo of an asset (index, metal, crypto, or the two flags of a forex pair). */
export function AssetIcon({
  symbol,
  size = 20,
  className,
}: {
  symbol?: string | null;
  size?: number;
  className?: string;
}) {
  const logos = getAssetLogos(symbol);

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
