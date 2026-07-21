export interface RemoteActivity {
  id: string;
  activityId: string;
  name: string;
  status: string;
  date: string;
  endDate: string | null;
  startTime: string;
  endTime: string;
  place: string;
  intensity: string;
  bottomText: string;
}

export class ActivitiesFetchError extends Error {}

export async function fetchActivities(): Promise<RemoteActivity[]> {
  const endpoint = import.meta.env.VITE_NOTION_PROXY_URL;
  if (!endpoint) {
    console.warn(
      "[notionActivities] VITE_NOTION_PROXY_URL이 설정되지 않았습니다. 프로젝트 루트의 .env 파일에 값을 채우고 dev 서버를 재시작하세요. " +
        "(GitHub Actions Variables는 로컬 개발 서버에는 적용되지 않습니다.)",
    );
    throw new ActivitiesFetchError(
      "활동 일정을 불러오는 기능이 아직 설정되지 않았습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  let response: Response;
  try {
    response = await fetch(endpoint, { method: "GET" });
  } catch (err) {
    console.error(`[notionActivities] ${endpoint} 요청 중 네트워크 오류`, err);
    throw new ActivitiesFetchError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(
      `[notionActivities] Worker가 오류를 반환함 (${response.status} ${response.statusText})`,
      detail,
    );
    throw new ActivitiesFetchError("활동 일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  let body: { activities: RemoteActivity[] };
  try {
    body = (await response.json()) as { activities: RemoteActivity[] };
  } catch (err) {
    console.error("[notionActivities] 응답 JSON 파싱 실패", err);
    throw new ActivitiesFetchError("활동 일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (!Array.isArray(body.activities)) {
    console.error("[notionActivities] 예상치 못한 응답 형식", body);
    throw new ActivitiesFetchError("활동 일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (body.activities.length === 0) {
    console.warn(
      "[notionActivities] Worker는 정상 응답했지만 활동이 0건입니다. " +
        "Notion '활동 일정 DB'에서 '공개여부' 체크박스와 '활동명'/'활동일' 값이 채워져 있는지 확인하세요.",
    );
  }

  return body.activities;
}
