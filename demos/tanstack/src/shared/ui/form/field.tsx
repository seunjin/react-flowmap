import { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { HelperText } from './helper-text';
import { Label } from './label';

interface FieldProps {
  label: string;
  error?: string;
  helperText?: string;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
}

export function Field({ label, error, helperText, children, className, labelClassName }: FieldProps) {
  const message = error ?? helperText;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Label error={Boolean(error)} className={labelClassName}>{label}</Label>
      {children}
      {message && <HelperText>{message}</HelperText>}
    </div>
  );
}
