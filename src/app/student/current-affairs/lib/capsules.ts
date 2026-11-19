// src/app/student/current-affairs/lib/capsules.ts

import { unstable_cache } from "next/cache";
import { supabase } from "@/utils/supabase";
import { todayIST } from "@/utils/istDate";

/** Only the columns the UI actually uses. */
const COLUMNS =
  "id,source_type,category_tag,original_date,source_url,read_time,required_plan," +
  "title_en,title_hi,title_mr,summary_en,summary_hi,summary_mr,created_at";

/** Raw DB query (uncached). Throws on error so failures are never cached. */
export const queryCapsules = async (date: string) => {
  const { data, error } = await supabase
    .from("current_affairs_capsules")
    .select(COLUMNS)
    .eq("original_date", date)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
};

// today: short cache (news still arriving). past: long cache (never changes).
const getTodayCapsules = unstable_cache(queryCapsules, ["capsules-today"], {
  revalidate: 60,
  tags: ["capsules"],
});
const getPastCapsules = unstable_cache(queryCapsules, ["capsules-past"], {
  revalidate: 3600,
  tags: ["capsules"],
});

/** Cached read for any date. Used by BOTH page.tsx and the warm route. */
export async function getCapsulesForDate(date: string) {
  const isToday = date === todayIST();
  let rows = await (isToday ? getTodayCapsules(date) : getPastCapsules(date));

  // Never serve an EMPTY "today" from cache, so the self-healing poll sees new rows at once.
  if (isToday && rows.length === 0) rows = await queryCapsules(date);

  return rows;
}