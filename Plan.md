# 구현 계획 (Plan)

PRD.md의 MVP를 Next.js + Supabase + Vercel로 구현하기 위한 작업 계획.
범위는 **참가자 플로우 전체 + 호스트 최소 기능**으로 잡는다.

---

## 0. 기술 결정

| 항목 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Next.js 15 (App Router) + TypeScript | Vercel 배포 1급 지원, Server Actions로 API 라우트 최소화 |
| 스타일 | Tailwind CSS | 디자인 시안이 없으므로 유틸리티로 빠르게 |
| DB | Supabase Postgres | 요구사항 |
| 실시간 | Supabase Realtime (postgres_changes) | 미션 발행 / 참여자 수 / 카드 추가 즉시 반영 |
| 인증 | **자체 인증** (닉네임 + 비밀번호) | PRD가 이메일 없는 닉네임 로그인이라 Supabase Auth 부적합. bcrypt 해시 + 서명 쿠키 세션 |
| QR 스캔 | `qr-scanner` (nimiq) | 경량, 워커 기반, iOS Safari 동작 확인됨 |
| QR 생성 | `qrcode` | canvas/dataURL 생성 |
| 배포 | Vercel | 요구사항 |

### 인증 방식 상세
- Supabase Auth를 쓰지 않으므로 **RLS는 전면 차단(deny all)** 하고, 모든 DB 접근은 서버(Server Action / Route Handler)에서 `SUPABASE_SERVICE_ROLE_KEY`로 수행한다.
- Realtime 구독만 `anon key`로 클라이언트에서 하되, 구독 대상 테이블(`missions`, `party_stats`)은 읽기 전용 RLS 정책을 따로 연다.
- 세션: `jose`로 서명한 JWT를 `htb_session` httpOnly 쿠키에 저장. payload = `{ participantId, partyId }`, 만료 12시간.

### PRD 8장 미결 항목에 대한 MVP 확정안
> 진행하면서 바뀔 수 있으나, 구현을 멈추지 않기 위해 아래로 고정한다.

- **미션 판정**: `judge_type`을 미션 속성으로 둔다. `auto_cards`(N명과 카드 교환 → 카드 수로 자동 판정)와 `self`(자기 신고) 두 종류. 시상 랭킹은 `auto_cards` 성공만 집계하고 `self`는 참고 표시. (PRD 7장 "자동 판정 우선" 반영)
- **미션 간 자유 시간**: 시간표는 연달아 붙인다. 자유 시간이 필요하면 "자유 시간" 내용의 미션으로 넣는다.
- **깜짝 미션**: 진행 중 미션을 **즉시 종료하고 대체**한다. 남은 시간표는 뒤로 밀린다.
- **파티 종료 후 카드**: 카드는 삭제하지 않고 읽기 전용으로 유지.

---

## 1. 데이터 모델 (Supabase)

`supabase/migrations/0001_init.sql`

```sql
create extension if not exists "pgcrypto";

-- 파티
create table parties (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                    -- 파티명
  host_message  text not null default '',         -- 호스트 설정 문구
  entry_code    text not null unique,             -- 파티 QR에 담기는 코드 (8자)
  host_pin_hash text not null,                    -- 호스트 대시보드 진입용
  status        text not null default 'ready'
                check (status in ('ready','running','ended')),
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  ended_at      timestamptz
);

-- 참가자 (= 프로필)
create table participants (
  id            uuid primary key default gen_random_uuid(),
  party_id      uuid not null references parties(id) on delete cascade,
  nickname      text not null,
  password_hash text not null,
  age           int,
  gender        text,
  mbti          text,
  appearance    text,                             -- 인상착의 (필수 입력, DB는 nullable로 두고 앱에서 검증)
  card_token    text not null unique default encode(gen_random_bytes(9),'base64'), -- 내 QR에 담기는 값
  created_at    timestamptz not null default now(),
  unique (party_id, nickname)
);

-- 미션
create table missions (
  id           uuid primary key default gen_random_uuid(),
  party_id     uuid not null references parties(id) on delete cascade,
  content      text not null,
  duration_sec int  not null,
  order_index  int  not null,
  kind         text not null default 'scheduled' check (kind in ('scheduled','surprise')),
  judge_type   text not null default 'self'      check (judge_type in ('self','auto_cards')),
  auto_target  int,                               -- judge_type='auto_cards'일 때 목표 카드 수
  status       text not null default 'pending'   check (status in ('pending','active','done')),
  started_at   timestamptz,
  ends_at      timestamptz
);
create index on missions (party_id, order_index);

-- 미션 결과 (참가자별 성공/실패 1회)
create table mission_results (
  id             uuid primary key default gen_random_uuid(),
  mission_id     uuid not null references missions(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  result         text not null check (result in ('success','fail')),
  source         text not null default 'self' check (source in ('self','auto')),
  created_at     timestamptz not null default now(),
  unique (mission_id, participant_id)
);

-- 인맥 카드 (스캔한 사람 → 스캔당한 사람)
create table cards (
  id          uuid primary key default gen_random_uuid(),
  party_id    uuid not null references parties(id) on delete cascade,
  scanner_id  uuid not null references participants(id) on delete cascade,
  scanned_id  uuid not null references participants(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (scanner_id, scanned_id),
  check (scanner_id <> scanned_id)
);
create index on cards (party_id, scanner_id);
```

