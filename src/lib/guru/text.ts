// FILE: src/lib/guru/text.ts
// Shared by the chat route and the re-index route.

/** Strips the notes markup ({red}, [NOTE], ==hl==, [img:x], [+] bullets) so models read clean text. */
export const cleanForAI = (raw = "", max = 6000): string =>
  raw
    .replace(/\{\/?[a-z0-9-]+\}/gi, "")
    .replace(/\[\/?[A-Z0-9]+(?::[^\]\n]*)?\]/g, "")
    .replace(/\[img:[^\]]+\]/g, "")
    .replace(/^\s*\[[+>*xX\- ]\]\s+/gm, "- ")
    .replace(/==/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);

/**
 * Splits one topic into ~900 character chunks on paragraph / sentence boundaries.
 * Short topics stay as a single chunk.
 */
export function chunkTopic(raw: string, target = 900): string[] {
  const text = cleanForAI(raw, 60000);
  if (!text) return [];
  if (text.length <= target * 1.3) return [text];

  const pieces: string[] = [];
  for (const para of text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)) {
    if (para.length <= target) { pieces.push(para); continue; }
    let cur = "";
    for (const s of para.split(/(?<=[.!?।])\s+/)) {
      if (cur && (cur + " " + s).length > target) { pieces.push(cur.trim()); cur = s; }
      else cur = (cur + " " + s).trim();
    }
    if (cur) pieces.push(cur.trim());
  }

  const chunks: string[] = [];
  let buf = "";
  for (const p of pieces) {
    if (buf && buf.length + p.length + 2 > target) { chunks.push(buf); buf = p; }
    else buf = buf ? `${buf}\n\n${p}` : p;
  }
  if (buf) chunks.push(buf);

  // fold a tiny last chunk into the one before it
  if (chunks.length > 1 && chunks[chunks.length - 1].length < 150) {
    const last = chunks.pop()!;
    chunks[chunks.length - 1] += `\n\n${last}`;
  }
  return chunks;
}