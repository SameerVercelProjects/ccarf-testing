/**
 * Client-side attempt state. Lives only in sessionStorage (never localStorage,
 * never the server). Holds enough to support navigation and refresh restore.
 */

export interface QuestionState {
  /** Answer numbers currently selected (before or after submit). */
  selected: number[];
  submitted: boolean;
  correct: boolean | null;
  /** Populated after submit. */
  correctAnswers: number[] | null;
  explanation: string | null;
}

export interface TestAttempt {
  testId: string;
  testName: string;
  totalQuestions: number;
  multipleSelect: boolean[]; // per-question, so we can render before fetch
  currentQuestion: number; // 1-based
  questions: QuestionState[]; // index 0 = question 1
  startedAt: number;
}

function storageKey(testId: string): string {
  return `cp_attempt:${testId}`;
}

function emptyQuestionState(): QuestionState {
  return {
    selected: [],
    submitted: false,
    correct: null,
    correctAnswers: null,
    explanation: null,
  };
}

export function createAttempt(
  testId: string,
  testName: string,
  totalQuestions: number
): TestAttempt {
  return {
    testId,
    testName,
    totalQuestions,
    multipleSelect: Array(totalQuestions).fill(false),
    currentQuestion: 1,
    questions: Array.from({ length: totalQuestions }, emptyQuestionState),
    startedAt: Date.now(),
  };
}

export function loadAttempt(testId: string): TestAttempt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(testId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TestAttempt;
    if (parsed?.testId !== testId || !Array.isArray(parsed.questions)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveAttempt(attempt: TestAttempt): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(attempt.testId), JSON.stringify(attempt));
  } catch {
    // sessionStorage may be unavailable/full; navigation still works in-memory.
  }
}

export function clearAttempt(testId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(testId));
  } catch {
    /* ignore */
  }
}

/** Remove every attempt (used on logout). */
export function clearAllAttempts(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("cp_attempt:")) keys.push(key);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function countCorrect(attempt: TestAttempt): number {
  return attempt.questions.filter((q) => q.correct === true).length;
}

export function allSubmitted(attempt: TestAttempt): boolean {
  return attempt.questions.every((q) => q.submitted);
}
