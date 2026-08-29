---
name: judge
description: Run the 9-persona hackathon judge (창업자 3·엔지니어 3·투자자 3) against a live web app. An exploring subagent drives the app interactively (no per-app selector scripts needed), 9 persona subagents score independently from that evidence, aggregation is computed deterministically, and an HTML report is published.
---

# 9인 심사위원단 자동 채점 (`/judge`)

이 스킬은 `심사 페르소나 정의서`를 그대로 코드화한 것입니다. 사람이 대신 읽어서 점수를 매기는 대신, 라이브 웹앱을 실제로 조작해 증거를 모으고, 9명의 독립된 페르소나가 그 증거만 보고 채점하고, 합산은 스크립트가 계산합니다.

**중요: 앱마다 미리 selector 스크립트를 작성하지 않는다.** 사이트마다 구조가 다르므로, 핵심 플로우를 사전에 코드화하는 대신 탐색 서브에이전트가 `browser-step.mjs`로 한 번에 한 액션씩 페이지를 읽고 판단하며 진행한다 (아래 2단계).

## 참조 파일
- `rubric.json` — 고정 가중치, 0~5 점수 스케일, 채점 규율(4.5), 등급 기준(4.3). **채점의 유일한 출처.**
- `personas.json` — 9인의 배경·관심 항목·질문·킬러 질문·레드플래그·5점 조건·채점 편향·`evidenceNeeds`(탐색 시 특히 확인해야 할 것).
- `scripts/collect-evidence.mjs` — 사전 설정 없이 돌아가는 콜드오픈 패스(랜딩 데스크톱/모바일 스크린샷, 로드 타이밍, 콘솔/네트워크 에러). 앱 구조를 몰라도 항상 먼저 실행.
- `scripts/browser-step.mjs` — 탐색 서브에이전트가 실제 앱을 조작하는 범용 도구. 한 번 호출할 때마다 액션 하나를 수행하고, 현재 페이지의 클릭 가능한 요소 목록(역할+이름+locator)과 스크린샷·본문 텍스트·진단 정보를 돌려준다. 세션(쿠키·로그인 상태·열린 탭)은 백그라운드 데몬 프로세스가 붙잡고 있어서 별도 CLI 호출 사이에도 유지된다 — 스크립트 상단 주석에 사용법 전체가 있음.
- `scripts/aggregate.mjs` — 9인 채점 JSON을 읽어 4.1~4.5 산식을 그대로 계산. **점수 합산은 항상 이 스크립트로 하고, 암산이나 LLM 추정으로 대체하지 않는다.**

## 인자 파싱
`args`에서 다음을 파싱한다:
- `--url <url>` (필수).
- `--plan <path[,path...]>` (선택) — 발표/기획 자료. A3·F3·I1 채점에 사용. 없으면 A3는 전원 `score:0, reason:"제시되지 않음"`(rubric.json에 이미 명시돼 있어 그대로 전달하면 자동 반영됨).
- `--weighted` (선택) — 4.2 전문성 가중 모드를 최종 등급 기준으로 사용. 기본은 동일 가중.
- 로그인이 필요하면 탐색 서브에이전트에게 계정 정보를 프롬프트에 그대로 전달한다(별도 플래그 불필요 — `fill-text`로 그때그때 입력하면 됨).

`--url` 없이 호출되면 URL을 먼저 물어본다.

## 실행 순서

### 1. 실행 폴더 준비
`judge-reports/<YYYYMMDD-HHmm>/` 형태로 run 폴더를 만든다. 이하 모든 산출물은 이 아래에 쓴다.

### 2. 콜드오픈 증거 수집
```
node .claude/skills/judge/scripts/collect-evidence.mjs --url <URL> --out judge-reports/<RUN>/coldopen
```
`judge-reports/<RUN>/coldopen/evidence.json`과 스크린샷을 Read로 확인한다.

