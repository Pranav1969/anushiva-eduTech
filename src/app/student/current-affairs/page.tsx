// src/app/student/current-affairs/page.tsx

import { headers } from "next/headers";
import { supabase } from "@/utils/supabase";
import NewsFeedClientWrapper from "./components/NewsFeedClientWrapper";
import { todayIST, formatISTDateLabel } from "@/utils/istDate";

export const dynamic = "force-dynamic";

/**
 * Fires a silent, non-blocking background crawler request to populate the database.
 * Unchanged from the original implementation.
 */
async function triggerBackgroundCrawlSilently(host: string) {
  const protocol = host.includes("localhost") ? "http" : "https";
  const targetUrl = `${protocol}://${host}/api/cron/fetch-news?bypass=true`;

  try {
    fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    }).catch((err) => console.error("Async fetch tracking error:", err));
  } catch (err) {
    console.error("Silent background crawl failed to execute:", err);
  }
}

/**
 * Fetches news scoped to a single `original_date`. If the requested date is
 * today's date and the database has nothing yet, kicks off the self-healing
 * crawl exactly as before. Past dates are never crawled on-demand since the
 * source RSS feeds don't carry historical items.
 */
async function fetchNewsForDate(host: string, date: string) {
  try {
    const { data: newsData, error: newsError } = await supabase
      .from("current_affairs_capsules")
      .select("*")
      .eq("original_date", date)
      .order("created_at", { ascending: false });

    if (newsError) {
      console.error("Supabase news fetching failed:", newsError.message);
      return [];
    }

    if ((!newsData || newsData.length === 0) && date === todayIST()) {
      console.log("[Autonomous Engine] Database is empty for today. Triggering crawl...");
      triggerBackgroundCrawlSilently(host);
    }

    return newsData || [];
  } catch (err: any) {
    console.error("Unhandled error occurred while extracting news:", err?.message || err);
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

  // Map DB schema to UI translation shape (unchanged)
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