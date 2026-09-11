import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/auth";
import { getQuestion } from "@/lib/tests/test-loader";

export const runtime = "nodejs";

/**
 * GET /api/tests/:testId/question?n=1
 * Returns the answer-free question shape. Requires a valid session
 * (middleware also enforces this; we re-check for defense in depth).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { testId } = await params;
  const { searchParams } = new URL(req.url);
  const questionNumber = Number(searchParams.get("n"));

  if (!Number.isInteger(questionNumber) || questionNumber < 1) {
    return NextResponse.json(
      { error: "Invalid question number." },
      { status: 400 }
    );
  }

  const question = getQuestion(testId, questionNumber);
  if (!question) {
    return NextResponse.json(
      { error: "Question not found." },
      { status: 404 }
    );
  }

  return NextResponse.json(question);
}
