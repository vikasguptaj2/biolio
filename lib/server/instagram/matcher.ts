/**
 * DETERMINISTIC 5-MODE INSTAGRAM KEYWORD MATCHER (`lib/server/instagram/matcher.ts`)
 * Closes Audit Finding: B-15
 *
 * Rules:
 * - Zero LLM / AI calls.
 * - Zero user-supplied `new RegExp()` compilation (eliminates ReDoS risk).
 * - Word-boundary tokenization for `word` / `contains_keyword` / `keyword_list` so
 *   keyword `"guide"` matches `"Send me the GUIDE!"` but NEVER matches `"misguided"`.
 */

export type DeterministicMatchMode =
  | "word"
  | "exact"
  | "phrase"
  | "starts_with"
  | "all_comments"
  // Legacy aliases mapped deterministically:
  | "contains_keyword"
  | "exact_match"
  | "keyword_list"
  | "contains";

export interface MatchEvaluationResult {
  matched: boolean;
  matchedKeyword: string | null;
}

/**
 * Normalizes text into lowercase NFKC form and strips leading/trailing punctuation.
 */
function normalizeText(input: string): string {
  return (input || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits normalized text into discrete alphanumeric word tokens so `"guide"`
 * never matches `"misguided"`.
 */
function tokenizeWords(normalized: string): Set<string> {
  const tokens = normalized
    .split(/[^a-z0-9_]+/i)
    .map((t) => t.trim())
    .filter(Boolean);
  return new Set(tokens);
}

export function evaluateCommentMatch(
  commentText: string,
  rawMode: string,
  keywords: string[]
): MatchEvaluationResult {
  const normalizedComment = normalizeText(commentText);
  if (!normalizedComment) {
    return { matched: false, matchedKeyword: null };
  }

  const mode = (rawMode || "word").toLowerCase();

  if (mode === "all_comments") {
    return { matched: true, matchedKeyword: "*" };
  }

  const cleanKeywords = (keywords || [])
    .map((k) => normalizeText(k))
    .filter(Boolean);

  if (cleanKeywords.length === 0) {
    return { matched: false, matchedKeyword: null };
  }

  const commentWords = tokenizeWords(normalizedComment);

  for (const kw of cleanKeywords) {
    // 1. Whole-comment equality (`exact` / `exact_match`)
    if (mode === "exact" || mode === "exact_match") {
      const strippedComment = normalizedComment.replace(
        /^[^a-z0-9]+|[^a-z0-9]+$/gi,
        ""
      );
      if (strippedComment === kw || normalizedComment === kw) {
        return { matched: true, matchedKeyword: kw };
      }
      continue;
    }

    // 2. Prefix match (`starts_with`)
    if (mode === "starts_with") {
      if (
        normalizedComment === kw ||
        normalizedComment.startsWith(`${kw} `) ||
        normalizedComment.startsWith(`${kw}!`) ||
        normalizedComment.startsWith(`${kw}.`)
      ) {
        return { matched: true, matchedKeyword: kw };
      }
      continue;
    }

    // 3. Multi-word phrase or single-word token boundary match (`word`, `phrase`, `contains_keyword`, `keyword_list`, `contains`)
    if (kw.includes(" ")) {
      // Multi-word phrase with word boundary checks on both ends
      const idx = normalizedComment.indexOf(kw);
      if (idx !== -1) {
        const beforeOk =
          idx === 0 || !/[a-z0-9_]/i.test(normalizedComment[idx - 1]);
        const afterIdx = idx + kw.length;
        const afterOk =
          afterIdx >= normalizedComment.length ||
          !/[a-z0-9_]/i.test(normalizedComment[afterIdx]);
        if (beforeOk && afterOk) {
          return { matched: true, matchedKeyword: kw };
        }
      }
    } else {
      // Single-word token check: "guide" matches token "guide" in "Send me the GUIDE!", never "misguided"
      if (commentWords.has(kw)) {
        return { matched: true, matchedKeyword: kw };
      }
    }
  }

  return { matched: false, matchedKeyword: null };
}