RLS (`0002_rls.sql`):
- 전 테이블 `enable row level security`, 정책 없음 = anon 전면 차단 (서버는 service_role이라 통과).
- 단, 클라이언트 Realtime 구독용으로 `missions`에 `for select using (true)` 정책 하나만 연다. 미션 내용은 어차피 전원 공개 정보.
- 참여자 수 / 총 교환 횟수는 민감하므로 Realtime 대신 서버에서 폴링(10초) 또는 broadcast 채널 사용.

---

## 2. 라우트 구조

```
app/
  layout.tsx
  page.tsx                    → /enter 로 redirect
  enter/page.tsx              /enter        파티 QR 스캔
  profile/page.tsx            /profile      프로필 생성/수정
  home/page.tsx               /home         홈
  my-qr/page.tsx              /my_qr        내 QR 전체화면
  card/page.tsx               /card         인맥 카드 리스트
  scan/page.tsx               /scan         카드 추가용 스캔 창
  host/
    new/page.tsx              파티 생성
    [partyId]/missions/page.tsx  미션 시간표 작성
    [partyId]/page.tsx           진행 대시보드
    [partyId]/awards/page.tsx    시상
components/
  QrScanner.tsx               카메라 + qr-scanner 래퍼
  LoginModal.tsx              /login_modal
  MissionModal.tsx            /mission_modal
  MissionBanner.tsx           홈 상시 노출용
lib/
  supabase.ts                 service-role 클라이언트 (server only)
  session.ts                  JWT 발급/검증, cookies()
  auth.ts                     로그인/가입 로직
  missions.ts                 시간표 진행 로직
actions/                      Server Actions 모음
middleware.ts                 세션 없는 접근 → /enter 리다이렉트
```

`/login_modal`과 `/mission_modal`은 독립 URL이 아니라 **모달 컴포넌트**로 구현한다. (스캔 성공 직후 / 미션 발행 직후 현재 화면 위에 뜨는 것이 PRD 흐름)

---

## 3. 화면별 구현

### 3.1 `/enter` — 입장
- 화면 중앙에 `<QrScanner>` (카메라 프리뷰 정사각형).
- 하단 중앙 2줄: `{host_message}` 개행 `'{파티명}'으로 초대합니다`.
  - **문제**: 스캔 전에는 파티를 모르므로 문구를 알 수 없다.
  - **해결**: 파티 QR을 `https://app/enter?p={entry_code}` 형태로 만든다. 카메라 앱으로 찍으면 이 URL로 바로 진입하고, 서버에서 `entry_code`로 파티를 조회해 문구/파티명을 채운 뒤 로그인 모달을 자동으로 연다.
  - `?p=` 없이 들어온 경우엔 문구 자리에 기본 안내("파티 QR을 스캔해 주세요")를 두고, 앱 내 스캐너로 같은 URL을 읽으면 `router.replace('/enter?p=...')`.
- 스캔/진입 성공 → `LoginModal` 오픈. 파티가 `ended` 상태면 종료 안내.

### 3.2 `LoginModal` — 로그인 / 가입
- 입력: 닉네임, 비밀번호. 버튼 하나(`입장하기`).
- Server Action `signInOrUp(entryCode, nickname, password)`:
  1. `(party_id, nickname)`으로 조회
  2. 있으면 bcrypt 비교 → 실패 시 "비밀번호가 다릅니다"
  3. 없으면 신규 생성(해시 저장) 후 `isNew = true`
  4. 세션 쿠키 발급
- `isNew` → `/profile`, 기존 사용자 → `/home`.
- 비밀번호는 **가입 시점에만** 받는다. 프로필 수정 화면에 노출하지 않는다.

