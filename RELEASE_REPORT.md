# Color Pour: 볼 정렬 퍼즐 — v1.1.0 업데이트 기록 (2026-11-24)

## 결과
- **프로덕션 트랙 심사 제출 완료** — 2026-11-24 03:29 KST, 상태 `검토 중인 변경사항` (전체 출시 100%, 178개국, 관리형 게시 사용 안 함 → 승인 시 자동 게시)
- 게시 개요: https://play.google.com/console/u/0/developers/6206601257239653266/app/4975087410917250020/publishing
- 프로덕션 트랙: https://play.google.com/console/u/0/developers/6206601257239653266/app/4975087410917250020/tracks/4698541881804175818
- 증빙: `work/colorpour/update-submitted.png` (검토 중인 변경사항 6건)

## 제출된 버전
| 항목 | 값 |
|---|---|
| 패키지 | `com.mrlee.colorpour` |
| 버전 코드 | **3** (이전 프로덕션 2) |
| 버전 이름 | **1.1.0** |
| 출시명 | 1.1.0 데일리 퍼즐·테마 업데이트 |
| minSdk / targetSdk / compileSdk | 24 / **36** / 36 |
| AAB | `downloads/ColorPour-v1.1.0.aab` (3.93MB, `jarsigner -verify` → jar verified, 업로드 키 `colorpour` 유지) |
| 출시 노트 | KR: 새 기능! 매일 바뀌는 '오늘의 퍼즐'과 연속 기록, 별로 여는 배경 테마 5종, 콤보 이펙트… / EN: New! A daily puzzle with streak rewards, 5 unlockable color themes… |

## 적용한 보안·정책 개선
1. **Google UMP SDK 3.2.0** 추가 — `MobileAds.initialize` 전에 `requestConsentInfoUpdate` → `loadAndShowConsentFormIfRequired` → `canRequestAds()`일 때만 광고 초기화. EEA/영국 등에서만 양식 표시.
2. **광고 동의 재설정** — 설정 화면에 `광고 동의 설정` 행(UMP `showPrivacyOptionsForm`), `isPrivacyOptionsRequired()`가 true인 지역에서만 노출. JS 브리지 `showPrivacyOptions`/`isPrivacyOptionsRequired` 추가.
3. **개인정보처리방침 링크** — 설정에서 기본 브라우저로 `https://lsszz2100.github.io/colorpour-privacy/` 열기(`openPrivacyPolicy`, 허용 URL 상수 고정).
4. **WebView 하드닝**
   - `allowFileAccess=false`, `allowContentAccess=false`, `allowFileAccessFromFileURLs=false`, `allowUniversalAccessFromFileURLs=false` 유지
   - `mixedContentMode=MIXED_CONTENT_NEVER_ALLOW`, `saveFormData=false`, `setGeolocationEnabled(false)`, `setSupportMultipleWindows(false)`
   - **`shouldInterceptRequest`: appassets 외 http/https 요청은 403으로 차단** (네트워크 유출·외부 리소스 차단)
   - `shouldOverrideUrlLoading = true` (외부 이동 차단), `onRenderProcessGone` 처리(렌더러 크래시 시 화면 재생성)
   - `WebView.setWebContentsDebuggingEnabled(false)` (릴리스), 종료 시 `removeJavascriptInterface`+`destroy`
5. **매니페스트** — `allowBackup=false`, `fullBackupContent=false`, `usesCleartextTraffic=false`, 권한은 INTERNET/ACCESS_NETWORK_STATE/AD_ID/VIBRATE만, exported 컴포넌트는 런처 액티비티 1개.
6. **의존성** — AdMob이 끌어오던 구버전 `androidx.fragment` 대신 1.8.5 고정(Play Console "오래된 SDK" 권장 조치 대응).
7. 시크릿은 여전히 저장소 밖(`work/secrets/`)에만 존재, 커밋에 포함되지 않음.

## 추가한 재미·리텐션 기능
1. **오늘의 퍼즐(데일리 챌린지)** — 날짜를 시드로 생성되는 고정 퍼즐(모두 같은 배치), 매일 자정 갱신. 클리어 시 별 1~3개 + 연속 일수 갱신, 홈 카드에 달력 아이콘·연속 배지·완료 표시.
2. **연속 스트릭** — 어제 완료 시 +1, 끊기면 1부터. 최고 연속 기록 저장.
3. **별 수집 + 테마 5종** — 레벨·데일리 별 합계로 네온 퍼플(0) → 선셋 오렌지(24) → 오션 블루(72) → 포레스트 민트(150) → 캔디 핑크(240) 해금. 배경 그라데이션·글로우·버튼 강조색이 함께 바뀜.
4. **콤보 이펙트** — 튜브를 연달아 완성하면 "콤보 ×N" 표시 + 색상 파티클 버스트 + 진동.
5. **레벨별 최고 기록** — 최고 이동 수 저장, 레벨 선택 화면에 "최고 N수" 표시, 클리어 화면에 최고 기록 병기.
6. **홈 진행률** — "★ n / 360 · 테마 x / 5" + 다음 테마까지 남은 별 게이지 바.
7. **기타** — 설정에 테마 진입, 게임 방법에 데일리·테마 안내 2줄 추가, EN 런처 이름(`Color Pour: Ball Sort`) 추가.

