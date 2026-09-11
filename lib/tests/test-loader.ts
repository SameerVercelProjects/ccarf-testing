import "server-only";
import fs from "node:fs";
import path from "node:path";
import { parseWorkbook, type ParsedQuestion } from "./test-parser";
import { isSelectionCorrect, normalizeSelection } from "./answer-validator";

/**
 * Server-side test loader. Discovers .xlsx files in /data, parses them, and
 * exposes safe accessors. Correct answers/explanations are only exposed via
 * validateAnswer — never via the public question shape.
 *
 * Parsed workbooks are cached in memory as a performance optimization. Vercel
 * serverless instances are ephemeral, so correctness never relies on the cache
 * surviving between requests.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const TESTS_MAP_PATH = path.join(process.cwd(), "config", "tests.json");

// Common acronyms to upper-case when generating display names.
const ACRONYMS = new Set([
  "aws",
  "api",
  "ai",
  "ml",
  "oci",
  "oic",
  "sql",
  "gcp",
  "az",
  "id",
  "ui",
  "ux",
  "it",
]);

export interface TestSummary {
  id: string;
  name: string;
  questionCount: number;
}

/** The shape sent to the browser BEFORE an answer is submitted. */
export interface PublicQuestion {
  testId: string;
  questionNumber: number;
  totalQuestions: number;
  question: string;
  answers: string[];
  multipleSelect: boolean;
}

export interface ValidationResult {
  correct: boolean;
  correctAnswers: number[];
  explanation: string;
}

interface CacheEntry {
  mtimeMs: number;
  questions: ParsedQuestion[];
}

const workbookCache = new Map<string, CacheEntry>();

// Cached filename->title map from config/tests.json (mtime-keyed).
let testsMapCache: { mtimeMs: number; map: Record<string, string> } | null =
  null;

/** Test IDs are the filename without .xlsx; must be simple slugs. */
function isValidTestId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/** Convert "aws-solutions-architect" -> "AWS Solutions Architect". */
export function displayNameFromId(id: string): string {
  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/**
 * Load the optional config/tests.json mapping. Shape is a JSON object of
 * { "<file>.xlsx": "Title" } (an id without .xlsx is also accepted as a key).
 * Missing or malformed file falls back to {} so titles derive from filenames.
 */
function loadTestsMap(): Record<string, string> {
  try {
    const stat = fs.statSync(TESTS_MAP_PATH);
    if (testsMapCache && testsMapCache.mtimeMs === stat.mtimeMs) {
      return testsMapCache.map;
    }
    const parsed = JSON.parse(fs.readFileSync(TESTS_MAP_PATH, "utf8"));
    const map: Record<string, string> = {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string" && value.trim().length > 0) {
          map[key] = value.trim();
        }
      }
    }
    testsMapCache = { mtimeMs: stat.mtimeMs, map };
    return map;
  } catch {
    return {};
  }
}

/**
 * Resolve a test's display title. config/tests.json takes precedence (keyed by
 * filename, or by bare id); otherwise the title is derived from the id.
 */
function resolveTestName(id: string): string {
  const map = loadTestsMap();
  return map[`${id}.xlsx`] ?? map[id] ?? displayNameFromId(id);
}

function listTestFiles(): string[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(DATA_DIR);
  } catch {
    return [];
  }
  return entries
    .filter((f) => f.toLowerCase().endsWith(".xlsx"))
    .filter((f) => !f.startsWith("~$")) // ignore Excel lock files
    .filter((f) => isValidTestId(f.slice(0, -".xlsx".length)));
}

/**
 * Resolve a browser-supplied testId to a real file path, guarding against
 * path traversal. Returns null if the id is not a known, discovered test.
 */
function resolveTestFile(testId: string): string | null {
  if (!isValidTestId(testId)) return null;
  const fileName = `${testId}.xlsx`;
  const known = listTestFiles();
  if (!known.includes(fileName)) return null;

  const filePath = path.join(DATA_DIR, fileName);
  // Extra defense: ensure the resolved path stays within DATA_DIR.
  const resolved = path.resolve(filePath);
  if (resolved !== path.join(path.resolve(DATA_DIR), fileName)) {
    return null;
  }
  return resolved;
}

/** Parse (with cache) the questions for a validated file path. */
function loadQuestions(testId: string, filePath: string): ParsedQuestion[] {
  const stat = fs.statSync(filePath);
  const cached = workbookCache.get(testId);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.questions;
  }
  const buffer = fs.readFileSync(filePath);
  const questions = parseWorkbook(buffer, `${testId}.xlsx`);
  workbookCache.set(testId, { mtimeMs: stat.mtimeMs, questions });
  return questions;
}

/** Discover all tests in /data, parsing each to count questions. */
export function getAvailableTests(): TestSummary[] {
  const files = listTestFiles();
  const summaries: TestSummary[] = [];

  for (const file of files) {
    const id = file.slice(0, -".xlsx".length);
    const filePath = path.join(DATA_DIR, file);
    try {
      const questions = loadQuestions(id, filePath);
      summaries.push({
        id,
        name: resolveTestName(id),
        questionCount: questions.length,
      });
    } catch (err) {
      // Log server-side for developers; skip the malformed file in the list.
      console.error(
        `[test-loader] Skipping "${file}": ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  // Order to match config/tests.json (by its key order). Tests not listed in
  // the map fall to the end, alphabetically by name.
  const mapKeys = Object.keys(loadTestsMap());
  const orderIndex = (id: string): number => {
    let i = mapKeys.indexOf(`${id}.xlsx`);
    if (i === -1) i = mapKeys.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  return summaries.sort((a, b) => {
    const diff = orderIndex(a.id) - orderIndex(b.id);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });
}

export function getTestMetadata(testId: string): TestSummary | null {
  const filePath = resolveTestFile(testId);
  if (!filePath) return null;
  try {
    const questions = loadQuestions(testId, filePath);
    return {
      id: testId,
      name: resolveTestName(testId),
      questionCount: questions.length,
    };
  } catch {
    return null;
  }
}

/** Public (answer-free) question for the browser. Null if not found. */
export function getQuestion(
  testId: string,
  questionNumber: number
): PublicQuestion | null {
  const filePath = resolveTestFile(testId);
  if (!filePath) return null;

  let questions: ParsedQuestion[];
  try {
    questions = loadQuestions(testId, filePath);
  } catch {
    return null;
  }

  const q = questions[questionNumber - 1];
  if (!q) return null;

  return {
    testId,
    questionNumber: q.questionNumber,
    totalQuestions: questions.length,
    question: q.question,
    answers: q.answers,
    multipleSelect: q.multipleSelect,
    // NOTE: correctAnswers and explanation are intentionally omitted here.
  };
}

/**
 * Validate a submitted selection server-side. Only here do we reveal the
 * correct answers and explanation.
 */
export function validateAnswer(
  testId: string,
  questionNumber: number,
  selectedAnswers: unknown
): ValidationResult | null {
  const filePath = resolveTestFile(testId);
  if (!filePath) return null;

  let questions: ParsedQuestion[];
  try {
    questions = loadQuestions(testId, filePath);
  } catch {
    return null;
  }

  const q = questions[questionNumber - 1];
  if (!q) return null;

  const selection = normalizeSelection(selectedAnswers);
  return {
    correct: isSelectionCorrect(selection, q.correctAnswers),
    correctAnswers: q.correctAnswers,
    explanation: q.explanation,
  };
}
