# HACK THE BEAT

네트워킹 파티 참가자가 QR로 인맥 카드를 교환하고, 호스트가 시간표 기반 미션을 운영하는 모바일 웹 앱입니다. `Plan.md`의 MVP 범위를 Next.js 15 + Supabase로 구현했습니다.

## 실행 준비

1. Supabase 프로젝트를 만들고 SQL Editor에서 아래 파일을 순서대로 실행합니다.
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls.sql`
2. `.env.example`을 `.env.local`로 복사한 뒤 실제 값을 입력합니다.
3. 의존성을 설치하고 개발 서버를 실행합니다.

```bash
npm install
npm run dev
```

필수 환경변수:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SESSION_SECRET`은 최소 32바이트의 무작위 값을 사용해야 합니다. 실제 휴대폰 카메라 테스트에서는 `NEXT_PUBLIC_APP_URL`에 HTTPS가 적용된 Vercel Preview/Production URL을 넣어야 합니다.

## 주요 경로

- `/host/new`: 파티 생성
- `/host/[partyId]/missions`: 미션 시간표 작성
- `/host/[partyId]`: 진행 대시보드
- `/host/[partyId]/awards`: 시상 집계
- `/enter?p=ENTRY_CODE`: 참가자 입장
- `/home`, `/card`, `/scan`, `/my_qr`: 참가자 핵심 플로우

## 검증

```bash
npm run typecheck
npm run lint
npm run build
npm audit
```

기획 원문은 `PRD.md`, 구현 계획은 `Plan.md`, 구현 과정과 남은 외부 작업은 `process.md`에 기록되어 있습니다.
