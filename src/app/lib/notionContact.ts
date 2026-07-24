export type ContactCategory = "활동 제안" | "문의" | "협업 제안";

export interface ContactSubmission {
  category: ContactCategory;
  name: string;
  contact: string;
  title: string;
  body: string;
}

export class ContactSubmitError extends Error {}

/**
 * Sends a "TRIFE와 연결하기" submission (활동 제안 / 문의 / 협업 제안) to the
 * Notion proxy worker's /contact route, which records it in the "TRIFE
 * 인바운드" Notion database. Shares VITE_NOTION_PROXY_URL with the other
 * /trife ↔ Notion integrations (application, quiz, activities).
 */
export async function submitContactMessage(payload: ContactSubmission): Promise<void> {
  const base = import.meta.env.VITE_NOTION_PROXY_URL;
  if (!base) {
    throw new ContactSubmitError(
      "접수 기능이 아직 설정되지 않았습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${base.replace(/\/$/, "")}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ContactSubmitError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
  }

  if (!response.ok) {
    throw new ContactSubmitError("전송에 실패했습니다.");
  }
}
