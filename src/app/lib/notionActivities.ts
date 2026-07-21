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
    throw new ActivitiesFetchError(
      "활동 일정을 불러오는 기능이 아직 설정되지 않았습니다. 잠시 후 다시 시도해 주세요.",
    );
  }

  let response: Response;
  try {
    response = await fetch(endpoint, { method: "GET" });
  } catch {
    throw new ActivitiesFetchError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
  }

  if (!response.ok) {
    throw new ActivitiesFetchError("활동 일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  const body = (await response.json()) as { activities: RemoteActivity[] };
  return body.activities;
}
