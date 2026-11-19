// src/app/api/cron/fetch-news/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logCronRun } from "@/lib/cronLogger";
import { toISTDateString, todayIST } from "@/utils/istDate";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

type SourceKind = "rbi" | "pib" | "economy";

// Each source can list several candidate URLs. They are tried in order and the
// first one that returns usable <item> entries wins. PIB changes/blocks its RSS
// endpoints often, so it gets multiple fallbacks.
// NOTE: verify these against https://pib.gov.in (RSS page) if PIB still fails.
const FEED_SOURCES: { type: SourceKind; urls: string[]; limit: number }[] = [
  { type: "rbi", urls: ["https://rbi.org.in/Pressreleases_RSS.xml"], limit: 5 },
  {
    type: "pib",
    urls: [
      "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3", // all press releases (English)
      "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3",
      "https://pib.gov.in/RssMain.aspx?MinId=18", // Ministry of Finance (old URL)
      "https://www.pib.gov.in/RssMain.aspx?MinId=18",
    ],
    limit: 40, // all-ministry feed with only title+link; keyword-filtered + enriched below
  },
  {
    type: "economy",
    urls: ["https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms"],
    limit: 5,
  },
];

interface RawArticle {
  source_type: SourceKind;
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml, text/xml, */*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
};

function decodeEntities(input: string): string {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

function getTag(item: string, tag: string): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = item.match(re);
  if (!match) return "";
  let value = match[1].trim();
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) value = cdata[1].trim();
  return value;
}

function stripHtml(input: string): string {
  // Decode first (PIB ships escaped HTML like &lt;p&gt;), then strip tags, then decode again.
  return decodeEntities(decodeEntities(input).replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function parseRssFeed(xmlText: string, sourceType: SourceKind, baseUrl: string, limit: number): RawArticle[] {
  const articles: RawArticle[] = [];
  const itemMatches = xmlText.match(/<item[\s>][\s\S]*?<\/item>/gi);
  if (!itemMatches) return [];

  for (const item of itemMatches.slice(0, limit)) {
    const title = stripHtml(getTag(item, "title"));
    let link = decodeEntities(getTag(item, "link")) || decodeEntities(getTag(item, "guid"));
    const description = stripHtml(getTag(item, "description"));
    const rawDate = getTag(item, "pubDate") || getTag(item, "dc:date");

    if (link.startsWith("/")) {
      try {
        link = new URL(link, baseUrl).toString();
      } catch {
        /* keep as-is */
      }
    }

    // Guard against unparseable dates (would otherwise throw later).
    const parsedDate = rawDate ? new Date(rawDate) : null;
    const pubDate =
      parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toUTCString() : new Date().toUTCString();

    if (title && link) {
      articles.push({ source_type: sourceType, title, link, description: description || title, pubDate });
    }
  }

  return articles;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 5,
  delay = 1000
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok && retries > 0) {
      throw new Error(`HTTP status code error: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise((res) => setTimeout(res, delay));
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
}

async function fetchTextWithTimeout(url: string, ms = 15000): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: BROWSER_HEADERS,
      signal: controller.signal,
    });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

// PIB's feed covers every ministry and only gives title + link. We keep only
// items that look finance/banking/economy related (English + Hindi titles).
const PIB_KEYWORDS = [
  "bank", "rbi", "reserve bank", "financ", "fiscal", "budget", "tax", "gst", "customs", "economy", "economic",
  "inflation", "gdp", "scheme", "yojana", "msme", "loan", "credit", "insurance", "pension", "invest", "fdi",
  "upi", "payment", "digital", "sebi", "nabard", "trade", "export", "import", "subsidy", "msp", "farmer",
  "mission", "startup", "stock", "bond", "currency", "rupee", "revenue", "disinvest", "cabinet", "gem",
  "बैंक", "वित्त", "कर", "बजट", "अर्थ", "योजना", "ऋण", "बीमा", "पेंशन", "निवेश", "व्यापार", "निर्यात",
  "आयात", "किसान", "सब्सिडी", "मुद्रा", "भुगतान", "स्टार्ट", "मंत्रिमंडल", "राजस्व", "मिशन", "रुपये", "रुपया",
];

function isFinanceRelevant(title: string): boolean {
  const lower = title.toLowerCase();
  return PIB_KEYWORDS.some((k) => lower.includes(k));
}

/** Pulls readable text from a PIB press-release page so Gemini gets more than a headline. */
async function fetchArticleText(url: string): Promise<string> {
  try {
    const { status, text } = await fetchTextWithTimeout(url, 12000);
    if (status < 200 || status >= 300) return "";
    const cleaned = text
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " ");
    return decodeEntities(cleaned).replace(/\s+/g, " ").trim().slice(0, 4000);
  } catch {
    return "";
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  console.log("Crawler API route hit!");

  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  const { searchParams } = new URL(request.url);
  const bypassParam = searchParams.get("bypass");

  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const isAuthorized = !!cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isBypass = bypassParam === "true";

  if (!isVercelCron && !isAuthorized && !isBypass) {
    console.error("Unauthorized access attempt blocked.");
    return new NextResponse("Unauthorized Access Attempt", { status: 401 });
  }

  const startedAt = new Date();
  const feedErrors: { feed: string; message: string }[] = [];
  const feedStats: { feed: string; url_used: string | null; items: number; fetched?: number }[] = [];

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase Environment Credentials");
    return NextResponse.json(
      { success: false, error: "Missing Supabase Environment Credentials" },
      { status: 500 }
    );
  }

  if (!GEMINI_API_KEY) {
    console.error("Missing Gemini API Key Environment Variable");
    return NextResponse.json(
      { success: false, error: "Missing Gemini API Key Environment Variable" },
      { status: 500 }
    );
  }

  const scrapedList: RawArticle[] = [];
  const processedRecords: string[] = [];
  const articleErrors: { title: string; message: string }[] = [];

  // 1. Aggregation: try each candidate URL until one yields items.
  for (const feed of FEED_SOURCES) {
    let usedUrl: string | null = null;
    let parsed: RawArticle[] = [];

    for (const url of feed.urls) {
      try {
        const { status, text } = await fetchTextWithTimeout(url);
        if (status < 200 || status >= 300) {
          feedErrors.push({ feed: feed.type, message: `${url} -> HTTP ${status}` });
          continue;
        }
        const items = parseRssFeed(text, feed.type, url, feed.limit);
        if (items.length === 0) {
          feedErrors.push({
            feed: feed.type,
            message: `${url} -> HTTP ${status} but 0 <item> parsed (first 120 chars: ${text
              .slice(0, 120)
              .replace(/\s+/g, " ")})`,
          });
          continue;
        }
        usedUrl = url;
        parsed = items;
        break;
      } catch (err: any) {
        console.error(`Scrape failure on ${feed.type} (${url}):`, err.message);
        feedErrors.push({ feed: feed.type, message: `${url} -> ${err.name === "AbortError" ? "timeout" : err.message}` });
      }
    }

    let fetchedCount: number | undefined;
    if (feed.type === "pib" && parsed.length > 0) {
      fetchedCount = parsed.length;
      // Keep only likely-relevant items, cap at 6 to stay inside the function time limit.
      parsed = parsed.filter((a) => isFinanceRelevant(a.title)).slice(0, 6);
      for (const a of parsed) {
        if (a.description === a.title) {
          const body = await fetchArticleText(a.link);
          if (body) a.description = body;
        }
      }
    }

    feedStats.push({ feed: feed.type, url_used: usedUrl, items: parsed.length, fetched: fetchedCount });
    scrapedList.push(...parsed);
  }

  // 2. AI Categorization & Translation Phase
  for (const article of scrapedList) {
    try {
      const { data: existingRecord } = await supabase
        .from("current_affairs_capsules")
        .select("id")
        .eq("source_url", article.link)
        .maybeSingle();

      if (existingRecord) continue;

      const systemInstruction = `
        You are a distinguished faculty member specializing in Indian Banking Exams (RBI Grade B, SBI PO, IBPS, NABARD).
        Your task is to analyze the raw news payload and determine its relevance to banking exam syllabus topics.

        Syllabus topics of interest: Monetary Policy updates, Government schemes, Union Ministry allocations,
        bilateral payments, UPI node expansions, banking regulations, SEBI/RBI regulations.

        Strict Validation:
        1. If NOT relevant to banking exam preparation, set "is_relevant" to false.
        2. If highly relevant, set "is_relevant" to true and return a comprehensive summary tailored for students.

        Provide high-fidelity translations into Hindi (hi) and Marathi (mr).
        Assign a dynamic subscription required_plan matching the criteria density:
        - "free": Standard notifications, general updates.
        - "silver": Specialized banking regulations, minor policy shifts.
        - "gold": Key economic reviews, crucial budget segments.
        - "premium": Complex regulatory amendments or structural policy analysis (highly exclusive content).

        Response MUST be raw JSON matching this structure:
        {
          "is_relevant": boolean,
          "category_tag": "e.g., Monetary Policy | Government Schemes | Banking Regulations",
          "read_time": "e.g., 2 min read",
          "required_plan": "free" | "silver" | "gold" | "premium",
          "title_en": "Summarized English Title",
          "title_hi": "Summarized Hindi Title",
          "title_mr": "Summarized Marathi Title",
          "summary_en": "Bullet points summary in English",
          "summary_hi": "Bullet points summary in Hindi",
          "summary_mr": "Bullet points summary in Marathi"
        }
      `;

      const promptPayload = `
        Source System: ${article.source_type.toUpperCase()}
        Source Link: ${article.link}
        Raw Scraped Title: ${article.title}
        Raw Scraped Content: ${article.description}
      `;

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const payload = {
        contents: [{ parts: [{ text: `${systemInstruction}\n\nArticle Data:\n${promptPayload}` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              is_relevant: { type: "BOOLEAN" },
              category_tag: { type: "STRING" },
              read_time: { type: "STRING" },
              required_plan: { type: "STRING", enum: ["free", "silver", "gold", "premium"] },
              title_en: { type: "STRING" },
              title_hi: { type: "STRING" },
              title_mr: { type: "STRING" },
              summary_en: { type: "STRING" },
              summary_hi: { type: "STRING" },
              summary_mr: { type: "STRING" },
            },
            required: [
              "is_relevant",
              "category_tag",
              "read_time",
              "required_plan",
              "title_en",
              "title_hi",
              "title_mr",
              "summary_en",
              "summary_hi",
              "summary_mr",
            ],
          },
        },
      };

      const response = await fetchWithRetry(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        console.error(`Gemini evaluation failed with status ${response.status} for: ${article.title}`);
        articleErrors.push({
          title: article.title,
          message: `Gemini status ${response.status}: ${errorBody.slice(0, 300)}`,
        });
        continue;
      }

      const rawResult = await response.json();
      const rawText = rawResult.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const evaluatedData = JSON.parse(rawText);

      if (evaluatedData.is_relevant) {
        const originalDateFormatted = toISTDateString(new Date(article.pubDate)) || todayIST();

        const { error: dbError } = await supabase.from("current_affairs_capsules").insert({
          source_type: article.source_type,
          category_tag: evaluatedData.category_tag,
          original_date: originalDateFormatted,
          source_url: article.link,
          read_time: evaluatedData.read_time,
          required_plan: evaluatedData.required_plan,
          title_en: evaluatedData.title_en,
          title_hi: evaluatedData.title_hi,
          title_mr: evaluatedData.title_mr,
          summary_en: evaluatedData.summary_en,
          summary_hi: evaluatedData.summary_hi,
          summary_mr: evaluatedData.summary_mr,
        });

        if (dbError) {
          console.error("Supabase Injection Error:", dbError.message);
          articleErrors.push({ title: article.title, message: `Supabase insert: ${dbError.message}` });
        } else {
          processedRecords.push(article.title);
        }
      }
    } catch (err: any) {
      console.error(`Error processing capsule [${article.title}]:`, err.message);
      articleErrors.push({ title: article.title, message: err.message });
    }
  }

  await logCronRun("fetch-news", articleErrors.length > 0 || feedErrors.length > 0 ? "error" : "success", startedAt, {
    scraped_count: scrapedList.length,
    processed_count: processedRecords.length,
    processed_titles: processedRecords,
    feed_stats: feedStats,
    feed_errors: feedErrors,
    article_errors: articleErrors,
  });

  return NextResponse.json({
    success: true,
    scraped_count: scrapedList.length,
    processed_count: processedRecords.length,
    processed_titles: processedRecords,
    feed_stats: feedStats,
    feed_errors: feedErrors,
  });
}