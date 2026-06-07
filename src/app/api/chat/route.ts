import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { message, currentSection, student, chatHistory } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Resolve API key safely across multiple possible environment variable handles
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      console.error("❌ CRITICAL: No API key found in process.env!");
      return NextResponse.json(
        { reply: "Oye Pranav, seems like my API Key is missing in the backend setup! Check your .env file, yaar." },
        { status: 500 }
      );
    }

    // Initialize the SDK directly inside the call block to prevent stale instances
    const ai = new GoogleGenAI({ apiKey });

    const studentName = student?.firstName || "yaar";
    
    const systemInstruction = `
      You are AI-Guruji, a popular, approachable, and highly engaging Indian coaching institute teacher. You are a trusted mentor who makes tough concepts simple and fun.
      
      The student you are teaching right now is ${studentName}, and you are helping them study: "${currentSection || "General Syllabus"}".

      Your Tone & Style Guidelines:
      - Speak like an encouraging elder brother or an awesome mentor. Use relatable, encouraging phrasing.
      - Feel free to use light, witty banter, funny analogies, and classic Indian student observations.
      - Keep it primarily English, but you can throw in common, light conversational Indian-English phrases naturally (like "yaar", "chalo", "bilkul", "simple hai").
      - Keep things highly readable using bold text, bullet points, and code blocks.
    `;

    // Re-building the entire history from scratch to completely isolate structural validation errors
    const cleanedContents: any[] = [];

    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach((chatItem) => {
        // Discard the initial greeting message string if it leaks into history
        if (chatItem.text.includes("Ready to crack") || chatItem.text.includes("Kaisa hai")) {
          return;
        }

        // Prevent duplicate user entries matching the active payload message string
        if (chatItem.role === "user" && chatItem.text === message) {
          return;
        }

        const role = chatItem.role === "ai" ? "model" : "user";
        
        // Enforce sequence logic rule: Don't allow two consecutive roles of the exact same type
        if (cleanedContents.length > 0 && cleanedContents[cleanedContents.length - 1].role === role) {
          return;
        }

        cleanedContents.push({
          role: role,
          parts: [{ text: chatItem.text }]
        });
      });
    }

    // Ensure our history timeline actually starts with a user turn
    while (cleanedContents.length > 0 && cleanedContents[0].role === "model") {
      cleanedContents.shift();
    }

    // If the last entry in the history structure is somehow a user message, drop it 
    // so we can put our active message safely at the end
    if (cleanedContents.length > 0 && cleanedContents[cleanedContents.length - 1].role === "user") {
      cleanedContents.pop();
    }

    // Push the active incoming user query
    cleanedContents.push({
      role: "user",
      parts: [{ text: message }]
    });

    // Fire the generation call safely
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: cleanedContents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.85,
        maxOutputTokens: 1000,
      },
    });

    const replyText = response.text || "Arre yaar, mind blank ho gaya. Ek baar firse poocho?";
    return NextResponse.json({ reply: replyText });

  } catch (error: any) {
    // THIS LOG IS CRUCIAL: Look at your terminal screen to see exactly what printed here!
    console.error("👉 REAL UNDERLYING ERROR:", error);

    return NextResponse.json(
      { reply: "Arre yaar! Server circuit short-circuit ho gaya mechanical breakdown se! Let's try again." },
      { status: 500 }
    );
  }
}