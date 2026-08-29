# 구현 기록 (Process)

## 2026-08-29

### 착수

- `Plan.md`와 `PRD.md`를 확인했다.
- 저장소에는 두 기획 문서와 간단한 README만 있고 애플리케이션 코드는 없는 상태다.
- 구현 범위는 Plan의 Phase 0~4 전체와 Phase 5 중 코드로 검증 가능한 항목으로 잡았다.
- Supabase/Vercel 실계정 환경변수가 아직 없으므로, DB 마이그레이션과 배포 가능한 코드까지 만들고 실제 원격 DB 반영·프로덕션 배포·휴대폰 카메라 실기기 검증은 후속 실행 항목으로 남긴다.

### Phase 0 — 프로젝트 기반

- Next.js 15 App Router + TypeScript + Tailwind CSS 프로젝트 구조를 수동 구성하기 시작했다.
- 기존 문서 파일을 보존하기 위해 `create-next-app`의 덮어쓰기 대신 필요한 설정과 소스 파일을 명시적으로 추가한다.
- Next.js/Tailwind/TypeScript 설정과 의존성을 추가했다. 최초 지정 버전에 보안 경고가 있어 Next.js 15 계열 최신 패치로 즉시 갱신했다.
- `0001_init.sql`에 파티·참가자·미션·미션 결과·카드 스키마와 무결성 제약을, `0002_rls.sql`에 전 테이블 RLS와 미션 읽기 전용 정책/Realtime publication을 추가했다.

### Phase 1~3 — 참가자 플로우

- service-role 전용 Supabase 클라이언트와 12시간 JWT httpOnly 참가자/호스트 쿠키를 구현했다.
- 파티 QR 입장, 닉네임 로그인/자동 가입, 프로필 작성·수정, 별도 비밀번호 변경 경로를 구현했다.
- 홈 참여자 수 폴링, 내 QR, QR 카메라 스캔, 중복·본인·타 파티 검증, 카드 목록/빈 상태를 구현했다.
- lazy advance 미션 진행, Realtime+폴링 미션 수신, 자기 신고와 카드 수 자동 판정을 구현했다.

### Phase 4 — 호스트 플로우

- 파티 생성과 입장 QR 이미지 다운로드, PIN 재인증을 구현했다.
- 미션 추가·삭제·순서 변경·판정 방식/목표 설정·총 시간 경고를 구현했다.
- 참가자/교환 집계, 파티 시작·종료, 깜짝 미션 대체 발행, 카드/자동 미션 시상 순위를 구현했다.

### Phase 5 — 마감 및 검증

- `100dvh`, safe-area 하단 여백, 모바일 최대 폭, 카메라 권한 거부 안내, 잘못된 QR·본인 QR·타 파티 QR·중복 카드·종료 파티·네트워크 오류 상태를 처리했다.
- 파티 종료 후 카드 조회는 유지하고 새 카드 추가는 서버에서 차단하도록 보완했다.
- Plan 데이터 모델에 별도 파티 예정 시간 필드가 없으므로 시간표 화면에서는 MVP 운영 권장값 2시간을 기준으로 초과 경고하도록 구현했다.
- 의존성 보안 감사 결과에 따라 Next.js 15 최신 패치(15.5.24)를 사용하고, 취약한 전이 의존성 `postcss`와 `sharp`를 안전한 버전으로 override했다.
- 검증 결과:
  - `npm run typecheck`: 통과
  - `npm run lint`: 경고/오류 없이 통과
  - `npm run build`: Next.js 프로덕션 빌드 통과
  - `npm install` audit: 취약점 0건

### 외부 환경이 있어야 완료할 항목

- 실제 Supabase 프로젝트에 마이그레이션 실행 및 Realtime publication 동작 확인
- `.env.local`과 Vercel 환경변수 등록
- Vercel HTTPS Preview/Production 배포
- iOS Safari와 Android Chrome에서 카메라 권한·QR 인식·화면 꺼짐 방지 실기기 검증

### 로컬 환경 연결

- 제공받은 Supabase Project URL, Publishable key, Secret key를 Git에서 제외되는 `.env.local`에 설정했다.
- 로컬 전용 `SESSION_SECRET`을 32바이트 난수로 생성했다.
- 개발 서버 기동과 `/enter` 응답(HTTP 200)을 확인했다. 확인용 3001 포트 서버는 종료했으며, 기존 3000 포트 프로세스는 건드리지 않았다.
- Supabase Data API로 5개 테이블(`parties`, `participants`, `missions`, `mission_results`, `cards`) 생성을 확인했다.
- SQL Editor에서 마이그레이션을 재실행해도 정책/publication 중복 오류가 나지 않도록 `0002_rls.sql`을 멱등하게 보완했다.

### Vercel 프로덕션 배포

- Vercel 프로젝트 `party-time-dgd`를 생성하고 현재 Next.js 프로젝트를 연결했다.
- Supabase URL/Publishable key와 서버 전용 Secret key, 세션 서명 키, 프로덕션 앱 URL을 Vercel Production 환경변수에 등록했다.
- 프로덕션 배포 및 고정 도메인 연결을 완료했다: `https://party-time-dgd.vercel.app`
- 배포 후 검증 결과:
  - `/` → `/enter` 리다이렉트 후 HTTP 200
  - `/host/new` HTTP 200
  - Supabase 조회가 포함된 `/enter?p=connection-check` HTTP 200
