export interface ApplicationSubmission {
  name: string;
  phone: string;
  gender: string;
  district: string;
  dong: string;
  age: number;
  frequency: string;
  privacyConsent: boolean;
  rulesConsent: boolean;
  participantType: "신규" | "기존";
  quizScore: number;
  quizTotal: number;
  activityName: string;
  activityDate: string;
}

export class ApplicationSubmitError extends Error {}

export async function submitApplication(payload: ApplicationSubmission): Promise<void> {
  const endpoint = import.meta.env.VITE_NOTION_PROXY_URL;
  if (!endpoint) {
    throw new ApplicationSubmitError(
      "신청서 제출 기능이 아직 설정되지 않았습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApplicationSubmitError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
  }

  if (!response.ok) {
    throw new ApplicationSubmitError("신청서 제출에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
