export interface Env {
  NOTION_TOKEN: string;
  NOTION_DATA_SOURCE_ID: string;
  ALLOWED_ORIGIN: string;
}

interface ApplicationPayload {
  name: string;
  phone: string;
  gender: string;
  district: string;
  dong: string;
  age: number;
  frequency: string;
  privacyConsent: boolean;
  rulesConsent: boolean;
  participantType: '신규' | '기존';
  quizScore: number;
  quizTotal: number;
  activityName: string;
  activityDate: string;
}

const PHONE_RE = /^010-\d{4}-\d{4}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function jsonResponse(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

function validate(payload: Partial<ApplicationPayload>): string | null {
  if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) return 'name is required';
  if (!payload.phone || !PHONE_RE.test(payload.phone)) return 'phone is invalid';
  if (!payload.gender || typeof payload.gender !== 'string') return 'gender is required';
  if (!payload.district || typeof payload.district !== 'string') return 'district is required';
  if (!payload.dong || typeof payload.dong !== 'string') return 'dong is required';
  if (typeof payload.age !== 'number' || !Number.isFinite(payload.age) || payload.age < 1 || payload.age > 120) return 'age is invalid';
  if (!payload.frequency || typeof payload.frequency !== 'string') return 'frequency is required';
  if (payload.privacyConsent !== true) return 'privacyConsent must be accepted';
  if (payload.rulesConsent !== true) return 'rulesConsent must be accepted';
  if (payload.participantType !== '신규' && payload.participantType !== '기존') return 'participantType is invalid';
  if (typeof payload.quizScore !== 'number' || !Number.isFinite(payload.quizScore)) return 'quizScore is invalid';
  if (typeof payload.quizTotal !== 'number' || !Number.isFinite(payload.quizTotal)) return 'quizTotal is invalid';
  if (!payload.activityName || typeof payload.activityName !== 'string') return 'activityName is required';
  if (!payload.activityDate || !DATE_RE.test(payload.activityDate)) return 'activityDate is invalid';
  return null;
}

function buildNotionProperties(payload: ApplicationPayload) {
  return {
    '신청자명': { title: [{ text: { content: payload.name.trim() } }] },
    '연락처': { phone_number: payload.phone },
    '성별': { select: { name: payload.gender } },
    '자치구': { rich_text: [{ text: { content: payload.district.trim() } }] },
    '동': { rich_text: [{ text: { content: payload.dong.trim() } }] },
    '만 나이': { number: payload.age },
    '운동 빈도': { select: { name: payload.frequency } },
    '개인정보 동의': { checkbox: payload.privacyConsent },
    '활동 수칙 동의': { checkbox: payload.rulesConsent },
    '참여 구분': { select: { name: payload.participantType } },
    '퀴즈 점수': { number: payload.quizScore },
    '전체 문항 수': { number: payload.quizTotal },
    '신청 활동': { rich_text: [{ text: { content: payload.activityName } }] },
    '활동명 스냅숏': { rich_text: [{ text: { content: payload.activityName } }] },
    '활동 날짜 스냅숏': { date: { start: payload.activityDate } },
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method Not Allowed' }, 405, origin);
    }

    let payload: Partial<ApplicationPayload>;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
    }

    const validationError = validate(payload);
    if (validationError) {
      return jsonResponse({ error: validationError }, 400, origin);
    }

    const notionResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        'Notion-Version': '2025-09-03',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { type: 'data_source_id', data_source_id: env.NOTION_DATA_SOURCE_ID },
        properties: buildNotionProperties(payload as ApplicationPayload),
      }),
    });

    if (!notionResponse.ok) {
      const detail = await notionResponse.text();
      console.error('Notion API error', notionResponse.status, detail);
      return jsonResponse({ error: 'Failed to record application' }, 502, origin);
    }

    return jsonResponse({ ok: true }, 200, origin);
  },
};