## ASO 변경 요약
| 항목 | 이전 (v1.0.0) | 이후 (v1.1.0) |
|---|---|---|
| ko-KR 제목 | Color Pour: 볼 정렬 퍼즐 (19자) | **Color Pour: 볼 정렬·물 정렬 퍼즐** (24자) |
| ko-KR 간단 설명 | 인터넷 없이 즐기는 오프라인 볼 정렬 퍼즐… (43자) | **인터넷 없이 즐기는 볼 정렬·물 정렬 퍼즐! 색을 맞추는 컬러 소트 두뇌 게임, 오늘의 퍼즐에 도전하세요.** (59자) |
| ko-KR 자세한 설명 | 746자 | **1,079자** (새 기능 섹션 + 물 정렬·워터소트·컬러 소트 키워드) |
| en-US 등록정보 | **없음(한국어만)** | **신규 추가** — Color Pour: Ball Sort Puzzle / Relaxing offline ball sort & water sort puzzle. Sort colors, train your brain! (78자) / 상세 1,542자 |
| 스크린샷 | 5장(v1.0.0 화면) | **7장 새로 렌더** (홈·레벨·플레이·고난도·오늘의 퍼즐·테마·클리어), 1080×1920 |
| 릴리스 노트 | 1.0.0 최초 출시 | EN/KR 신기능 안내 |

전체 문구 원본: `STORE_LISTING.md`

## 검증
| 검증 | 결과 |
|---|---|
| 헤드리스 로직 테스트 `node tests/logic.test.js` | **26/26 PASS** — 120레벨 전량 풀이, 붓기 규칙 6종, 힌트, 되돌리기, 무한 모드 12종, 데일리 생성·결정성·풀이 가능, 스트릭 증가/끊김/중복 지급 방지, 별 합계, 테마 해금 기준, 최고 기록 |
| 헤드리스 실플레이 QA `node tools/qa/qa.js` | **20/20 PASS** — 부팅, 데일리 카드 탭→실제 13수 완주, 클리어 저장, 테마 선택, 레벨 14 실완주(13/13), 보상형 광고 경로(웹 대체·Android 브리지 양쪽), UMP 동의 행 호출, 힌트, 뒤로가기, 무한 모드, 스크린샷 13장. **스크립트 오류 0건** |
| 실브라우저(Chrome) | jsDelivr/htmlpreview로 실제 배포 소스 로드 → 홈·게임 방법·오늘의 퍼즐 진입·튜브 선택·붓기(이동 수 1)까지 정상 렌더/동작 확인 |
| 폰트 글리프 | 새 문구의 모든 비ASCII 문자 3굵기 모두 글리프 존재(누락 0) — 서브셋 재생성 |

## 발견·수정한 위험
- **폰트 서브셋 누락**: 앱 폰트가 v1.0.0 문구 기준 서브셋이라 새 문구("매일", "바뀌는", "최대", "연속" 등)가 두부(□)로 깨질 상태였다. `tools/make_fonts.py`로 Noto Sans KR에서 재생성(각 116KB)하고 글리프 커버리지를 자동 확인.
- **웹 미리보기 보상 미지급**: 앱 밖(브리지 없음)에서 보상형 광고 버튼이 아무것도 주지 않던 경로를 `grantReward` 직접 호출로 수정(앱 동작은 기존과 동일).

## AdMob
- 앱 `ca-app-pub-8038365558937817~2220999802` — 승인 상태 **준비됨**, 상태 세부정보 "광고 게재 사용 설정됨", 스토어 **Google Play / com.mrlee.colorpour** 연결, 광고 단위 3개 운영 중 (배너 `4696401169`, 전면 `1657680992`, 보상형 `4615016822`). 테스트 광고 ID 사용 없음.

## 저장소
- `lsszz2100/Colorpour` main 커밋 `d3e7eb6` — v1.1.0 소스·테스트·QA 하네스·ASO 문서 푸시 완료(시크릿 제외, `.github/workflows`는 GitHub App 권한 문제로 제외 유지).

## 남은 일
- 심사 승인 대기 → 승인 시 자동 게시. `🎮-color-pour-심사-승인-및-admob-연결` 스케줄이 감시.
- en-US 스크린샷은 기본(ko-KR) 그래픽을 상속 중 — 영어 캡션 이미지(`qa-shots/en-*.png`)를 업로드하면 전환율 개선 여지.
- 앱 내 UI 문구는 한국어 단일 — 영어 UI 현지화는 차기 과제.
