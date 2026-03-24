import { ComponentProps } from 'react';
import { cn } from '@/shared/lib/utils';

export function HelperText({ className, ...rest }: ComponentProps<'p'>) {
  return <p className={cn('text-xs text-[#8C8C8C]', className)} {...rest} />;
}
