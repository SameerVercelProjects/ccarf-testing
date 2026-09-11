import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/auth";
import { validateAnswer } from "@/lib/tests/test-loader";

export const runtime = "nodejs";

/**
 * POST /api/tests/:testId/validate
 * Body: { questionNumber: number, selectedAnswers: number[] }
 * Returns { correct, correctAnswers, explanation }. This is the only endpoint
 * that reveals correct answers/explanations.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { testId } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const questionNumber = Number(body?.questionNumber);
  if (!Number.isInteger(questionNumber) || questionNumber < 1) {
    return NextResponse.json(
      { error: "Invalid question number." },
      { status: 400 }
    );
  }

  const selectedAnswers = body?.selectedAnswers;
  if (
    !Array.isArray(selectedAnswers) ||
    selectedAnswers.length === 0
  ) {
    return NextResponse.json(
      { error: "Select at least one answer." },
      { status: 400 }
    );
  }

  const result = validateAnswer(testId, questionNumber, selectedAnswers);
  if (!result) {
    return NextResponse.json(
      { error: "Question not found." },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
