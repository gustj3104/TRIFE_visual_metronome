export interface Env {
  NOTION_TOKEN: string;
  NOTION_DATA_SOURCE_ID: string;
  NOTION_QUIZ_DATA_SOURCE_ID: string;
  NOTION_ACTIVITIES_DATA_SOURCE_ID: string;
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

interface QuizQuestion {
  id: string;
  question: string;
  explanation: string;
  correct: 0 | 1;
  audience: '전체' | '신규' | '기존';
}

interface NotionRichText {
  plain_text: string;
}

interface NotionSelect {
  name: string;
}

interface NotionPage {
  id: string;
  properties: Record<string, {
    rich_text?: NotionRichText[];
    select?: NotionSelect | null;
  }>;
}

function richTextToPlain(prop: { rich_text?: NotionRichText[] } | undefined): string {
  return (prop?.rich_text ?? []).map((t) => t.plain_text).join('').trim();
}

function mapNotionPageToQuizQuestion(page: NotionPage): QuizQuestion | null {
  const question = richTextToPlain(page.properties['질문']);
  const explanation = richTextToPlain(page.properties['해설']);
  const answer = page.properties['정답']?.select?.name;
  const audienceName = page.properties['대상']?.select?.name;

  if (!question || (answer !== 'O' && answer !== 'X')) return null;
  const audience = audienceName === '신규' || audienceName === '기존' ? audienceName : '전체';

  return {
    id: page.id,
    question,
    explanation,
    correct: answer === 'O' ? 0 : 1,
    audience,
  };
}

async function handleQuizQuery(env: Env, origin: string): Promise<Response> {
  console.log('[quiz] querying data source', env.NOTION_QUIZ_DATA_SOURCE_ID);

  let notionResponse: Response;
  try {
    notionResponse = await fetch(
      `https://api.notion.com/v1/data_sources/${env.NOTION_QUIZ_DATA_SOURCE_ID}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.NOTION_TOKEN}`,
          'Notion-Version': '2025-09-03',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: { property: '노출 여부', checkbox: { equals: true } },
          sorts: [{ property: '문항 순서', direction: 'ascending' }],
        }),
      },
    );
  } catch (err) {
    console.error('[quiz] fetch to Notion threw', err);
    return jsonResponse({ error: 'Failed to reach Notion' }, 502, origin);
  }

  if (!notionResponse.ok) {
    const detail = await notionResponse.text();
    console.error('[quiz] Notion query error', notionResponse.status, detail);
    return jsonResponse({ error: 'Failed to load quiz questions' }, 502, origin);
  }

  let data: { results: NotionPage[] };
  let questions: QuizQuestion[];
  try {
    data = (await notionResponse.json()) as { results: NotionPage[] };
    questions = data.results
      .map(mapNotionPageToQuizQuestion)
      .filter((q): q is QuizQuestion => q !== null);
  } catch (err) {
    console.error('[quiz] failed to parse/map Notion response', err);
    return jsonResponse({ error: 'Failed to load quiz questions' }, 502, origin);
  }

  console.log(`[quiz] Notion returned ${data.results.length} row(s), ${questions.length} valid after mapping`);
  if (data.results.length > 0 && questions.length === 0) {
    console.warn(
      '[quiz] All rows were dropped by mapNotionPageToQuizQuestion — check that "질문" and "정답" (O/X) are filled in for each row.',
    );
  }

  return jsonResponse(questions, 200, origin);
}

interface NotionSelectProperty {
  select: { name: string } | null;
}
interface NotionCheckboxProperty {
  checkbox: boolean;
}
interface NotionTitleProperty {
  title: { plain_text: string }[];
}
interface NotionRichTextProperty {
  rich_text: { plain_text: string }[];
}
interface NotionDateProperty {
  date: { start: string; end: string | null } | null;
}

interface NotionActivityPage {
  id: string;
  properties: {
    '활동명': NotionTitleProperty;
    '활동 ID': NotionRichTextProperty;
    '공개여부': NotionCheckboxProperty;
    '모집상태': NotionSelectProperty;
    '활동일': NotionDateProperty;
    '시작 시간': NotionRichTextProperty;
    '종료 시간': NotionRichTextProperty;
    '활동지(집결지)': NotionRichTextProperty;
    '강도': NotionSelectProperty;
  };
}

