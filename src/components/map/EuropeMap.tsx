"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Region } from "@/types";
import { cn } from "@/lib/utils";

interface EuropeMapProps {
  regions: Region[];
  selectedRegionId?: string | null;
  onRegionSelect: (region: Region) => void;
}

export default function EuropeMap({ regions, selectedRegionId, onRegionSelect }: EuropeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgMarkup, setSvgMarkup] = useState("");
  const [error, setError] = useState("");

  const regionByPathId = useMemo(() => {
    return new Map(regions.map((region) => [region.mapPathId, region]));
  }, [regions]);

  const activePathId = regions.find((region) => region.id === selectedRegionId)?.mapPathId;

  useEffect(() => {
    let mounted = true;

    fetch("/europe.svg")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load the Europe map.");
        }

        return response.text();
      })
      .then((markup) => {
        if (mounted) {
          setSvgMarkup(markup);
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Map unavailable. Try refreshing the page.");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !svgMarkup) {
      return;
    }

    const paths = Array.from(container.querySelectorAll<SVGPathElement>("path[id]"));
    const cleanup: Array<() => void> = [];

    paths.forEach((path) => {
      const region = regionByPathId.get(path.id);
      path.classList.add("europe-map__country");
      path.classList.toggle("europe-map__country--available", Boolean(region));
      path.classList.toggle("europe-map__country--active", path.id === activePathId);

      if (region) {
        path.setAttribute("role", "button");
        path.setAttribute("tabindex", "0");
        path.setAttribute("aria-label", `Open ${region.name}`);

        const handleSelect = () => onRegionSelect(region);
        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onRegionSelect(region);
          }
        };

        path.addEventListener("click", handleSelect);
        path.addEventListener("keydown", handleKeyDown);
        cleanup.push(() => {
          path.removeEventListener("click", handleSelect);
          path.removeEventListener("keydown", handleKeyDown);
        });
      }
    });

    return () => cleanup.forEach((removeListener) => removeListener());
  }, [activePathId, onRegionSelect, regionByPathId, svgMarkup]);

  if (!svgMarkup) {
    return (
      <div ref={containerRef} className="europe-map grid h-full min-h-[360px] place-items-center overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-inner backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <span className="px-6 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">{error || "Loading map..."}</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("europe-map h-full min-h-[360px] overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-inner backdrop-blur-xl dark:border-white/10 dark:bg-white/10")}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
