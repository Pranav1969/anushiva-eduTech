// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
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
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      console.error("❌ CRITICAL: No API key found!");
      return NextResponse.json({ reply: "Configuration error. Please check backend API keys." }, { status: 500 });
    }

    const supabase = (supabaseUrl && supabaseKey) 
      ? createClient(supabaseUrl, supabaseKey) 
      : null;

    // 2. FETCH NOTES FROM DATABASE (RAG Context)
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

    // 3. STUDENT IDENTITY & GENDER INFLFCTION CALCULATOR
    const firstName = student?.firstName || "Student";
    const gender = student?.gender?.toLowerCase() || "unknown";
    
    // Select friendly, non-slang, gender-sensitive address phrases
    let dynamicAddressing = firstName;
    if (gender === "female" || gender === "girl" || gender === "f") {
      dynamicAddressing = `${firstName} beta`;
    } else if (gender === "male" || gender === "boy" || gender === "m") {
      dynamicAddressing = `${firstName}`;
    } else {
      dynamicAddressing = "dear student";
    }

    // 4. DEFINE RIGOROUS GURUJI PERSONA (STRICT REVISIONS)
    const systemInstruction = `
      You are AI-Guruji, an elite, professional, and empathetic academic mentor guiding students for competitive exams.
      
      TONE & ATTITUDE:
      - Maintain a healthy, encouraging, yet respectful and structured mentor relationship.
      - ALWAYS address the student warmly using contextually aligned phrases like "${dynamicAddressing}".
      - STRICTLY PROHIBITED: Never use words like "mere sher", "bhai", "dude", "yaaro", "bro", or trashy casual street slang.
      
      CORE METHODOLOGY:
      - If provided with [STUDY NOTES], use them as your primary truth source to explain core concepts.
      - Keep explanations highly concise and straight to the point. No empty fillers, long introductory scripts, or narrative fluff.
      - NEVER reveal you are looking at notes or database vectors. Rewrite info elegantly.

      QUANTITATIVE & MATHEMATICAL PRECISION CONSTRAINTS:
      - Solutions must be 100% accurate. You must complete calculations down to the final numeric result. Do not break off halfway.
      - Do not merge multiple logical actions into dense paragraphs. Use distinct, line-by-line formatting separated by clear whitespace.
      - Use this layout structure for mathematical or logic-based questions:
        * **Given Data:** List out known variables explicitly.
        * **Formula/Concept:** State the formula, theorem, or logical rule used.
        * **Step-by-Step Execution:** Show clear algebraic or logical iterations line by line.
        * **Final Answer:** Clearly bold or box the complete final numeric/structural conclusion.
    `;

    // 5. PREPARE CONTEXTUAL HISTORY (Fixes chat conversation tracking)
    const cleanedContents: any[] = [];
    if (Array.isArray(chatHistory)) {
      chatHistory.forEach((chatItem) => {
        // Skip automated welcome interface prompts or duplicate instances of the active prompt
        if (chatItem.text.includes("Ready to crack") || chatItem.text.includes("Ready to clear") || chatItem.text.includes("Kaisa hai")) return;
        if (chatItem.role === "user" && chatItem.text === message) return;
        
        const role = chatItem.role === "ai" ? "model" : "user";
        
        // Prevent consecutive duplicate roles which break Gemini's chat schema array layout
        if (cleanedContents.length > 0 && cleanedContents[cleanedContents.length - 1].role === role) {
          // Append contents instead of hard-failing
          cleanedContents[cleanedContents.length - 1].parts[0].text += `\n${chatItem.text}`;
          return;
        }
        
        cleanedContents.push({ role, parts: [{ text: chatItem.text }] });
      });
    }

    // Enforce alternate turn rules (User -> Model -> User) required by Google's client SDK
    while (cleanedContents.length > 0 && cleanedContents[0].role === "model") {
      cleanedContents.shift();
    }
    if (cleanedContents.length > 0 && cleanedContents[cleanedContents.length - 1].role === "user") {
      cleanedContents.pop();
    }

    // 6. CONSTRUCT FINAL PROMPT PACK WITH DATA CONTEXT
    const finalUserMessage = `
---
[CURRENT STUDY TOPIC MODULE]: ${currentSection || "General"}
[STUDY NOTES FOR REFERENCE]: 
${notesData || "No specific custom study text found in database logs."}
---

[STUDENT QUESTION]: "${message}"

[INSTRUCTION]: Provide a complete, fully computed explanation as AI-Guruji adhering to the quantitative layouts requested. Be concise and write a definitive answer.
    `;

    cleanedContents.push({ role: "user", parts: [{ text: finalUserMessage }] });

    // 7. INITIALIZE GOOGLE GEN AI CLIENT ENGINE
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: cleanedContents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, // Dropped to 0.3 to ensure strict factual and mathematical calculation stability
        maxOutputTokens: 2048, // Expanded to prevent response truncation mid-sentence
      },
    });

    const replyText = response.text || "I was unable to complete the calculations. Please write down the details again.";
    
    return NextResponse.json({ 
      reply: replyText,
      source: notesData ? "database" : "gemini" 
    });

  } catch (error: any) {
    console.error("👉 CHAT ROUTE UNDERLYING CRASH:", error);
    return NextResponse.json(
      { reply: "An error occurred while generating the solution. Let's try this calculation once more." },
      { status: 500 }
    );
  }
}