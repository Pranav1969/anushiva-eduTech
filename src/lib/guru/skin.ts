// FILE: src/lib/guru/skin.ts
// The "personal touch": a warm opener (and sometimes a closer) wrapped around a neutral saved answer,
// so a reused answer never feels like a database lookup. Costs nothing (no model call).
// Also answers plain greetings / thanks without calling Gemini at all.
import type { Lang } from "./retrieve";

export type Situation = "first" | "followup" | "highlight" | "chip";

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");

// {n} = how the student is addressed, {p} = their previous question (short)
const OPENERS: Record<Lang, Record<Situation, string[]>> = {
  en: {
    first: [
      "Good question, {n}! 😊",
      "Nice one, {n} — let's break it down.",
      "Happy to help, {n}! Here's the simple version.",
      "Great that you asked, {n}. Let's take it step by step.",
      "Sure thing, {n}!",
    ],
    followup: [
      "Building on “{p}”, {n} —",
      "Good follow-up, {n}! Let's take that one step further.",
      "Right, {n} — picking up from where we were.",
    ],
    highlight: ["Let's unpack that part, {n}.", "Here's what that bit means, {n}:", "Good catch on that line, {n}!"],
    chip: ["Here you go, {n}!", "Let's do it, {n}!", "Sure, {n} — here it is."],
  },
  hi: {
    first: ["बहुत अच्छा सवाल, {n}! 😊", "चलिए इसे आसान तरीके से समझते हैं, {n}।", "ज़रूर, {n}!"],
    followup: ["“{p}” से आगे बढ़ते हैं, {n} —", "अच्छा फ़ॉलो-अप, {n}! आगे समझते हैं।"],
    highlight: ["इस हिस्से को खोलकर समझते हैं, {n}।", "इस पंक्ति का मतलब यह है, {n}:"],
    chip: ["यह लीजिए, {n}!", "ज़रूर, {n} — देखिए।"],
  },
  mr: {
    first: ["छान प्रश्न, {n}! 😊", "चला, हे सोपं करून समजून घेऊ, {n}.", "नक्कीच, {n}!"],
    followup: ["“{p}” पुढे नेऊया, {n} —", "चांगला पुढचा प्रश्न, {n}! पुढे समजून घेऊ."],
    highlight: ["हा भाग उलगडून पाहू, {n}.", "या ओळीचा अर्थ असा आहे, {n}:"],
    chip: ["हे घ्या, {n}!", "नक्कीच, {n} — पाहा."],
  },
};

const CLOSERS: Record<Lang, string[]> = {
  en: [
    "Does that make sense? Tell me which part still feels fuzzy and I'll make it simpler. 💛",
    "Want to try a quick practice question on this?",
    "If any step feels tricky, just highlight it in your notes and ask me. 🌟",
  ],
  hi: [
    "समझ आया? जो हिस्सा उलझा लगे, बताइए — मैं और आसान कर दूँगा। 💛",
    "क्या इस पर एक छोटा सा अभ्यास प्रश्न करें?",
  ],
  mr: [
    "समजलं का? कोणता भाग अवघड वाटला ते सांगा — मी आणखी सोपं करून सांगतो. 💛",
    "यावर एक छोटा सराव प्रश्न करून पाहायचा का?",
  ],
};

export function applySkin(o: {
  core: string; name: string; lang: Lang; situation: Situation; prevQuestion?: string;
}): string {
  const prev = (o.prevQuestion || "").replace(/\s+/g, " ").trim();
  const usePrev = o.situation === "followup" && prev.length > 0 && prev.length <= 70;
  const pool = OPENERS[o.lang][o.situation].filter((t) => usePrev || !t.includes("{p}"));
  const opener = fill(pick(pool.length ? pool : OPENERS[o.lang].first), { n: o.name, p: prev });
  // closers only on longer answers, and not every time
  const closer = o.core.length > 450 && Math.random() < 0.4 ? `\n\n${pick(CLOSERS[o.lang])}` : "";
  return `${opener}\n\n${o.core.trim()}${closer}`;
}

