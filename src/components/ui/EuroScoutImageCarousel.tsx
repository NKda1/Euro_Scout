import Image from "next/image";
import { cn } from "@/lib/utils";

const frames = [
  "/images/ES11.png",
  "/images/ES12.png",
  "/images/ES13.png",
  "/images/ES15.png",
  "/images/ES16.png"
];

interface EuroScoutImageCarouselProps {
  className?: string;
  label?: string;
  title?: string;
}

export default function EuroScoutImageCarousel({ className, label, title }: EuroScoutImageCarouselProps) {
  return (
    <div className={cn("relative isolate min-h-80 overflow-hidden border border-slate-200 bg-slate-950 dark:border-white/10", className)}>
      {frames.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          sizes="(min-width: 1024px) 560px, 100vw"
          className="es-carousel-frame object-cover"
          style={{ animationDelay: `${index * 5}s` }}
          priority={index === 0}
        />
      ))}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,.2),rgba(2,6,23,.88))]" />
      {(label || title) ? (
        <div className="absolute inset-x-0 bottom-0 p-5">
          {label ? <p className="text-xs font-black uppercase text-red-200">{label}</p> : null}
          {title ? <p className="mt-2 max-w-md text-2xl font-black leading-tight text-white">{title}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
