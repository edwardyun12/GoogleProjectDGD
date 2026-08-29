# Networking Party UI Mockups

`PRD.md`의 참가자/호스트 화면을 `Design.png`의 다크 모바일 UI 톤으로 시각화한 이미지 세트입니다.

## Participant

1. `01-enter.png` — 파티 QR 입장
2. `02-login-modal.png` — 로그인/회원가입 모달
3. `03-profile-account.png` — 프로필 1단계: 계정
4. `04-profile-details.png` — 프로필 2단계: 상세 정보
5. `05-photo.png` — 카드 사진 등록
6. `06-home.png` — 홈과 진행 중 미션
7. `07-my-qr.png` — 내 QR 보여주기
8. `08-card-collection.png` — 인맥 카드 컬렉션
9. `09-card-empty.png` — 인맥 카드 빈 상태
10. `10-mission-matching.png` — 매칭 미션(자동 판정)
11. `11-mission-general.png` — 일반 미션(자기 신고)

## Host

12. `12-host-party-create.png` — 파티 생성
13. `13-host-mission-timeline.png` — 미션 시간표 작성
14. `14-host-dashboard.png` — 진행 중 파티 대시보드
15. `15-host-awards.png` — 종료 후 시상/베네핏 지급

## Prompt system

- Use case: `ui-mockup`
- Output: 단일 세로 모바일 화면, 디바이스 프레임 없는 하이파이 제품 UI
- Style reference: `Design.png`
- Consistency reference: 승인된 `06-home.png`, 호스트 화면은 `13-host-mission-timeline.png`도 함께 참조
- Palette: near-black `#0B0B0B`, charcoal `#171717`, acid yellow `#F4FF3D`, electric cobalt `#2626A8`, muted khaki `#B7AA8A`
- UI language: 촘촘한 한국어 산세리프, 강한 비대칭 기하 형태, 각진 카드, 얇은 웜 그레이 구분선, 제한적인 라운드
- Constraints: 한 이미지에 한 화면, 실사용 가능한 정보 계층, 한글 카피, 로고/워터마크/폰 프레임 제외
- Screen content: 각 파일명에 대응하는 `PRD.md` 요구사항과 상태/판정 방식 적용

## Implementation note

`07-my-qr.png`의 QR은 시안용 그래픽입니다. 실제 앱에서는 참가자/파티 식별값을 담은 동적 QR로 교체해야 합니다.
