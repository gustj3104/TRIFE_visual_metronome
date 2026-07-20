
  # TRIFE Visual Metronome

  청각장애인과 비청각장애인이 하나의 프로젝터 화면을 보며 박자를 공유할 수 있도록 만든
  웹 기반 비주얼 메트로놈입니다.

  ## 설치

  ```bash
  npm install
  ```

  ## 개발 서버 실행

  ```bash
  npm run dev
  ```

  ## 타입체크

  ```bash
  npm run typecheck
  ```

  ## 린트

  ```bash
  npm run lint
  ```

  ## 빌드

  ```bash
  npm run build
  ```

  ## 테스트

  (추후 추가 예정)

  ## /trife 활동 신청 → Notion 자동 기록

  `/trife` 신청서(`src/app/home/HomePage.tsx`의 `FormScreen`)는 제출 시
  `VITE_NOTION_PROXY_URL` 환경 변수가 가리키는 Cloudflare Worker를 호출해
  Notion "신청자 DB"에 신청 내역을 자동으로 기록합니다. Notion 비밀 토큰은
  클라이언트 코드에 두지 않고 이 Worker에만 보관합니다.

  1. `worker/README.md`를 따라 Cloudflare Worker를 배포합니다.
  2. 로컬 개발 시 `.env.example`을 `.env`로 복사하고 배포된 Worker URL을
     `VITE_NOTION_PROXY_URL`에 채웁니다.
  3. GitHub Pages 배포는 저장소 Settings → Secrets and variables → Actions →
     Variables에 `VITE_NOTION_PROXY_URL`을 등록하면 `deploy.yml` 빌드 시
     자동으로 주입됩니다. 값을 등록하지 않으면 신청서 제출 시 안내 오류
     메시지가 표시될 뿐, 다른 기능에는 영향이 없습니다.
  