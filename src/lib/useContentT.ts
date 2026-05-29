/**
 * useContentT — translate admin-authored DB strings on the fly.
 *
 * USAGE — single string:
 *   const heading = useContentT("video_section", section.id, "heading", section.heading);
 *
 * USAGE — batch (preferred when rendering a list):
 *   const tr = useContentTBatch([
 *     { entityType: "video_section", entityId: s.id, field: "heading",    source: s.heading },
 *     { entityType: "video_section", entityId: s.id, field: "subheading", source: s.subheading ?? "" },
 *   ]);
 *   tr("video_section", s.id, "heading"); // returns translated string
 *
 * Behaviour:
 *  - English locale → returns source unchanged.
 *  - Cache hit       → returns translated.
 *  - Cache miss      → returns source immediately; background AI fills cache
 *                      and a re-render shows the translation on next visit.
 */
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useLocale } from "./i18n";
import { getContentTranslations } from "./content-translations.functions";

export type TItem = {
  entityType: string;
  entityId: string;
  field: string;
  source: string;
};

function keyOf(t: { entityType: string; entityId: string; field: string }) {
  return `${t.entityType}:${t.entityId}:${t.field}`;
}

export function useContentTBatch(items: TItem[]) {
  const [loc] = useLocale();
  const call = useServerFn(getContentTranslations);
  const [map, setMap] = useState<Record<string, string>>({});

  // Stable signature based on inputs (drop empty sources).
  const filtered = useMemo(
    () => items.filter((it) => it.source && it.source.trim().length > 0),
    [JSON.stringify(items)],
  );
  const sig = useMemo(
    () => filtered.map((it) => `${keyOf(it)}|${it.source.length}`).join(","),
    [filtered],
  );

  useEffect(() => {
    if (loc === "en" || !filtered.length) {
      // Synchronously map source → source.
      const m: Record<string, string> = {};
      for (const it of filtered) m[keyOf(it)] = it.source;
      setMap(m);
      return;
    }
    let cancelled = false;
    call({ data: { locale: loc, items: filtered.slice(0, 50) } })
      .then((r) => { if (!cancelled && r?.translations) setMap(r.translations); })
      .catch(() => { /* keep source fallback */ });
    return () => { cancelled = true; };
  }, [loc, sig]);

  return (entityType: string, entityId: string, field: string): string => {
    const k = `${entityType}:${entityId}:${field}`;
    if (map[k]) return map[k];
    const src = filtered.find((it) => keyOf(it) === k);
    return src?.source ?? "";
  };
}

export function useContentT(entityType: string, entityId: string, field: string, source: string) {
  const get = useContentTBatch([{ entityType, entityId, field, source }]);
  return get(entityType, entityId, field);
}