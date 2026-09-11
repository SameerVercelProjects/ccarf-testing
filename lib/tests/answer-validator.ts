/**
 * Answer parsing + scoring. Pure functions, no I/O, so they are easy to reason
 * about and reuse on both parse and validate paths.
 */

/**
 * Parse a "Correct answer(s)" cell into a sorted, de-duplicated array of ints
 * in the range 1-4. Accepts common delimiters: comma and semicolon, with or
 * without spaces (e.g. "1,3", "1, 3", "1;3", "1; 3").
 *
 * Throws with a descriptive message on invalid content so Excel validation can
 * report a useful, row-specific error.
 */
export function parseCorrectAnswers(raw: unknown): number[] {
  const text = raw == null ? "" : String(raw).trim();
  if (text.length === 0) {
    throw new Error("missing Correct answer(s)");
  }

  const tokens = text
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (tokens.length === 0) {
    throw new Error("missing Correct answer(s)");
  }

  const values = new Set<number>();
  for (const token of tokens) {
    if (!/^[0-9]+$/.test(token)) {
      throw new Error(`Correct answer contains invalid value "${token}".`);
    }
    const n = Number(token);
    if (n < 1 || n > 4) {
      throw new Error(`Correct answer contains invalid value "${token}".`);
    }
    values.add(n);
  }

  return Array.from(values).sort((a, b) => a - b);
}

/** Normalize any selection array to sorted, unique ints (defensive on input). */
export function normalizeSelection(selected: unknown): number[] {
  if (!Array.isArray(selected)) return [];
  const values = new Set<number>();
  for (const item of selected) {
    const n = typeof item === "number" ? item : Number(item);
    if (Number.isInteger(n) && n >= 1 && n <= 4) {
      values.add(n);
    }
  }
  return Array.from(values).sort((a, b) => a - b);
}

/**
 * A selection is correct only when the set of selected answers exactly equals
 * the set of correct answers. Order does not matter.
 */
export function isSelectionCorrect(
  selected: number[],
  correct: number[]
): boolean {
  if (selected.length !== correct.length) return false;
  const s = normalizeSelection(selected);
  const c = [...correct].sort((a, b) => a - b);
  return s.every((v, i) => v === c[i]);
}
