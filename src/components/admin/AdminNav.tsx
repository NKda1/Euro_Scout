import Link from "next/link";

const adminLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/profiles", label: "Profiles" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/messages", label: "Messages" }
];

export default function AdminNav() {
  return (
    <div className="flex flex-wrap gap-2 rounded-3xl border border-white/70 bg-white/70 p-2 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
      {adminLinks.map((link) => (
        <Link key={link.href} href={link.href} className="rounded-2xl px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
          {link.label}
        </Link>
      ))}
    </div>
  );
}
