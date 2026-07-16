import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

export function StatisticsCardGrid({
  className,
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4 [&>*]:min-w-0',
        className
      )}
      {...props}
    />
  );
}
