// Best-effort extraction of recipe name + cuisine from a free-form Claude response.
// The system prompt asks the model to return name and cuisine style, but the exact
// formatting varies, so we try several patterns.

const STRIP = /^["'*\s]+|["'*\s]+$/g;
const clean = (s: string): string => s.replace(STRIP, '').replace(/\*+/g, '').trim();

export function extractRecipeMeta(text: string): { name: string; cuisine: string } {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let name = '';
  let cuisine = '';

  for (const line of lines) {
    if (!name) {
      const heading = line.match(/^#{1,4}\s+(.+)/);
      if (heading) {
        name = heading[1];
        continue;
      }
      const bold = line.match(/^\*\*([^*]+)\*\*\s*$/);
      if (bold) {
        name = bold[1];
        continue;
      }
      const labeled = line.match(/^(?:recipe\s+name|name|recipe)\s*:\s*(.+)/i);
      if (labeled) {
        name = labeled[1];
        continue;
      }
    }
    if (!cuisine) {
      const c = line.match(/cuisine(?:\s+style)?\s*:\s*(.+)/i);
      if (c) cuisine = c[1];
    }
    if (name && cuisine) break;
  }

  if (!name && lines.length > 0) name = lines[0];

  return {
    name: clean(name) || 'Untitled recipe',
    cuisine: clean(cuisine) || '—',
  };
}