interface ActivityListItem {
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
  detailMarkdown: string;
}

function plainText(prop: { plain_text: string }[] | undefined): string {
  return (prop ?? []).map((t) => t.plain_text).join('').trim();
}

function selectName(prop: NotionSelectProperty | undefined): string {
  return prop?.select?.name ?? '';
}

// Notion property access is defensive (optional chaining, no direct index
// access) because a dummy/admin-edited row can easily have a property
// missing, renamed, or a different type than expected — that must not crash
// the whole request, since an uncaught exception here returns a response
// without our CORS headers and shows up in the browser as an opaque
// "network error" instead of a readable message.
function mapActivity(page: NotionActivityPage): ActivityListItem {
  const props = page.properties;
  return {
    id: page.id,
    activityId: plainText(props['활동 ID']?.rich_text),
    name: plainText(props['활동명']?.title),
    status: selectName(props['모집상태']),
    date: props['활동일']?.date?.start ?? '',
    endDate: props['활동일']?.date?.end ?? null,
    startTime: plainText(props['시작 시간']?.rich_text),
    endTime: plainText(props['종료 시간']?.rich_text),
    place: plainText(props['활동지(집결지)']?.rich_text),
    intensity: selectName(props['강도']),
    detailMarkdown: '',
  };
}

// ─── Page content → Markdown ────────────────────────────────────────────────
// The "안내" (guide) text shown for each activity is no longer a database
// property. Instead it's whatever the admin writes as the body of the
// activity's Notion page, so we walk the page's block children and render
// them as Markdown for the frontend to display.

interface NotionRichTextSpan {
  plain_text: string;
  href: string | null;
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
  };
}

interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  paragraph?: { rich_text: NotionRichTextSpan[] };
  heading_1?: { rich_text: NotionRichTextSpan[] };
  heading_2?: { rich_text: NotionRichTextSpan[] };
  heading_3?: { rich_text: NotionRichTextSpan[] };
  bulleted_list_item?: { rich_text: NotionRichTextSpan[] };
  numbered_list_item?: { rich_text: NotionRichTextSpan[] };
  to_do?: { rich_text: NotionRichTextSpan[]; checked: boolean };
  quote?: { rich_text: NotionRichTextSpan[] };
  callout?: { rich_text: NotionRichTextSpan[]; icon?: { type: string; emoji?: string } | null };
  code?: { rich_text: NotionRichTextSpan[]; language: string };
  image?: { type: string; external?: { url: string }; file?: { url: string } };
}

function richTextArrayToMarkdown(spans: NotionRichTextSpan[] | undefined): string {
  return (spans ?? [])
    .map((span) => {
      let text = span.plain_text;
      if (!text) return '';
      if (span.annotations.code) text = `\`${text}\``;
      if (span.annotations.bold) text = `**${text}**`;
      if (span.annotations.italic) text = `*${text}*`;
      if (span.annotations.strikethrough) text = `~~${text}~~`;
      if (span.href) text = `[${text}](${span.href})`;
      return text;
    })
    .join('');
}

async function fetchBlockChildren(blockId: string, env: Env): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${blockId}/children`);
    url.searchParams.set('page_size', '100');
    if (cursor) url.searchParams.set('start_cursor', cursor);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        'Notion-Version': '2025-09-03',
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch blocks for ${blockId}: ${res.status}`);
    }

    const data = (await res.json()) as {
      results: NotionBlock[];
      has_more: boolean;
      next_cursor: string | null;
    };
    blocks.push(...data.results);
    cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
  } while (cursor);

  return blocks;
}

