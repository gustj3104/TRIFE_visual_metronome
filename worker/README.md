# TRIFE Notion 프록시

`/trife` 페이지와 Notion을 네 방향으로 중계하는 Cloudflare Worker입니다.
Notion 비밀 토큰을 클라이언트에 노출하지 않기 위해 이 작은 프록시가 대신
Notion API를 호출합니다.

- `POST /` — 활동 신청서(`FormScreen`)가 제출한 데이터를 Notion "신청자 DB"에
  자동으로 기록합니다.
- `GET /quiz` — Notion "퀴즈 DB"에서 `노출 여부`가 체크된 문항만, `문항 순서`
  오름차순으로 조회해 퀴즈 화면(`QuizScreen`)에 보여줍니다.
- `GET /` (그 외 GET 요청) — Notion "활동 일정 DB"에서 `공개여부`가 체크된
  활동만 조회해 `/trife` 페이지에 보여줍니다.
- `POST /contact` — "TRIFE와 연결하기" 섹션(`ContactFormModal`)에서 제출한
  활동 제안·문의·협업 제안을 Notion "TRIFE 인바운드" DB에 자동으로
  기록합니다.

## 활동 일정을 웹에 노출하는 방법 (관리자용)

Notion "활동 일정 DB"에 새 행을 추가하고 아래 속성을 채운 뒤 **공개여부**
체크박스를 켜면, 잠시 후 `/trife` 페이지에 자동으로 노출됩니다. 체크를
끄면 웹에서 즉시 사라집니다.

| 속성 | 설명 |
| --- | --- |
| 활동명 | 활동 제목 |
| 활동 ID | 내부 식별용 텍스트(선택) |
| 공개여부 | 체크해야 웹에 노출됩니다 |
| 모집상태 | 모집 예정 / 신청 가능 / 신청 마감 / 취소 |
| 활동일 | 활동 날짜 |
| 시작 시간 / 종료 시간 | 텍스트로 표기 (예: 09:30) |
| 활동지(집결지) | 장소 |
| 강도 | 하 / 중 / 상 |

**안내(상세 설명) 작성 방법**: 별도 속성이 아니라, Notion에서 **활동명을 눌러
페이지를 연 뒤 그 페이지 본문에** 안내 문구를 작성하면 됩니다. 제목, 굵게/
기울임, 목록, 인용, 코드, 구분선 등 기본 블록으로 작성한 내용이 그대로
마크다운으로 변환되어 `/trife` 안내 화면에 표시됩니다. (기존 "하단 본문"
속성은 더 이상 사용하지 않으므로 DB에서 삭제해도 됩니다.)

## 퀴즈 문항을 관리하는 방법 (비개발 관리자용)

퀴즈 문항은 비개발 관리자가 Notion "퀴즈 DB"에서 직접 추가·수정·순서 변경할 수
있습니다. 앱은 `노출 여부`가 체크된 문항만, `문항 순서` 오름차순으로 불러옵니다.

퀴즈 DB 속성:

| 속성 | 타입 | 설명 |
| --- | --- | --- |
| 내부관리명 | 제목 | 관리자가 문항을 구분하기 위한 이름 (앱에는 노출되지 않음) |
| 노출 여부 | 체크박스 | 체크된 문항만 앱에 표시됩니다 |
| 질문 | 텍스트 | 문항 내용 (O/X 질문) |
| 정답 | 선택 (O/X) | O = "그렇다"가 정답, X = "아니다"가 정답 |
| 해설 | 텍스트 | 정답 확인 후 보여줄 해설 |
| 문항 순서 | 숫자 | 오름차순으로 정렬되어 표시됩니다 |
| 대상 | 선택 (전체/신규/기존) | 참여 구분별 노출 대상 (현재는 값만 전달, 필터링은 프론트엔드 정책에 따름) |

## "TRIFE와 연결하기" 접수를 관리하는 방법 (관리자용)

활동 제안·문의·협업 제안이 제출되면 Notion "TRIFE 인바운드" DB에 새 행이
자동으로 생성됩니다. 관리자는 이 DB에서 내용을 확인하고 `상태`를
직접 바꿔가며 진행 상황을 관리하면 됩니다.

TRIFE 인바운드 DB 속성:

