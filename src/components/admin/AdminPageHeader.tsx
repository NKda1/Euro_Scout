import AdminNav from "@/components/admin/AdminNav";

interface AdminPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export default function AdminPageHeader({ eyebrow, title, description }: AdminPageHeaderProps) {
  return (
    <header className="space-y-6">
      <div>
        <p className="eyebrow-red">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">{description}</p>
      </div>
      <AdminNav />
    </header>
  );
}
