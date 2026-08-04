/** Suggest structured personal-detail tags from free-text notes (spec §14).
 *  The original note is always preserved; these are additive suggestions the
 *  user approves or rejects during import. */

const RULES: { pattern: RegExp; category: string; detail: (m: string) => string }[] = [
  { pattern: /\bgolf(er|ing)?\b/i, category: "golf", detail: () => "Golf interest" },
  { pattern: /\bBYU\b/i, category: "sports", detail: () => "BYU sports interest" },
  { pattern: /\b(utes|university of utah)\b/i, category: "sports", detail: () => "Utah Utes interest" },
  { pattern: /\b(jazz)\b/i, category: "sports", detail: () => "Utah Jazz interest" },
  { pattern: /\b(aggies|USU|utah state)\b/i, category: "sports", detail: () => "Utah State interest" },
  { pattern: /\b(hunt(s|ing|er)?|fish(es|ing)?)\b/i, category: "long_term_interest", detail: () => "Outdoors — hunting/fishing" },
  { pattern: /\bski(s|ing|er)?\b/i, category: "long_term_interest", detail: () => "Skiing interest" },
  { pattern: /\b(kids?|family|married|wife|husband|daughter|son)\b/i, category: "family", detail: () => "Family mentioned in notes" },
  { pattern: /\b(lunch|restaurant|foodie)\b/i, category: "restaurant", detail: () => "Restaurant / lunch preference in notes" },
  { pattern: /\b(chamber|rotary|nonprofit|community)\b/i, category: "community", detail: () => "Community involvement" },
];

export interface TagSuggestion {
  category: string;
  detail: string;
}

export function suggestTags(notes: string): TagSuggestion[] {
  if (!notes?.trim()) return [];
  const out: TagSuggestion[] = [];
  const seen = new Set<string>();
  for (const rule of RULES) {
    const m = notes.match(rule.pattern);
    if (m) {
      const detail = rule.detail(m[0]);
      const key = `${rule.category}:${detail}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ category: rule.category, detail });
      }
    }
  }
  return out;
}
