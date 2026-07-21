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
  if (!base) {
    console.warn(
      "[notionQuiz] VITE_NOTION_PROXY_URL이 설정되지 않아 기본 문항으로 대체합니다. " +
        "프로젝트 루트의 .env 파일에 값을 채우고 dev 서버를 재시작하세요.",
    );
    return null;
  }

  const url = `${base.replace(/\/$/, "")}/quiz`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[notionQuiz] Worker가 오류를 반환함 (${response.status} ${response.statusText})`,
        detail,
      );
      return null;
    }
    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
      console.error("[notionQuiz] 예상치 못한 응답 형식", data);
      return null;
    }
    const questions = data.filter(isQuizQuestion);
    if (questions.length === 0) {
      console.warn(
        "[notionQuiz] 유효한 퀴즈 문항이 없어 기본 문항으로 대체합니다. " +
          "Notion '퀴즈 DB'에서 '노출 여부' 체크박스와 '질문'/'정답' 값이 채워져 있는지 확인하세요.",
      );
      return null;
    }
    return questions;
  } catch (err) {
    console.error(`[notionQuiz] ${url} 요청 중 네트워크 오류`, err);
    return null;
  }
}