// ---------- chit-chat that needs no model ----------
const CHAT = {
  greeting: /^(hi+|hii+|hello+|hey+|namaste|namaskar|good (morning|afternoon|evening)|sup)\b[\s!.,😊🙏]*$/i,
  thanks: /^(thanks?( you)?( so much)?|thank u|thx|ty|shukriya|dhanyavad|dhanyawad|धन्यवाद|शुक्रिया|आभार)[\s!.🙏😊]*$/i,
  ok: /^(ok(ay)?|okk+|fine|got it|understood|cool|nice|great|done|samajh gaya|samajh gayi|theek hai|ठीक है|समझ गया|समझ गई)[\s!.👍🙏😊]*$/i,
  bye: /^(bye|goodbye|see you|tc|good night)[\s!.]*$/i,
};

const CHAT_REPLIES: Record<Lang, Record<keyof typeof CHAT, string[]>> = {
  en: {
    greeting: ["Hello, {n}! 🌟 What shall we work on today? Ask me anything or highlight a line in your notes.", "Hi {n}! 😊 Ready when you are — what's on your mind?"],
    thanks: ["Always happy to help, {n}! 💛 Ask me whenever something feels tricky.", "You're welcome, {n}! Keep going — you're doing great. 🌟"],
    ok: ["Wonderful, {n}! 👍 Shout if anything feels unclear.", "Great, {n}! Whenever you're ready, we can go on."],
    bye: ["Take care, {n}! 🙏 Come back anytime — I'll be here.", "See you soon, {n}! Keep revising. 🌟"],
  },
  hi: {
    greeting: ["नमस्ते, {n}! 🌟 आज क्या पढ़ें? कुछ भी पूछिए या नोट्स की कोई पंक्ति चुनिए।", "हैलो {n}! 😊 बताइए, क्या पूछना है?"],
    thanks: ["हमेशा खुशी से, {n}! 💛 कुछ भी कठिन लगे तो पूछिए।", "कोई बात नहीं, {n}! लगे रहिए — आप बहुत अच्छा कर रहे हैं। 🌟"],
    ok: ["बहुत बढ़िया, {n}! 👍 कुछ अस्पष्ट लगे तो बताइए।", "ठीक है, {n}! जब चाहें आगे बढ़ते हैं।"],
    bye: ["ध्यान रखिए, {n}! 🙏 जब चाहें लौट आइए।", "फिर मिलते हैं, {n}! पढ़ाई जारी रखिए। 🌟"],
  },
  mr: {
    greeting: ["नमस्कार, {n}! 🌟 आज काय शिकूया? काहीही विचारा किंवा नोट्समधली एखादी ओळ निवडा.", "हॅलो {n}! 😊 सांगा, काय विचारायचं आहे?"],
    thanks: ["नेहमी आनंदाने, {n}! 💛 काही अवघड वाटलं तर विचारा.", "काही हरकत नाही, {n}! असेच चालू ठेवा — छान चाललंय. 🌟"],
    ok: ["छान, {n}! 👍 काही अस्पष्ट वाटलं तर सांगा.", "ठीक आहे, {n}! तयार असाल तेव्हा पुढे जाऊ."],
    bye: ["काळजी घ्या, {n}! 🙏 केव्हाही परत या.", "लवकरच भेटू, {n}! अभ्यास सुरू ठेवा. 🌟"],
  },
};

/** returns a ready reply for pure greetings / thanks / ok / bye, or null when a real answer is needed */
export function chitchatReply(message: string, name: string, lang: Lang): string | null {
  const m = message.trim();
  for (const key of Object.keys(CHAT) as (keyof typeof CHAT)[]) {
    if (CHAT[key].test(m)) return fill(pick(CHAT_REPLIES[lang][key]), { n: name });
  }
  return null;
}