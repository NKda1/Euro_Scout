import { getBaseUrl } from "@/lib/api";

export function absoluteUrl(path: string) {
  const base = getBaseUrl().replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function truncateMeta(value: string, max = 155) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean;
}

export function jsonLdScript(data: Record<string, unknown>) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c")
  };
}
