# Color Pour: 볼 정렬 퍼즐 (Color Pour — Ball Sort Puzzle)

오프라인으로 즐기는 캐주얼 볼 정렬 퍼즐 게임입니다. 같은 색 볼 4개를 한 튜브에 모으면 완성됩니다.

- **장르**: 퍼즐 (볼/컬러 정렬)
- **플랫폼**: Android (`minSdk 24`, `targetSdk 35`)
- **패키지**: `com.mrlee.colorpour`
- **특징**: 120개 스테이지 + 무한 모드, 되돌리기/힌트/튜브 추가, 웹오디오 사운드·진동, 네온 글래스 UI, 완전 오프라인(게임 데이터는 기기 저장소에만)

## 구조

```
app/src/main/assets/        게임 본체 (HTML5 Canvas, 외부 라이브러리 없음)
  index.html                화면/폰트/캔버스
  game.js                   게임 엔진·UI·광고 브리지
  levels.js                 검증된 120개 레벨 데이터(생성 스크립트 산출물)
  fonts/                    Noto Sans KR 서브셋 (오프라인 렌더)
app/src/main/java/com/mrlee/colorpour/MainActivity.kt
                            WebView 호스트 + AdMob(배너/전면/보상형) 연동
tools/gen_levels.py         레벨 생성 + 솔버 검증 (파이썬)
tools/make_graphics.py      스토어 아이콘·피처 그래픽 생성
tools/make_fonts.py         한글 폰트 서브셋 생성
tests/logic.test.js         게임 로직 헤드리스 테스트 (node)
.github/workflows/release.yml  서명된 .aab 빌드 (GitHub Actions)
```

## 빌드

로컬/GitHub Actions 모두 JDK 17 + Android SDK 35가 필요합니다.

```bash
./gradlew bundleRelease      # 서명은 환경변수로 주입
```

필요한 환경변수(로컬에서 서명 빌드할 때만):

```
KEYSTORE_PATH=/absolute/path/release.keystore
KEYSTORE_PASSWORD=...
KEY_ALIAS=colorpour
KEY_PASSWORD=...
```

> 서명 키와 비밀번호는 저장소에 커밋하지 않습니다. GitHub Actions에서는 `KEYSTORE_BASE64`,
> `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` 시크릿으로만 전달합니다.

## 테스트

```bash
node tests/logic.test.js          # 120개 레벨 풀이 검증·붓기 규칙·힌트·되돌리기·무한 모드
python3 tools/gen_levels.py --levels 120   # 레벨 재생성(모두 풀 수 있음을 검증)
```

## 광고

- 배너: 하단 고정(조작 UI와 분리)
- 전면: 레벨 클리어 후 다음 레벨로 넘어갈 때만, 최소 45초 간격
- 보상형: 되돌리기·힌트 충전, 빈 튜브 추가(사용자가 선택할 때만)

## 라이선스

이 게임 코드는 MIT 라이선스입니다. 폰트 등 제3자 리소스는 `THIRD_PARTY_LICENSES.md`를 참고하세요.