### 3.3 `/profile` — 프로필
- 필드: 닉네임(고정, 수정 시 중복 검사), 나이, 성별, MBTI(16개 선택), 인상착의(텍스트).
- 인상착의는 필수. 빈 값이면 저장 불가 + 왜 필요한지 한 줄 안내.
- 최초 작성 모드(`?new=1`)면 저장 후 `/home`, 수정 모드면 저장 후 `/home`으로 복귀 + 토스트.
- 비밀번호 변경은 `/profile/password` 별도 경로.

### 3.4 `/home` — 홈
- 상단 배너: `{host_message}` 개행 `지금 {N}명이 파티에 참여해 있어요` (N = 해당 파티 participants count, 10초 폴링).
- **현재 진행 중인 미션 상시 노출** (`MissionBanner`): 내용 + 남은 시간 카운트다운 + `미션 열기` 버튼 → `MissionModal`.
  - 진행 중 미션 없으면 "다음 미션을 기다리는 중" 상태.
- 내 프로필 카드 표시 + `수정` → `/profile`.
- 하단 탭: 홈 / 카드 / 내 QR.

### 3.5 `/my_qr` — 내 QR
- 전체화면. `qrcode`로 `https://app/scan?c={card_token}` 인코딩.
- 밝기 최대 요청(`screen.wakeLock` 가능하면 사용).
- 문구: "제 프로필 추가하세요" + 내 닉네임/인상착의 크게.
- 홈 하단 탭과 `/card` 하단 바에서 1탭으로 도달. 스캔 버튼보다 시각적으로 크게 둔다.

### 3.6 `/card` — 인맥 카드
- 서버에서 `cards join participants` 로 내가 모은 카드 목록 조회(최신순).
- 카드 항목: 닉네임 / 나이·성별·MBTI / 인상착의 / 만난 시각.
- **빈 상태**: "아직 카드가 없어요. 내 QR을 보여주는 쪽이 더 쉬워요" + `내 QR 보여주기` 버튼을 주 CTA로.
- 하단 바 2버튼: `카드 추가하기`(→ `/scan`), `내 QR 보여주기`(→ `/my_qr`).

### 3.7 `/scan` — 카드 추가 스캔
- `<QrScanner>` 전체화면.
- 인식값에서 `c` 파라미터 추출 → Server Action `addCard(cardToken)`:
  - 토큰으로 상대 participant 조회 (같은 party인지 검증)
  - 자기 자신이면 거부
  - `insert ... on conflict do nothing` (중복 스캔 안전)
  - 삽입 후 해당 참가자의 `auto_cards` 미션 자동 판정 트리거(3.9)
- 성공 시 카드 미리보기 오버레이 → `/card`로 이동, 리스트 최상단에 추가.
- 카메라 앱으로 직접 URL 진입한 경우에도 `/scan?c=...`가 같은 액션을 태운다.

### 3.8 `MissionModal` — 미션
- 상단 중앙: 미션 문구. 그 아래 남은 시간(mm:ss).
- 하단: `성공` / `실패` 버튼. `judge_type='auto_cards'`면 버튼 대신 진행도(`3 / 5명`) 표시.
- Server Action `reportMission(missionId, result)` → `mission_results` upsert.
- 이미 응답했으면 결과 표시 + 닫기만.
- 오픈 트리거: Realtime `missions` INSERT/UPDATE 에서 `status='active'`인 행 수신 시 자동 오픈.

### 3.9 미션 시간표 진행 로직 (`lib/missions.ts`)
서버 크론이 없으므로 **lazy advance** 방식으로 구현한다.
- 모든 미션 조회 시 `advanceParty(partyId)`를 먼저 호출.
- `advanceParty`: 현재 `active` 미션의 `ends_at`이 지났으면 → `done` 처리 + `auto_cards` 자동 판정 기록 → 다음 `pending` 미션을 `active`로 올리고 `started_at/ends_at` 세팅. 지연분만큼 여러 개를 한 번에 넘긴다.
- 호출 지점: `/home` 서버 렌더, 호스트 대시보드, 클라이언트 10초 폴링 엔드포인트 `GET /api/party/[id]/tick`.
- 자동 판정: `auto_cards` 미션은 미션 `started_at` 이후 생성된 카드 수 ≥ `auto_target` 이면 `source='auto', result='success'` 기록.

