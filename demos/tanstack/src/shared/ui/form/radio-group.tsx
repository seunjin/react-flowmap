import * as React from 'react';
import { CircleIcon } from 'lucide-react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { cn } from '@/shared/lib/utils';

interface RadioOptionItem {
  id: string;
  value: string;
  label: React.ReactNode;
}

interface RadioGroupProps
  extends Omit<React.ComponentProps<typeof RadioGroupPrimitive.Root>, 'children' | 'onValueChange' | 'onChange'> {
  options: readonly RadioOptionItem[];
  error?: boolean;
  onChange?: (value: string) => void;
}

function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="relative flex items-center justify-center">
        <CircleIcon className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

function RadioOption({ id, value, label, error = false }: RadioOptionItem & { error?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem
        id={id}
        value={value}
        className={cn(error && 'border-destructive text-destructive ring-[3px] ring-red-200')}
      />
      <label htmlFor={id} className={cn(error && 'text-destructive')}>{label}</label>
    </div>
  );
}

export function RadioGroup({ options, error = false, onChange, className, ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive.Root className={cn('grid gap-3', className)} onValueChange={onChange} {...props}>
      {options.map(option => (
        <RadioOption key={option.value} {...option} error={error} />
      ))}
    </RadioGroupPrimitive.Root>
  );
}