async function blocksToMarkdown(blocks: NotionBlock[], env: Env, indent = ''): Promise<string> {
  const lines: string[] = [];
  let numberedIndex = 0;

  for (const block of blocks) {
    if (block.type !== 'numbered_list_item') numberedIndex = 0;

    let line = '';
    switch (block.type) {
      case 'paragraph':
        line = richTextArrayToMarkdown(block.paragraph?.rich_text);
        break;
      case 'heading_1':
        line = `# ${richTextArrayToMarkdown(block.heading_1?.rich_text)}`;
        break;
      case 'heading_2':
        line = `## ${richTextArrayToMarkdown(block.heading_2?.rich_text)}`;
        break;
      case 'heading_3':
        line = `### ${richTextArrayToMarkdown(block.heading_3?.rich_text)}`;
        break;
      case 'bulleted_list_item':
        line = `- ${richTextArrayToMarkdown(block.bulleted_list_item?.rich_text)}`;
        break;
      case 'numbered_list_item':
        numberedIndex += 1;
        line = `${numberedIndex}. ${richTextArrayToMarkdown(block.numbered_list_item?.rich_text)}`;
        break;
      case 'to_do':
        line = `- [${block.to_do?.checked ? 'x' : ' '}] ${richTextArrayToMarkdown(block.to_do?.rich_text)}`;
        break;
      case 'quote':
        line = `> ${richTextArrayToMarkdown(block.quote?.rich_text)}`;
        break;
      case 'callout': {
        const emoji = block.callout?.icon?.emoji ? `${block.callout.icon.emoji} ` : '';
        line = `> ${emoji}${richTextArrayToMarkdown(block.callout?.rich_text)}`;
        break;
      }
      case 'code': {
        const language = block.code?.language ?? '';
        const text = richTextArrayToMarkdown(block.code?.rich_text);
        line = `\`\`\`${language}\n${text}\n\`\`\``;
        break;
      }
      case 'divider':
        line = '---';
        break;
      case 'image': {
        const url = block.image?.type === 'external' ? block.image.external?.url : block.image?.file?.url;
        line = url ? `![](${url})` : '';
        break;
      }
      default:
        break;
    }
    if (line) lines.push(`${indent}${line}`);

    if (block.has_children) {
      const childBlocks = await fetchBlockChildren(block.id, env);
      const childMarkdown = await blocksToMarkdown(childBlocks, env, `${indent}  `);
      if (childMarkdown) lines.push(childMarkdown);
    }
  }

  return lines.join('\n\n');
}

async function fetchPageMarkdown(pageId: string, env: Env): Promise<string> {
  const blocks = await fetchBlockChildren(pageId, env);
  return blocksToMarkdown(blocks, env);
}

async function handleGetActivities(env: Env, origin: string): Promise<Response> {
  console.log('[activities] querying data source', env.NOTION_ACTIVITIES_DATA_SOURCE_ID);

  let notionResponse: Response;
  try {
    notionResponse = await fetch(
      `https://api.notion.com/v1/data_sources/${env.NOTION_ACTIVITIES_DATA_SOURCE_ID}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.NOTION_TOKEN}`,
          'Notion-Version': '2025-09-03',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: { property: '공개여부', checkbox: { equals: true } },
          sorts: [{ property: '활동일', direction: 'ascending' }],
        }),
      },
    );
  } catch (err) {
    console.error('[activities] fetch to Notion threw', err);
    return jsonResponse({ error: 'Failed to reach Notion' }, 502, origin);
  }

  if (!notionResponse.ok) {
    const detail = await notionResponse.text();
    console.error('[activities] Notion API error', notionResponse.status, detail);
    return jsonResponse({ error: 'Failed to load activities' }, 502, origin);
  }

  let body: { results: NotionActivityPage[] };
  let activities: ActivityListItem[];
  try {
    body = (await notionResponse.json()) as { results: NotionActivityPage[] };
    activities = body.results.map(mapActivity).filter((a) => a.name && a.date);
  } catch (err) {
    console.error(
      '[activities] failed to parse/map Notion response — check that "활동 일정 DB" property names and types match what the Worker expects',
      err,
    );
    return jsonResponse({ error: 'Failed to load activities' }, 502, origin);
  }

  console.log(`[activities] Notion returned ${body.results.length} row(s), ${activities.length} valid after mapping`);
  if (body.results.length > 0 && activities.length === 0) {
    console.warn(
      '[activities] All rows were dropped — check that "활동명" and "활동일" are filled in for each row with "공개여부" checked.',
    );
  }

  const activitiesWithDetail = await Promise.all(
    activities.map(async (activity) => {
      try {
        const detailMarkdown = await fetchPageMarkdown(activity.id, env);
        return { ...activity, detailMarkdown };
      } catch (err) {
        console.error(`[activities] failed to load page content for "${activity.name}" (${activity.id})`, err);
        return activity;
      }
    }),
  );

  return jsonResponse({ activities: activitiesWithDetail }, 200, origin);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/quiz') {
      return handleQuizQuery(env, origin);
    }
    if (request.method === 'GET') {
      return handleGetActivities(env, origin);
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
