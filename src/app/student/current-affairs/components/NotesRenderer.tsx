// src/app/student/current-affairs/components/NotesRenderer.tsx
//
// The digest prompt instructs Gemini to write notes as light Markdown:
// "## Pillar Name" for section headers, "- " for bullets, "**term**" for
// inline bold. The drawer used to dump this straight into a <p> with
// whitespace-pre-line, which is why raw "**" and "##" characters were
// showing up on screen (see the screenshot that flagged this). This parses
// exactly that shape into styled JSX. It's deliberately narrow -- not a full
// Markdown engine -- and falls back to plain paragraph text for any line
// that isn't a recognized header or bullet, so an off-format response from
// Gemini degrades gracefully instead of mis-rendering as a heading.

function renderInlineBold(text: string, keyPrefix: string) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return segments.map((segment, i) => {
    if (segment.startsWith("**") && segment.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-[#1B2430]">
          {segment.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-${i}`}>{segment}</span>;
  });
}

interface NotesRendererProps {
  text: string;
}

export default function NotesRenderer({ text }: NotesRendererProps) {
  const lines = text.split("\n").map((l) => l.trim());

  const blocks: React.ReactNode[] = [];
  let currentList: string[] = [];

  const flushList = (key: string) => {
    if (currentList.length === 0) return;
    blocks.push(
      <ul key={key} className="ml-1 list-disc space-y-1.5 pl-4 marker:text-[#1F5F4A]/60">
        {currentList.map((item, i) => (
          <li key={`${key}-item-${i}`} className="text-sm leading-relaxed text-[#374151]">
            {renderInlineBold(item, `${key}-item-${i}`)}
          </li>
        ))}
      </ul>
    );
    currentList = [];
  };

  lines.forEach((line, idx) => {
    if (!line) return; // blank lines are just paragraph breaks, not content

    if (line.startsWith("- ") || line.startsWith("* ")) {
      currentList.push(line.slice(2).trim());
      return;
    }

    flushList(`list-${idx}`);

    if (line.startsWith("## ")) {
      blocks.push(
        <h4
          key={`heading-${idx}`}
          className="mt-4 font-serif text-sm font-bold uppercase tracking-wide text-[#1F5F4A] first:mt-0"
        >
          {renderInlineBold(line.slice(3).trim(), `heading-${idx}`)}
        </h4>
      );
      return;
    }

    // Anything else -- including any off-format response -- is plain prose,
    // never mis-rendered as a heading.
    blocks.push(
      <p key={`para-${idx}`} className="text-sm leading-relaxed text-[#374151]">
        {renderInlineBold(line, `para-${idx}`)}
      </p>
    );
  });

  flushList("list-end");

  return <div className="space-y-2">{blocks}</div>;
}