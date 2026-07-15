// FILE: src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { message, currentSection, student, chatHistory } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 1. SAFE INITIALIZATION
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const axonUrl = process.env.AXON_URL;
    const axonApiKey = process.env.AXON_API_KEY;

    if (!axonUrl || !axonApiKey) {
      console.error("❌ CRITICAL: AXON_URL or AXON_API_KEY not set!");
      return NextResponse.json({ reply: "Configuration error. Please check backend API keys." }, { status: 500 });
    }

    const supabase = (supabaseUrl && supabaseKey)
      ? createClient(supabaseUrl, supabaseKey)
      : null;

    // 2. FETCH NOTES FROM DATABASE (RAG Context) - unchanged
    let notesData = "";
    if (supabase) {
      const { data, error } = await supabase
        .from('notes_topics')
        .select('paragraph_text')
        .textSearch('fts_vector', message, { type: 'websearch', config: 'english' })
        .limit(2);

      if (error) {
        console.error("❌ Supabase Search Error:", error);
      } else if (data && data.length > 0) {
        notesData = data.map(n => n.paragraph_text).join('\n\n');
        console.log("✅ Notes found in DB for query:", message);
      } else {
        console.log("⚠️ No notes found in DB for query:", message);
      }
    }

    // 3. STUDENT IDENTITY & GENDER INFLECTION CALCULATOR - unchanged
    const firstName = student?.firstName || "Student";
    const gender = student?.gender?.toLowerCase() || "unknown";

    let dynamicAddressing = firstName;
    if (gender === "female" || gender === "girl" || gender === "f") {
      dynamicAddressing = `${firstName} beta`;
    } else if (gender === "male" || gender === "boy" || gender === "m") {
      dynamicAddressing = `${firstName}`;
    } else {
      dynamicAddressing = "dear student";
    }

    // 4. SERIALIZE CHAT HISTORY AS A PLAIN TRANSCRIPT
    // Axon Core's /v1/chat takes one flat message string (no native
    // multi-turn array like Gemini's `contents`), so we fold prior turns
    // into the message itself instead of a separate structured array.
    let historyBlock = "";
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      const filteredHistory = chatHistory.filter((chatItem) => {
        if (chatItem.text.includes("Ready to crack") || chatItem.text.includes("Ready to clear") || chatItem.text.includes("Kaisa hai")) return false;
        if (chatItem.role === "user" && chatItem.text === message) return false; // drop duplicate of current question
        return true;
      });

      if (filteredHistory.length > 0) {
        historyBlock = filteredHistory
          .map((chatItem) => `${chatItem.role === "ai" ? "Guruji" : "Student"}: ${chatItem.text}`)
          .join("\n");
      }
    }

    // 5. CONSTRUCT THE FULL MESSAGE SENT TO AXON CORE
    // The static tone/formatting/methodology rules (previously Gemini's
    // systemInstruction) now live in the persona's "System instructions"
    // field in the Axon Dashboard - configure that ONCE there, matching
    // the AI-Guruji rules you already had. Everything that's dynamic
    // PER REQUEST (student's name/gender, subject, notes, history) gets
    // folded into this message instead, since Axon personas have one
    // fixed system prompt, not a per-request one.
    const fullMessage = `
[ADDRESS THE STUDENT AS]: "${dynamicAddressing}"

[CURRENT STUDY TOPIC MODULE]: ${currentSection || "General"}

[STUDY NOTES FOR REFERENCE]:
${notesData || "No specific custom study text found in database logs."}

${historyBlock ? `[CONVERSATION SO FAR]:\n${historyBlock}\n` : ""}
[STUDENT QUESTION]: "${message}"

[INSTRUCTION]: Provide a complete, fully computed explanation as AI-Guruji adhering to the quantitative layouts requested. Be concise and write a definitive answer.
    `.trim();

    // 6. CALL AXON CORE (through the tunnel) INSTEAD OF GEMINI DIRECTLY
    const axonRes = await fetch(`${axonUrl}/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${axonApiKey}`
      },
      body: JSON.stringify({ message: fullMessage })
    });

    if (!axonRes.ok) {
      const err = await axonRes.json().catch(() => ({}));
      console.error("❌ Axon Core error:", err);
      return NextResponse.json(
        { reply: "An error occurred while generating the solution. Let's try this calculation once more." },
        { status: 502 }
      );
    }

    const axonData = await axonRes.json();
    const replyText = axonData.reply || "I was unable to complete the calculations. Please write down the details again.";

    return NextResponse.json({
      reply: replyText,
      source: notesData ? "database" : "axon",
      model_used: axonData.model_used // e.g. "local:qwen2-math:1.5b" or "gemini" - handy for your own debugging/logs
    });

  } catch (error: any) {
    console.error("👉 CHAT ROUTE UNDERLYING CRASH:", error);
    return NextResponse.json(
      { reply: "An error occurred while generating the solution. Let's try this calculation once more." },
      { status: 500 }
    );
  }
}