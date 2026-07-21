# TRIFE Notion 프록시

`/trife` 활동 신청서(`FormScreen`)가 제출한 데이터를 Notion "신청자 DB"에
자동으로 기록하고(`POST /`), "퀴즈 DB"에 등록된 문항을 앱이 읽어올 수 있도록
(`GET /quiz`) 중계하는 Cloudflare Worker입니다. Notion 비밀 토큰을 클라이언트에
노출하지 않기 위해 이 작은 프록시가 대신 Notion API를 호출합니다.

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

## 사전 준비

1. [Notion Integration](https://www.notion.so/my-integrations)을 생성하고
   시크릿 토큰을 발급받습니다.
2. 대상 "신청자 DB"와 "퀴즈 DB" 데이터소스 각각에 해당 Integration을
   연결(공유)합니다.
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

## 설정값

`wrangler.toml`에 정의된 값:

- `ALLOWED_ORIGIN` — CORS를 허용할 프론트엔드 origin (GitHub Pages 주소).
- `NOTION_DATA_SOURCE_ID` — 신청자 기록 대상 Notion 데이터소스 ID.
- `NOTION_QUIZ_DATA_SOURCE_ID` — 퀴즈 문항을 읽어올 "퀴즈 DB" 데이터소스 ID.

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
