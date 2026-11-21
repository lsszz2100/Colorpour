# 제3자 리소스 및 라이선스 (Third-party notices)

이 프로젝트는 아래 리소스/라이브러리를 사용하거나 참고했습니다. 게임 코드(HTML5 Canvas 엔진,
레벨 생성기, Android 래퍼)는 자체 작성물이며 아래 저장소의 코드를 복사하지 않았습니다.

## 앱에 포함된 제3자 리소스

| 리소스 | 저작자 | 라이선스 | 사용 형태 |
|---|---|---|---|
| Noto Sans KR | Google / Adobe | SIL Open Font License 1.1 | `app/src/main/assets/fonts/` 서브셋 (OFL 1.1은 앱에 임베드·재배포 허용) |
| Google Mobile Ads SDK (AdMob) | Google LLC | Google APIs Terms of Service | `com.google.android.gms:play-services-ads` |
| AndroidX Core / Activity / WebKit | Android Open Source Project | Apache License 2.0 | Gradle 의존성 |

## 구조·규칙 참고(코드 미복사)

| 저장소 | 라이선스 | 참고한 부분 |
|---|---|---|
| https://github.com/316k/android-tap-the-black-tiles | MIT | HTML5 게임을 `assets/` + WebView 로 감싸는 앱 구조 |
| https://github.com/tjwood100/ball-sort-puzzle-solver | MIT | 볼 소트 상태 모델과 풀이 가능성 검증 방식 |
| https://github.com/GlobalCreativeCommunityFounder/WATER_SORT_PUZZLE | MIT | 붓기 규칙(같은 색/용량) 정의 |

MIT 라이선스 고지는 원 저작자에게 귀속됩니다. 위 저장소들의 코드는 이 앱에 포함되어 있지 않으며,
레벨 데이터와 게임 엔진은 `tools/gen_levels.py` 및 `app/src/main/assets/game.js`에서 자체 구현했습니다.
