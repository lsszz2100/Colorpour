#!/usr/bin/env python3
"""Noto Sans KR 가변 폰트 -> 정적 굵기 3종 + 사용 글자만 서브셋(앱 내장, 오프라인/일관 렌더)."""
import re
import sys
from pathlib import Path

from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options

ROOT = Path(__file__).resolve().parent.parent
# 가변 폰트 원본 위치: 저장소 밖(work/tools/fonts) 우선, 없으면 /tmp
SRC_CANDIDATES = [
    Path("/workspace/work/tools/fonts/NotoSansKR[wght].ttf"),
    Path("/tmp/noto_test.ttf"),
]
SRC_VAR = next((p for p in SRC_CANDIDATES if p.exists()), SRC_CANDIDATES[0])
OUT = ROOT / "app/src/main/assets/fonts"
WEIGHTS = {"Regular": 400, "Bold": 700, "Black": 900}

# 앱에서 쓰는 문자 집합: 게임 소스의 모든 비ASCII 문자 + ASCII 전체 + 자주 쓰는 추가 문자
EXTRA = (
    "가나다라마바사아자차카타파하"
    "레벨 이동 되돌리기 힌트 튜브 추가 다시 완료 다음 선택 게임 방법 설정 사운드 진동 닫기 확인 취소 "
    "광고 보고 충전 빈 개 무한 모드 스테이지 별 잠금 오류 저장 시작 이어서 하기 첫 화면 "
    "같은 색 볼 정렬 퍼즐 두뇌 오프라인 데이터 필요 없는 킬링타임 컬러 소트 물감 붓기 완성 "
    "초 중 고 난이도 점수 기록 최고 신기록 남은 횟수 사용"
)


def collect_chars():
    chars = set(EXTRA)
    for p in [ROOT / "app/src/main/assets/game.js", ROOT / "app/src/main/assets/index.html"]:
        txt = p.read_text(encoding="utf-8")
        chars.update(ch for ch in txt if ord(ch) > 127)
    chars.update(chr(c) for c in range(32, 127))
    chars.update("·…—–‘’“”→←↑↓★☆✓✕×")
    return chars


def main():
    if not SRC_VAR.exists():
        sys.exit("가변 폰트가 없습니다: " + str(SRC_VAR) + " (먼저 내려받으세요)")
    OUT.mkdir(parents=True, exist_ok=True)
    chars = collect_chars()
    print("글자 수:", len(chars))

    for name, wght in WEIGHTS.items():
        font = TTFont(str(SRC_VAR))
        inst = instantiateVariableFont(font, {"wght": wght}, updateFontNames=True)
        opts = Options()
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.name_legacy = True
        opts.name_languages = ["*"]
        opts.notdef_outline = True
        opts.recalc_bounds = True
        opts.drop_tables += ["DSIG"]
        sub = Subsetter(options=opts)
        sub.populate(text="".join(sorted(chars)))
        sub.subset(inst)
        out_path = OUT / f"NotoSansKR-{name}.ttf"
        inst.save(str(out_path))
        print(f"{out_path.name}: {out_path.stat().st_size/1024:.1f} KB")


if __name__ == "__main__":
    main()
