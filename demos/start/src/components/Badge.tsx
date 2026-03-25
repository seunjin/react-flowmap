export function Badge({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-gray-100 text-gray-500">
      {label}
    </span>
  );
}
