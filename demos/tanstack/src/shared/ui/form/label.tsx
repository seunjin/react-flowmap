import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/utils';

interface FormLabelProps extends ComponentProps<'label'> { error?: boolean }

export function Label({ className, error, ...rest }: FormLabelProps) {
  return (
    <label
      className={cn(
        'text-base font-medium',
        error ? 'text-destructive' : 'text-general-foreground',
        className,
      )}
      {...rest}
    />
  );
}
