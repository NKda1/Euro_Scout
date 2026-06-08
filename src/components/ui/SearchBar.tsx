interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value = "", onChange, placeholder = "Search..." }: SearchBarProps) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      className="h-11 w-full border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-[#111] dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-red-500/20"
    />
  );
}