### 3. 핸즈온 탐색 (서브에이전트 1개, Agent 도구)
`general-purpose` 서브에이전트를 하나 띄워 앱을 직접 조작하며 증거를 모으게 한다. **이 서브에이전트에게 selector를 미리 알려주지 않는다** — `browser-step.mjs`의 각 호출이 현재 페이지의 클릭 가능한 요소 목록을 반환하므로, 그걸 읽고 다음 행동을 그때그때 정하라고 지시한다.

프롬프트에 반드시 포함할 것:
1. `scripts/browser-step.mjs` 파일 상단 주석(사용법 전체)을 먼저 Read로 읽으라고 지시.
2. 목표 URL과, 로그인이 필요하면 계정 정보.
3. 반드시 수행할 체크리스트 (각 항목이 어떤 채점 코드에 쓰이는지 명시해 서브에이전트가 왜 하는지 알게 한다):
   - **핵심 플로우 파악·완주** (A1): 온보딩부터 핵심 액션, 결과 확인까지 클릭/입력으로 끝까지 도달. 중간에 막히면 어디서 왜 막혔는지 기록.
   - **같은 세션에서 동일 입력 반복 제출 2~3회** (A2/E2): 결과가 매번 같은지 다른지, 다르면 얼마나 다른지 텍스트로 비교.
   - **완전히 새 세션(다른 `--state` 디렉터리)으로 처음부터 1회 재실행** (A1/E1): "새 계정으로 다시 돌려봐 주세요" 검증.
   - **핵심 플로우 중간에 `--reload`** (A3/A4/E3): 상태가 유지되는지, 어디로 돌아가는지.
   - **완료 후 `--back`** (A4/E3): 뒤로가기 시 상태 유실 여부.
   - **모바일 세션 하나 추가로 열기** (`--mobile` 옵션으로 별도 `--state`) (A4/E3): 레이아웃 깨짐 여부.
   - **`--block "**/api/**"` 등으로 네트워크 강제 실패 후 핵심 액션 시도** (E1): 에러 화면이 있는지, 무한 로딩인지.
   - **이상한/빈 입력값 제출** (A4): 에러 처리, 빈 상태 카피.
   - **화면에 보이는 텍스트로 타깃 고객·수익모델·확산구조 관련 단서(가격 페이지, 초대 기능, 소개 문구 등) 확인** (B1~B4, C1~C4 — 있으면 기록, 없으면 없다고 명시).
4. 사용한 모든 `--state` 세션 디렉터리를 **끝나면 반드시 `--stop`으로 종료**하라고 지시(백그라운드 크로미움 프로세스가 남지 않도록).
5. 출력: 위 체크리스트 각 항목에 대해 관찰한 사실을 요약한 텍스트 보고서를 작성해 `judge-reports/<RUN>/explore-notes.md`에 Write로 저장하라고 지시(스크린샷 경로와 근거 인용 포함). `evidence.json`은 각 세션 디렉터리에 자동으로 누적되므로 그 경로들도 명시해 남긴다.

탐색이 끝나면 `judge-reports/<RUN>/explore-notes.md`와 각 세션의 `evidence.json`/`screenshots/`를 Read로 확인한다.

### 4. 기획 자료 확인 (있는 경우)
`--plan` 파일들을 Read로 읽어 원문을 확보한다. 요약·재해석하지 말 것(4.5 "사실 인용은 자료 그대로").

### 5. 9인 독립 채점 (병렬 서브에이전트)
`personas.json`의 9개 페르소나 각각에 대해 `Agent`를 **한 메시지 안에서 9개 동시 호출**한다(`run_in_background: false` — 다음 단계인 합산이 9개 결과 전부에 의존하고 그 사이 할 일이 없으므로). 순차 호출 금지 — 속도 문제이기도 하지만, 서로 다른 서브에이전트가 서로의 출력을 볼 수 없어야 "서로의 점수를 모르는 상태"(4.1)가 지켜진다.

