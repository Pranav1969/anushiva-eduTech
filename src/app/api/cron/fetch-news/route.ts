import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase with Service Role Key to bypass Row-Level Security (RLS) for cron insertions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl || "", supabaseServiceKey || "");

// Setup the stable Google Gemini API Endpoint (Migrated from discontinued preview model)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Define RSS source targets
const FEED_SOURCES = [
  {
    type: "rbi",
    url: "https://rbi.org.in/Pressreleases_RSS.xml",
  },
  {
    type: "pib",
    url: "https://pib.gov.in/RssMain.aspx?MinId=18", // Ministry of Finance RSS
  },
  {
    type: "economy",
    url: "https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms", // Economy RSS
  },
];

interface RawArticle {
  source_type: "rbi" | "pib" | "economy";
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

/**
 * Robust, dependency-free regex XML parser to extract <item> tags from live RSS feeds
 */
function parseRssFeed(xmlText: string, sourceType: "rbi" | "pib" | "economy"): RawArticle[] {
  const articles: RawArticle[] = [];
  const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g);

  if (!itemMatches) return [];

  // Parse up to 5 latest articles per source to keep runtimes fast and cost-effective
 // const targetItems = itemMatches.slice(0, 5);
  const targetItems = itemMatches.slice(0, 20); // Check the top 20 items instead
  for (const item of targetItems) {
    const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || item.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = item.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/) || item.match(/<link>([\s\S]*?)<\/link>/);
    const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || item.match(/<description>([\s\S]*?)<\/description>/);
    const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

    const title = titleMatch ? titleMatch[1].trim() : "";
    const link = linkMatch ? linkMatch[1].trim() : "";
    const rawDesc = descMatch ? descMatch[1].trim() : "";
    const pubDate = dateMatch ? dateMatch[1].trim() : new Date().toUTCString();

    // Clean description HTML tags
    const description = rawDesc.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

    if (title && link) {
      articles.push({
        source_type: sourceType,
        title,
        link,
        description,
        pubDate,
      });
    }
  }

  return articles;
}

/**
 * Exponential backoff helper for resilient external API connections
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 5, delay = 1000): Promise<Response> {
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
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  console.log("Crawler API route hit!");

  // 1. Retrieve the header (handling both case scenarios)
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // 2. Setup bypass parameter for manual testing
  const { searchParams } = new URL(request.url);
  const bypassParam = searchParams.get("bypass");

  // 3. Unified Security Gatekeeper
  // Check if it's a Vercel-automated cron job, a valid Bearer token, or a manual bypass
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const isAuthorized = authHeader === `Bearer ${cronSecret}`;
  const isBypass = bypassParam === "true";

  if (!isVercelCron && !isAuthorized && !isBypass) {
    console.error("Unauthorized access attempt blocked.");
    return new NextResponse("Unauthorized Access Attempt", { status: 401 });
  }

  // 4. Validate Environment Credentials
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase Environment Credentials");
    return NextResponse.json({ success: false, error: "Missing Supabase Environment Credentials" }, { status: 500 });
  }
  

  if (!GEMINI_API_KEY) {
    console.error("Missing Gemini API Key Environment Variable");
    return NextResponse.json({ success: false, error: "Missing Gemini API Key Environment Variable" }, { status: 500 });
  }

  const scrapedList: RawArticle[] = [];
  const processedRecords: string[] = [];

  // 2. Automated Aggregation Phase (RSS Scrapers)
  for (const feed of FEED_SOURCES) {
    try {
      const response = await fetch(feed.url, {
        next: { revalidate: 0 }, // Prevent Next.js cache layers from blocking new updates
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      });
      if (!response.ok) continue;

      const xmlText = await response.text();
      const parsed = parseRssFeed(xmlText, feed.type as "rbi" | "pib" | "economy");
      scrapedList.push(...parsed);
    } catch (err: any) {
      console.error(`Scrape failure on ${feed.type}:`, err.message);
    }
  }

  // 3. AI Categorization, Translation, and Gating Phase
  for (const article of scrapedList) {
    try {
      // Avoid parsing duplicates by checking if the source URL already exists in Supabase
      const { data: existingRecord } = await supabase
        .from("current_affairs_capsules")
        .select("id")
        .eq("source_url", article.link)
        .maybeSingle();

      if (existingRecord) {
        continue; // Skip already ingested articles
      }

      // Instruct Gemini to filter, categorize, translate, and assign target student tiers
      const systemInstruction = `
        You are a distinguished faculty member specializing in Indian Banking Exams (RBI Grade B, SBI PO, IBPS, NABARD).
        Your task is to analyze the raw news payload and determine its relevance to banking exam syllabus topics.
        
        Syllabus topics of interest: Monetary Policy updates, Government schemes, Union Ministry allocations, bilateral payments, UPI node expansions, banking regulations, SEBI/RBI regulations.
        
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
      // Request structured output from Gemini using Schema constraints
      const payload = {
        contents: [
          {
            parts: [{ text: `${systemInstruction}\n\nArticle Data:\n${promptPayload}` }],
          },
        ],
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
        console.error(`Gemini evaluation failed with status ${response.status} for: ${article.title}`);
        continue;
      }

      const rawResult = await response.json();
      const rawText = rawResult.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const evaluatedData = JSON.parse(rawText);

      // 4. Persistence Phase
      if (evaluatedData.is_relevant) {
        const originalDateFormatted = article.pubDate 
          ? new Date(article.pubDate).toISOString().split("T")[0] 
          : new Date().toISOString().split("T")[0];

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
        } else {
          processedRecords.push(article.title);
        }
      }
    } catch (err: any) {
      console.error(`Error processing capsule [${article.title}]:`, err.message);
    }
  }

  return NextResponse.json({
    success: true,
    scraped_count: scrapedList.length,
    processed_count: processedRecords.length,
    processed_titles: processedRecords,
  });
}