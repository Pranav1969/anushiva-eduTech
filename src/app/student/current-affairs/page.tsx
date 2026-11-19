// src/app/student/current-affairs/page.tsx

import { headers } from "next/headers";
import NewsFeedClientWrapper from "./components/NewsFeedClientWrapper";
import { getCapsulesForDate } from "./lib/capsules";
import { todayIST, formatISTDateLabel } from "@/utils/istDate";

/** Fires a silent, non-blocking background crawler request to populate the database. */
async function triggerBackgroundCrawlSilently(host: string) {
  const protocol = host.includes("localhost") ? "http" : "https";
  const targetUrl = `${protocol}://${host}/api/cron/fetch-news?bypass=true`;

  try {
    fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    }).catch((err) => console.error("Async fetch tracking error:", err));
  } catch (err) {
    console.error("Silent background crawl failed to execute:", err);
  }
}

async function fetchNewsForDate(host: string, date: string) {
  try {
    const rows = await getCapsulesForDate(date);

    // Side effect stays OUTSIDE the cache
    if (rows.length === 0 && date === todayIST()) {
      console.log("[Autonomous Engine] Database is empty for today. Triggering crawl...");
      triggerBackgroundCrawlSilently(host);
    }
    return rows;
  } catch (err: any) {
    console.error("News fetch failed:", err?.message || err);
    return [];
  }
}

interface CurrentAffairsPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function CurrentAffairsPage({ searchParams }: CurrentAffairsPageProps) {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";

  const { date } = await searchParams;
  const selectedDate = date || todayIST();

  const freshNewsFeed = await fetchNewsForDate(host, selectedDate);

  const formattedNews = freshNewsFeed.map((item: any) => ({
    id: item.id,
    source_type: item.source_type,
    category_tag: item.category_tag,
    original_date: formatISTDateLabel(item.original_date || selectedDate),
    source_url: item.source_url,
    read_time: item.read_time || "2 min read",
    required_plan: item.required_plan || "free",
    title: {
      en: item.title_en || "",
      hi: item.title_hi || item.title_en || "",
      mr: item.title_mr || item.title_en || "",
    },
    summary: {
      en: item.summary_en || "",
      hi: item.summary_hi || item.summary_en || "",
      mr: item.summary_mr || item.summary_en || "",
    },
  }));

  return <NewsFeedClientWrapper initialFeed={formattedNews} selectedDate={selectedDate} />;
}