각 서브에이전트 프롬프트에 반드시 포함:
1. 해당 페르소나 전체 정의(personas.json 그대로).
2. `rubric.json` 전체(스케일, 12항목 정의, 채점 규율 5개, 출력 스키마 예시) — 발췌 없이 그대로.
3. `judge-reports/<RUN>/coldopen/evidence.json` + 스크린샷 경로, `judge-reports/<RUN>/explore-notes.md` + 탐색 세션들의 `evidence.json`/스크린샷 경로. **반드시 Read(이미지 포함)로 직접 열어보고 채점하라고 지시** — "본 것만 채점한다"를 이 세션에도 적용.
4. `--plan` 원문(있으면) / 없으면 "기획 자료 미제공 — A3는 rubric.json 정의에 따라 처리".
5. **Write 도구로 `judge-reports/<RUN>/scores/<judge_id>.json`에 rubric.json의 outputSchemaExample과 정확히 같은 구조로 저장**하라는 지시. 12개 코드 전부, 각 항목에 confidence·reason(1문장)·evidence(스크린샷 파일명/탐색노트 인용 등 구체적 근거) 포함. `red_flags`, `killer_question`(이 제품에 맞게 구체화), `one_line_verdict`(총 3문장: 잘한 것 1/가장 큰 구멍 1/다음 할 일 1)까지.
6. 다른 8명의 결과를 보거나 참고하지 말 것.

서브에이전트 타입은 `general-purpose`로 충분하다.

### 6. 검증
`judge-reports/<RUN>/scores/`에 9개 파일(F1,F2,F3,E1,E2,E3,I1,I2,I3)이 모두 있는지 확인. 누락되면 재실행.

### 7. 합산 (스크립트, 암산 금지)
```
node .claude/skills/judge/scripts/aggregate.mjs --scores judge-reports/<RUN>/scores --out judge-reports/<RUN>/aggregate.json [--weighted]
```
콘솔의 두 총점(equal/weighted)과 경고를 확인. `warnings`가 있으면 해당 서브에이전트 결과를 고쳐 재합산. `dissentItems`(표준편차 ≥1.2)는 리포트에서 최고점자·최저점자 근거를 그대로 남긴다(4.5).

### 8. 리포트 아티팩트 발행
HTML 작성 전 **`artifact-design` 스킬을 반드시 로드**(항목이 많으므로 `dataviz` 스킬도 참고). 리포트 필수 포함 항목:
- 최종 등급(S/A/B/C/D)과 100점 총점 — `aggregate.json` 값 그대로(재계산 금지). `total.reportBoth`가 true면 equal/weighted 둘 다.
- 대분류(A/B/C) subtotal + 12개 세부 항목 점수(9인 평균 + 표준편차).
- 소수 의견: `dissentItems`는 최고점자/최저점자 reason+evidence 나란히.
- 9인 각각의 킬러 질문·레드플래그·3문장 총평(페르소나 이름과 함께).
- 탐색 단계에서 확인 못한 항목이 있으면(예: 로그인 실패로 핵심 플로우 미도달) 상단에 명시.
- 근거로 인용된 스크린샷은 가능하면 이미지로 삽입.

`Artifact` 도구로 발행하고 URL을 사용자에게 전달한다.

## 하지 말 것
- 앱별 selector를 이 스킬 파일이나 대화 중에 미리 하드코딩하지 않는다 — 탐색은 항상 그때그때 판단.
- 합산 수치를 LLM이 암산하지 않는다 — `aggregate.mjs` 출력을 그대로 인용.
- 서브에이전트 프롬프트에서 페르소나 편향을 "보정"하지 않는다(짠 사람은 짜게 나오는 게 정상).
- 기획 자료가 없는데 A3에 점수를 지어내지 않는다.
- 탐색 서브에이전트가 세션을 열어두고 `--stop`을 안 부르면 크로미움 프로세스가 계속 남는다 — 항상 정리하게 한다.