| 속성 | 타입 | 설명 |
| --- | --- | --- |
| 내부 식별자 | 제목 | `[유형] 제목` 형태로 자동 생성 (관리자 구분용) |
| 유형 | 선택 (활동제안/문의/협업제안) | 어떤 카드로 접수됐는지 |
| 작성자 | 텍스트 | 이름 또는 소속 |
| 연락처 | 전화번호 | 입력값이 이메일 형식이 아닐 때 채워집니다 |
| 이메일 | 이메일 | 입력값이 이메일 형식일 때 채워집니다 |
| 제목 | 텍스트 | 제출한 제목 |
| 본문 | 텍스트 | 제출한 내용 |
| 상태 | 상태 (시작 전/확인 중/답변 완료) | 접수 시 "시작 전"으로 시작하며, 이후 관리자가 직접 변경 |
| 접수일 | 생성 일시 | Notion이 자동으로 기록 |

## 사전 준비

1. [Notion Integration](https://www.notion.so/my-integrations)을 생성하고
   시크릿 토큰을 발급받습니다.
2. 대상 "신청자 DB", "퀴즈 DB", "활동 일정 DB", "TRIFE 인바운드" 데이터소스
   각각에 해당 Integration을 연결(공유)합니다.
3. Cloudflare 계정과 [wrangler](https://developers.cloudflare.com/workers/wrangler/)
   CLI를 준비합니다.

## 배포

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put NOTION_TOKEN   # 발급받은 Notion Integration 토큰 입력
npm run deploy
```

배포가 끝나면 `https://trife-notion-proxy.<subdomain>.workers.dev` 형태의
URL이 출력됩니다. 이 URL을 프론트엔드 빌드 시 `VITE_NOTION_PROXY_URL` 환경
변수로 전달해야 신청서 제출이 Notion에 기록됩니다 (루트 `README.md` 참고).

## CI에서 자동 배포하기

위 수동 배포는 최초 1회만 하면 되고, 이후 `worker/` 코드를 수정한 뒤 `main`에
푸시하면 `.github/workflows/deploy-worker.yml`이 자동으로
`wrangler deploy`를 실행합니다. 매번 로컬에서 `wrangler deploy`를 직접 칠
필요가 없습니다. (`wrangler secret put NOTION_TOKEN`으로 등록한 시크릿은
Cloudflare 쪽에 그대로 남아있으므로 재배포해도 다시 등록할 필요 없습니다.)

이 워크플로가 동작하려면 저장소 **Settings → Environments → `github-pages`
→ Environment secrets**에 아래 2개를 등록해야 합니다. (`deploy-worker.yml`의
job이 `environment: github-pages`를 참조하도록 되어 있으므로, Repository
secrets가 아니라 반드시 이 Environment 아래에 등록해야 인식됩니다.)

- `CLOUDFLARE_API_TOKEN` — [Cloudflare 대시보드 → My Profile → API Tokens →
  Create Token](https://dash.cloudflare.com/profile/api-tokens)에서 **Edit
  Cloudflare Workers** 템플릿으로 생성.
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare 대시보드 Workers & Pages 개요 페이지
  우측에서 확인 가능한 Account ID.

## 설정값

`wrangler.toml`에 정의된 값:

- `ALLOWED_ORIGIN` — CORS를 허용할 프론트엔드 origin (GitHub Pages 주소).
- `NOTION_DATA_SOURCE_ID` — 신청서를 기록할 "신청자 DB" 데이터소스 ID.
- `NOTION_QUIZ_DATA_SOURCE_ID` — 퀴즈 문항을 읽어올 "퀴즈 DB" 데이터소스 ID.
- `NOTION_ACTIVITIES_DATA_SOURCE_ID` — 활동 일정을 조회할 "활동 일정 DB"
  데이터소스 ID.
- `NOTION_CONTACT_DATA_SOURCE_ID` — 활동 제안·문의·협업 제안을 기록할
  "TRIFE 인바운드" DB 데이터소스 ID.

시크릿(코드에 커밋하지 않음):

- `NOTION_TOKEN` — `wrangler secret put NOTION_TOKEN`으로 등록.

## 로컬 개발

```bash
npm run dev
```

`.dev.vars` 파일을 만들어 로컬에서만 사용할 시크릿을 넣을 수 있습니다:

```
NOTION_TOKEN=secret_xxx
```
