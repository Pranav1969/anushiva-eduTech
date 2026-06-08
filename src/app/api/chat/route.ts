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
      return NextResponse.json({ reply: "Configuration error, yaar. Check API keys." }, { status: 500 });
    }

    const supabase = (supabaseUrl && supabaseKey) 
      ? createClient(supabaseUrl, supabaseKey) 
      : null;

    // 2. FETCH NOTES FROM DATABASE
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

    // 3. INITIALIZE AI
    const ai = new GoogleGenAI({ apiKey });
    const studentName = student?.firstName || "yaar";

    // 4. DEFINE GURUJI PERSONA
    const systemInstruction = `
      You are AI-Guruji, an engaging Indian coaching institute teacher.
      - TONE: Encouraging, witty, use words like "yaar", "chalo", "bilkul", "simple hai", "mere sher".
      - METHOD: If you are provided with [STUDY NOTES], use them as the primary source to explain concepts. 
      - FORMAT: Keep answers structured with bold headings, bullet points, and clear explanations.
      - CONSTRAINTS: 
        1. NEVER reveal you are looking at notes. 
        2. DO NOT copy-paste text. Rewrite it in your own conversational, friendly voice.
        3. If no notes are provided, answer from your own vast knowledge base.
    `;

    // 5. PREPARE HISTORY
    const cleanedContents: any[] = [];
    if (Array.isArray(chatHistory)) {
      chatHistory.forEach((chatItem) => {
        if (chatItem.text.includes("Ready to crack") || chatItem.text.includes("Kaisa hai")) return;
        if (chatItem.role === "user" && chatItem.text === message) return;
        
        const role = chatItem.role === "ai" ? "model" : "user";
        if (cleanedContents.length > 0 && cleanedContents[cleanedContents.length - 1].role === role) return;
        
        cleanedContents.push({ role, parts: [{ text: chatItem.text }] });
      });
    }

    // Ensure sequence logic
    while (cleanedContents.length > 0 && cleanedContents[0].role === "model") cleanedContents.shift();
    if (cleanedContents.length > 0 && cleanedContents[cleanedContents.length - 1].role === "user") cleanedContents.pop();

    // 6. CONSTRUCT FINAL PROMPT WITH CONTEXT
    const finalUserMessage = `
      ---
      [STUDY NOTES FOR REFERENCE]: 
      ${notesData || "No specific study material found in the database."}
      ---
      
      [STUDENT QUESTION]: "${message}"
      
      [INSTRUCTION]: Explain this concept clearly as AI-Guruji. Use the study notes above if they are relevant to the question.
    `;

    cleanedContents.push({ role: "user", parts: [{ text: finalUserMessage }] });

    // 7. GENERATE CONTENT
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: cleanedContents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7, // Lower temperature keeps it focused on your notes
        maxOutputTokens: 1000,
      },
    });

    const replyText = response.text || "Arre yaar, mind blank ho gaya. Ek baar firse poocho?";
    
    return NextResponse.json({ 
      reply: replyText,
      source: notesData ? "database" : "gemini" 
    });

  } catch (error: any) {
    console.error("👉 REAL UNDERLYING ERROR:", error);
    return NextResponse.json(
      { reply: "Arre yaar! Server circuit short-circuit ho gaya mechanical breakdown se! Let's try again." },
      { status: 500 }
    );
  }
}