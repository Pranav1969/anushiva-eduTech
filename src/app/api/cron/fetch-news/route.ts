import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase with Service Role Key to bypass Row-Level Security (RLS) for cron insertions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "");

// Setup the stable Google Gemini API Endpoint
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Define RSS source targets
const FEED_SOURCES = [
  { type: "rbi", url: "https://rbi.org.in/Pressreleases_RSS.xml" },
  { type: "pib", url: "https://pib.gov.in/RssMain.aspx?MinId=18" },
  { type: "economy", url: "https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms" },
];

interface RawArticle {
  source_type: "rbi" | "pib" | "economy";
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

function parseRssFeed(xmlText: string, sourceType: "rbi" | "pib" | "economy"): RawArticle[] {
  const articles: RawArticle[] = [];
  const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g);

  if (!itemMatches) return [];

  const targetItems = itemMatches.slice(0, 20);
  for (const item of targetItems) {
    const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || item.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = item.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/) || item.match(/<link>([\s\S]*?)<\/link>/);
    const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || item.match(/<description>([\s\S]*?)<\/description>/);
    const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    
    const title = titleMatch ? titleMatch[1].trim() : "";
    const link = linkMatch ? linkMatch[1].trim() : "";
    const rawDesc = descMatch ? descMatch[1].trim() : "";
    const pubDate = dateMatch ? dateMatch[1].trim() : new Date().toUTCString();
    
    const description = rawDesc.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (title && link) {
      articles.push({ source_type: sourceType, title, link, description, pubDate });
    }
  }
  return articles;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 5, delay = 1000): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok && retries > 0) throw new Error(`HTTP status code error: ${response.status}`);
    return response;
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise((res) => setTimeout(res, delay));
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  console.log("Crawler API route hit!");

  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  const { searchParams } = new URL(request.url);
  const bypassParam = searchParams.get("bypass");

  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const isAuthorized = authHeader === `Bearer ${cronSecret}`;
  const isBypass = bypassParam === "true";

  if (!isVercelCron && !isAuthorized && !isBypass) {
    console.error("Unauthorized access attempt blocked.");
    return new NextResponse("Unauthorized Access Attempt", { status: 401 });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ success: false, error: "Missing Supabase Credentials" }, { status: 500 });
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ success: false, error: "Missing Gemini API Key" }, { status: 500 });
  }

  const scrapedList: RawArticle[] = [];
  const processedRecords: string[] = [];

  for (const feed of FEED_SOURCES) {
    try {
      const response = await fetch(feed.url, {
        next: { revalidate: 0 },
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!response.ok) continue;
      const xmlText = await response.text();
      const parsed = parseRssFeed(xmlText, feed.type as "rbi" | "pib" | "economy");
      scrapedList.push(...parsed);
    } catch (err: any) {
      console.error(`Scrape failure on ${feed.type}:`, err.message);
    }
  }

  for (const article of scrapedList) {
    try {
      const { data: existingRecord } = await supabase
        .from("current_affairs_capsules")
        .select("id")
        .eq("source_url", article.link)
        .maybeSingle();

      if (existingRecord) continue;

      const systemInstruction = `You are a distinguished faculty member specializing in Indian Banking Exams. Analyze: ${article.title}. Return JSON with fields: is_relevant, category_tag, read_time, required_plan (free|silver|gold|premium), title_en, title_hi, title_mr, summary_en, summary_hi, summary_mr.`;

      const payload = {
        contents: [{ parts: [{ text: `${systemInstruction}\n\nData: ${article.description}` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              is_relevant: { type: "BOOLEAN" },
              category_tag: { type: "STRING" },
              read_time: { type: "STRING" },
              required_plan: { type: "STRING", enum: ["free", "silver", "gold", "premium"] },
              title_en: { type: "STRING" }, title_hi: { type: "STRING" }, title_mr: { type: "STRING" },
              summary_en: { type: "STRING" }, summary_hi: { type: "STRING" }, summary_mr: { type: "STRING" },
            },
            required: ["is_relevant", "category_tag", "read_time", "required_plan", "title_en", "title_hi", "title_mr", "summary_en", "summary_hi", "summary_mr"],
          },
        },
      };

      await new Promise((resolve) => setTimeout(resolve, 2000));
      const response = await fetchWithRetry(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) continue;

      const rawResult = await response.json();
      const rawText = rawResult.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;
      const evaluatedData = JSON.parse(rawText);

      if (evaluatedData.is_relevant) {
        const { error: dbError } = await supabase.from("current_affairs_capsules").insert({
          source_type: article.source_type,
          category_tag: evaluatedData.category_tag,
          original_date: new Date().toISOString().split("T")[0],
          source_url: article.link,
          ...evaluatedData,
        });
        if (!dbError) processedRecords.push(article.title);
      }
    } catch (err: any) {
      console.error(`Error processing ${article.title}:`, err.message);
    }
  }

  return NextResponse.json({ success: true, count: processedRecords.length, titles: processedRecords });
}