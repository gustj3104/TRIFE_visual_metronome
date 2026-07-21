# TRIFE Notion 신청 프록시

`/trife` 활동 신청서(`FormScreen`)가 제출한 데이터를 Notion "신청자 DB"에
자동으로 기록하고, Notion "활동 일정 DB"에 등록된 활동을 웹에 노출하기 위한
Cloudflare Worker입니다. Notion 비밀 토큰을 클라이언트에 노출하지 않기 위해
이 작은 프록시가 대신 Notion API를 호출합니다.

- `POST` 요청은 신청서 제출을 Notion "신청자 DB"에 기록합니다.
- `GET` 요청은 Notion "활동 일정 DB"에서 `공개여부`가 체크된 활동만 조회해
  `/trife` 페이지에 보여줍니다.

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
| 하단 본문 | 상세 안내 문구(선택) |

## 사전 준비

1. [Notion Integration](https://www.notion.so/my-integrations)을 생성하고
   시크릿 토큰을 발급받습니다.
2. 대상 "신청자 DB"와 "활동 일정 DB" 데이터소스 모두에 해당 Integration을
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
- `NOTION_DATA_SOURCE_ID` — 신청서를 기록할 "신청자 DB" 데이터소스 ID.
- `NOTION_ACTIVITIES_DATA_SOURCE_ID` — 활동 일정을 조회할 "활동 일정 DB"
  데이터소스 ID.

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
