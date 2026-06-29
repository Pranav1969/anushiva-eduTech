import { headers } from "next/headers";
import { supabase } from "@/utils/supabase";
import NewsFeedClientWrapper from "./components/NewsFeedClientWrapper";

export const dynamic = "force-dynamic";

/**
 * Fires a silent, non-blocking background crawler request to populate the database
 */
async function triggerBackgroundCrawlSilently(host: string) {
  const protocol = host.includes("localhost") ? "http" : "https";
  const targetUrl = `${protocol}://${host}/api/cron/fetch-news?bypass=true`;

  try {
    // Fire-and-forget execution
    fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
    }).catch((err) => console.error("Async fetch tracking error:", err));
    
    console.log(`[Autonomous Engine] Background crawl silently initiated targeting: ${targetUrl}`);
  } catch (err) {
    console.error("Silent background crawl failed to execute:", err);
  }
}

/**
 * Fetches news without delay and triggers self-healing crawl if DB is empty.
 */
async function fetchAutomatedNews(host: string) {
  try {
    // 1. Fetch news immediately without time-based filters
    // Using { cache: "no-store" } via the underlying fetch behavior in Supabase/Next.js
    const { data: newsData, error: newsError } = await supabase
      .from("current_affairs_capsules")
      .select("*")
      .order("created_at", { ascending: false });

    if (newsError) {
      console.error("Supabase news fetching failed:", newsError.message);
      return [];
    }

    // 2. Self-healing check: If data is empty, trigger the crawl
    if (!newsData || newsData.length === 0) {
      console.log("[Autonomous Engine] Database is empty. Triggering crawl...");
      triggerBackgroundCrawlSilently(host);
    }

    return newsData || [];
  } catch (err: any) {
    console.error("Unhandled error occurred while extracting news:", err?.message || err);
    return [];
  }
}

export default async function CurrentAffairsPage() {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";

  const freshNewsFeed = await fetchAutomatedNews(host);

  // Map DB schema to UI translation shape
  const formattedNews = freshNewsFeed.map((item: any) => ({
    id: item.id,
    source_type: item.source_type,
    category_tag: item.category_tag,
    original_date: item.original_date 
      ? new Date(item.original_date).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }) 
      : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    source_url: item.source_url,
    read_time: item.read_time || "2 min read",
    required_plan: item.required_plan || "free",
    title: { 
      en: item.title_en || "", 
      hi: item.title_hi || item.title_en || "", 
      mr: item.title_mr || item.title_en || "" 
    },
    summary: { 
      en: item.summary_en || "", 
      hi: item.summary_hi || item.summary_en || "", 
      mr: item.summary_mr || item.summary_en || "" 
    }
  }));

  return <NewsFeedClientWrapper initialFeed={formattedNews} />;
}