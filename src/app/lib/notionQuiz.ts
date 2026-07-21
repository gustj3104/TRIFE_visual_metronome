export interface QuizQuestion {
  id: string;
  question: string;
  explanation: string;
  correct: 0 | 1;
  audience: "전체" | "신규" | "기존";
}

export const QUIZ_OPTIONS = ["그렇다", "아니다"] as const;

function isQuizQuestion(value: unknown): value is QuizQuestion {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.question === "string" &&
    v.question.trim() !== "" &&
    typeof v.explanation === "string" &&
    (v.correct === 0 || v.correct === 1) &&
    (v.audience === "전체" || v.audience === "신규" || v.audience === "기존")
  );
}

/**
 * Loads quiz questions from the Notion "퀴즈 DB" via the Cloudflare Worker proxy.
 * Returns null (rather than throwing) when the proxy isn't configured or the
 * request fails, so callers can fall back to a bundled default quiz.
 */
export async function fetchQuizQuestions(): Promise<QuizQuestion[] | null> {
  const base = import.meta.env.VITE_NOTION_PROXY_URL;
  if (!base) return null;

  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/quiz`);
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!Array.isArray(data)) return null;
    const questions = data.filter(isQuizQuestion);
    return questions.length > 0 ? questions : null;
  } catch {
    return null;
  }
}
