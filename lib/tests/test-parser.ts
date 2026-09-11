import "server-only";
import * as XLSX from "xlsx";
import { parseCorrectAnswers } from "./answer-validator";

/**
 * Excel parsing + validation. Each workbook is exactly one test. The first
 * sheet is used. Required columns (header row, case-insensitive, trimmed):
 *
 *   Question | Answer 1 | Answer 2 | Answer 3 | Answer 4 |
 *   Correct answer(s) | Explanation
 */

export interface ParsedQuestion {
  /** 1-based question number, matching Excel row order. */
  questionNumber: number;
  question: string;
  answers: string[]; // exactly 4, in Answer 1..4 order
  correctAnswers: number[]; // sorted, 1-4
  explanation: string;
  multipleSelect: boolean;
}

/** Thrown for structural/row problems; message is developer-facing. */
export class ExcelValidationError extends Error {}

const REQUIRED_ANSWER_KEYS = ["answer 1", "answer 2", "answer 3", "answer 4"];

function normalizeHeader(h: string): string {
  return String(h).trim().toLowerCase();
}

function cellToString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

/**
 * Parse a workbook buffer into validated questions.
 * @param fileLabel used in error messages, e.g. "aws-certification.xlsx"
 */
export function parseWorkbook(
  buffer: Buffer,
  fileLabel: string
): ParsedQuestion[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new ExcelValidationError(`${fileLabel} - contains no sheets.`);
  }
  const sheet = wb.Sheets[sheetName];

  // rows as arrays keyed by header text.
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rows.length === 0) {
    throw new ExcelValidationError(`${fileLabel} - contains no question rows.`);
  }

  // Build a case-insensitive header lookup from the first row's keys.
  const headerKeys = Object.keys(rows[0]);
  const headerMap = new Map<string, string>(); // normalized -> original key
  for (const key of headerKeys) {
    headerMap.set(normalizeHeader(key), key);
  }

  function requireHeader(normalized: string, label: string): string {
    const original = headerMap.get(normalized);
    if (!original) {
      throw new ExcelValidationError(
        `${fileLabel} - missing required column "${label}".`
      );
    }
    return original;
  }

  const questionKey = requireHeader("question", "Question");
  const answerKeys = REQUIRED_ANSWER_KEYS.map((k, i) =>
    requireHeader(k, `Answer ${i + 1}`)
  );
  const correctKey = requireHeader("correct answer(s)", "Correct answer(s)");
  const explanationKey = requireHeader("explanation", "Explanation");

  const parsed: ParsedQuestion[] = [];

  rows.forEach((row, index) => {
    const excelRow = index + 2; // +1 header, +1 for 1-based
    const questionNumber = index + 1;

    const question = cellToString(row[questionKey]);
    if (!question) {
      throw new ExcelValidationError(
        `${fileLabel} - Row ${excelRow}: missing Question.`
      );
    }

    const answers = answerKeys.map((k) => cellToString(row[k]));
    answers.forEach((a, i) => {
      if (!a) {
        throw new ExcelValidationError(
          `${fileLabel} - Row ${excelRow}: missing Answer ${i + 1}.`
        );
      }
    });

    let correctAnswers: number[];
    try {
      correctAnswers = parseCorrectAnswers(row[correctKey]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "invalid Correct answer(s)";
      throw new ExcelValidationError(
        `${fileLabel} - Row ${excelRow}: ${msg}`
      );
    }

    const explanation = cellToString(row[explanationKey]);
    if (!explanation) {
      throw new ExcelValidationError(
        `${fileLabel} - Row ${excelRow}: missing Explanation.`
      );
    }

    parsed.push({
      questionNumber,
      question,
      answers,
      correctAnswers,
      explanation,
      multipleSelect: correctAnswers.length > 1,
    });
  });

  return parsed;
}