### 3.10 호스트 화면
- **파티 생성** `/host/new`: 파티명, 호스트 설정 문구, 호스트 PIN. 생성 후 파티 QR(`/enter?p={entry_code}`) 표시 + 다운로드.
- **미션 시간표** `/host/[id]/missions`: 미션 행(내용 / 제한시간 / 판정방식 / 목표 카드수) 추가·삭제·순서 변경(위아래 버튼, dnd는 후순위). 상단에 총 합계 시간과 파티 예정 시간 초과 경고.
- **대시보드** `/host/[id]`: 참가자 수, 총 카드 교환 수, 현재 미션 + 남은 시간, `파티 시작` / `파티 종료` 버튼.
  - **깜짝 미션**: 내용 + 제한 시간 두 칸 → `발행`. 현재 미션을 `done`으로 내리고 `kind='surprise'` 미션을 `active`로. 발행 직후 "남은 시간표가 N분 뒤로 밀립니다" 표시.
- **시상** `/host/[id]/awards`: 카드 수 순위 / 미션 성공 수(auto 우선) 순위 테이블.
- 호스트 인증은 PIN + `htb_host` 쿠키로 간단히.

---

## 4. 작업 순서

### Phase 0 — 셋업
1. `npx create-next-app@latest . --ts --tailwind --app --eslint`
2. 패키지: `@supabase/supabase-js jose bcryptjs qrcode qr-scanner`
3. Supabase 프로젝트 생성 → `.env.local`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`
4. 마이그레이션 실행(Supabase SQL Editor 또는 `supabase db push`)
5. `lib/supabase.ts`, `lib/session.ts` 작성, Vercel에 빈 프로젝트 배포해 HTTPS 확보
   - **HTTPS 필수**: `getUserMedia`는 localhost 외 http에서 동작하지 않는다. 폰 실기기 테스트는 Vercel preview URL로 한다.

### Phase 1 — 인증 & 프로필 (참가 가능 상태)
6. 호스트 파티 생성 최소 화면 + 파티 QR 발급 (참가 테스트를 위해 먼저 필요)
7. `/enter` + `LoginModal` + 세션
8. `/profile` 작성/수정
9. `middleware.ts` 보호 라우트

### Phase 2 — 트랙 A: 인맥 카드 (**MVP 최소 기능**)
10. `QrScanner` 컴포넌트 (권한 거부/카메라 없음 폴백 포함)
11. `/my_qr`
12. `/scan` + `addCard`
13. `/card` 리스트 + 빈 상태
14. `/home` 배너(문구 + 참여 인원)

→ **여기까지가 릴리즈 가능한 최소본.** 미션 없이도 파티에서 쓸 수 있다.

### Phase 3 — 트랙 B: 미션
15. 미션 시간표 작성 화면
16. `advanceParty` 진행 로직 + `/api/party/[id]/tick`
17. Realtime 구독 → `MissionModal` 자동 오픈
18. 홈 `MissionBanner` 상시 노출
19. `auto_cards` 자동 판정

### Phase 4 — 호스트 운영
20. 대시보드(참가자 수·교환 수·현재 미션)
21. 깜짝 미션 발행
22. 시상 집계 화면

### Phase 5 — 마감
23. 모바일 뷰포트 점검(safe-area, 100dvh), 카메라 실기기 테스트(iOS Safari / Android Chrome)
24. 에러 상태: 파티 종료됨 / 잘못된 QR / 중복 카드 / 네트워크 실패
25. Vercel 프로덕션 배포, 환경변수 등록

---

## 5. 리스크와 대응

| 리스크 | 대응 |
|---|---|
| iOS Safari 카메라 권한 거부 시 아무것도 못 함 | 스캔 실패 시 `내 QR 보여주기`로 유도. 교환은 한쪽만 스캔해도 성립하게 설계됨 |
| 파티장 와이파이 불안정 | 카드 추가는 낙관적 UI + 재시도. 미션은 폴링 백업(Realtime 실패해도 10초 내 반영) |
| 크론 없이 미션 자동 발행 | lazy advance + 호스트 대시보드가 열려 있으면 사실상 상시 tick |
| 닉네임 중복 | `unique(party_id, nickname)` — 파티 내에서만 유일 |
| 자기 신고 미션의 시상 왜곡 | `auto_cards`만 시상 집계 (PRD 7장) |
| 서비스 키 노출 | 모든 DB 쓰기는 Server Action에서만. 클라이언트는 anon key로 `missions` select만 |

---

## 6. 환경변수

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # 서버 전용
SESSION_SECRET=                 # 32바이트 랜덤
NEXT_PUBLIC_APP_URL=            # QR에 넣을 절대 URL
```
