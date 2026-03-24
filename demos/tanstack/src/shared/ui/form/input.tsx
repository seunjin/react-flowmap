import * as React from 'react';
import { cn } from '@/shared/lib/utils';

interface InputProps extends React.ComponentProps<'input'> { error?: boolean }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      aria-invalid={Boolean(error)}
      className={cn(
        'h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 md:text-sm',
        error
          ? 'border-destructive focus-visible:border-destructive focus-visible:ring-[2px] focus-visible:ring-red-200'
          : 'border-input focus-visible:border-ring focus-visible:ring-[1px] focus-visible:ring-ring/50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
