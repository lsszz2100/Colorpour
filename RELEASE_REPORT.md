# Color Pour: 볼 정렬 퍼즐 — 프로덕션 출시 기록 (2026-11-21)

## 결과
- **프로덕션 트랙 심사 제출 완료** — 상태: `검토 중` (전체 출시, 관리형 게시 사용 안 함 → 승인되면 자동 게시)
- Play Console 앱 대시보드: https://play.google.com/console/u/0/developers/6206601257239653266/app/4975087410917250020/app-dashboard
- 프로덕션 트랙: https://play.google.com/console/u/0/developers/6206601257239653266/app/4975087410917250020/tracks/4698541881804175818

## 제출된 버전
| 항목 | 값 |
|---|---|
| 패키지 | `com.mrlee.colorpour` |
| 버전 코드 | **2** |
| 버전 이름 | 1.0.0 |
| 출시 이름 | 1.0.0 최초 출시 |
| minSdk / targetSdk / compileSdk | 24 / **36** / 36 |
| AAB | `downloads/app-release-v2.aab` (3.7MB, 서명 확인 · 인증서 만료 2054-04-08) |
| 국가/지역 | 178개(177개 국가/지역 + 기타 국가), 지원 기기 19,506대 |
| 출시 노트 | 첫 출시! 120개 스테이지와 무한 모드를 즐겨보세요. 되돌리기·힌트·튜브 추가로 끝까지 도전할 수 있습니다. |

### 왜 versionCode 2로 다시 빌드했나
Play Console이 **"앱이 API 수준 35를 타겟팅하고 있는데 최신 API 수준 36 이상을 타겟팅해야 함"** 오류로 제출을 차단했다.
- 수정 범위: `app/build.gradle` (`compileSdk 35→36`, `targetSdk 35→36`, `versionCode 1→2`) + `gradle.properties`(`android.suppressUnsupportedCompileSdk=36`)
- 게임 코드·리소스·애셋은 변경하지 않음
- 기존 업로드 키 그대로 사용: `work/secrets/colorpour-release.keystore` (alias `colorpour`) → Play 앱 서명 키 연속성 유지
- 로컬 SDK에 `platforms;android-36`, `build-tools;36.0.0` 설치 후 `gradle bundleRelease`로 빌드
- **주의: 이 변경은 아직 git 커밋/푸시하지 않았다.** 저장소(https://github.com/lsszz2100/Colorpour)의 소스가 실제 출시본과 다르므로, 다음 빌드 전에 커밋이 필요하다. (원격 main에는 `.github/workflows/release.yml`이 없음 — 이전 푸시 때 GitHub App의 workflows 권한 때문에 제외됨)

## 완료한 Play Console 항목
1. **판매자 상태** — 개발자 계정이 '판매자'로 선언되어 있어 앱도 판매자 상태 적용(예)으로 저장.
2. **앱 카테고리 · 태그** — 게임 > 퍼즐 / 태그: 두뇌 게임 · 캐주얼 · 퍼즐.
3. **연락처 세부정보** — 이메일 `leemanrank@gmail.com`, 웹사이트 `https://lsszz2100.github.io/colorpour-privacy/`. 전화번호는 공개 항목이라 비워 둠.
4. **기본 스토어 등록정보(ko-KR)** — `STORE_LISTING.md` 문구 그대로.
   - 앱 이름: Color Pour: 볼 정렬 퍼즐 / 간단한 설명 43자 / 자세한 설명 746자(줄바꿈 유지)
   - 아이콘 512×512, 피처 그래픽 1024×500
   - 휴대전화 스크린샷 5장(순서: 홈 → 레벨 선택 → 게임 플레이 → 고난도 → 클리어)
   - AI 애셋 라벨: '지정 안 함'(아이콘·피처 그래픽은 Pillow 절차 생성, 스크린샷은 앱 화면 캡처)
5. **광고 ID 선언** — 사용함 / 용도: 광고 또는 마케팅 (AdMob 사용과 일치). 이 항목이 없어 제출이 한 번 차단되었다.
6. **국가/지역** — 177개 + 기타 국가.
7. **폼 팩터 경고(세로 화면 필수)** — 세로 전용 설계이므로 '앱을 대대적으로 변경해야 함' 사유로 무시(가로·데스크톱·XR 기기 설치 제한만 남음).

## AdMob
- 앱 ID: `ca-app-pub-8038365558937817~2220999802`
- 배너: `ca-app-pub-8038365558937817/4696401169`
- 전면: `ca-app-pub-8038365558937817/1657680992`
- 보상형: `ca-app-pub-8038365558937817/4615016822`

## 개인정보처리방침
- https://lsszz2100.github.io/colorpour-privacy/ — 2026-11-21 확인 시 HTTP 200 정상.

## 증거 스크린샷 (work/colorpour/release-evidence/)
- `in-review-final-2026-11-21-212847.png` — 게시 개요 '검토 중인 변경사항'
- `production-track-full-2026-11-21-212910.png` — 프로덕션 트랙: 활성 / 1.0.0 최초 출시 검토 중 / 국가·지역 178개
- `release-v2-summary-2026-11-21-212923.png` — 버전 코드 2, 국가/지역 178, 지원 기기 19,506
- `dashboard-in-review-2026-11-21-212937.png` — 앱 대시보드: 업데이트 상태 '검토 중'
- `publishing-overview-submitted-2026-11-21-211707.png` — 제출 직후(빠른 검사 진행 중)
- `store-listing-state-2026-11-21-205550.png` — 스토어 등록정보 5장 업로드 상태

## 승인 후 할 일
- 승인되면 자동 게시 → `https://play.google.com/store/apps/details?id=com.mrlee.colorpour` 활성화(현재는 미게시라 404).
- 마케팅 실행안: `STORE_LISTING.md` 하단 7개 항목 참고.
- 2주 간격 레벨 20개 추가 업데이트 계획.
