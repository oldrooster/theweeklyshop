interface MarkdownProps {
  content: string;
  className?: string;
}

// Renders a small subset of markdown suitable for meal instructions:
// headings, bold, bullet lists, numbered lists, and paragraphs.
export function Markdown({ content, className = "" }: MarkdownProps) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip blank lines between blocks
    if (!trimmed) {
      i++;
      continue;
    }

    // ## Heading 2
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-sm font-semibold mt-4 mb-1 first:mt-0">
          {trimmed.slice(3)}
        </h2>
      );
      i++;
      continue;
    }

    // # Heading 1
    if (trimmed.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-sm font-semibold mt-4 mb-1 first:mt-0">
          {trimmed.slice(2)}
        </h1>
      );
      i++;
      continue;
    }

    // ### Heading 3
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-sm font-medium mt-3 mb-1 first:mt-0">
          {trimmed.slice(4)}
        </h3>
      );
      i++;
      continue;
    }

    // Bullet list — collect consecutive bullet lines
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <ul key={i} className="list-disc pl-4 space-y-0.5 my-1">
          {items.map((item, j) => (
            <li key={j} className="text-sm">{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list — collect consecutive numbered lines
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={i} className="list-decimal pl-4 space-y-0.5 my-1">
          {items.map((item, j) => (
            <li key={j} className="text-sm">{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-sm">
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}

// Render inline markdown: **bold** and *italic*
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[3]}</em>);
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : parts;
}
