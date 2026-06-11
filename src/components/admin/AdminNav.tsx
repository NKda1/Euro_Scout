import Link from "next/link";

const adminLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/profiles", label: "Profiles" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/club-verification", label: "Club Verification" },
  { href: "/admin/news", label: "News" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/disputes", label: "Disputes" }
];

export default function AdminNav() {
  return (
    <div className="flex flex-wrap gap-2 border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-[#111]">
      {adminLinks.map((link) => (
        <Link key={link.href} href={link.href} className="px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-200 dark:hover:bg-red-500/10 dark:hover:text-red-300">
          {link.label}
        </Link>
      ))}
    </div>
  );
}
