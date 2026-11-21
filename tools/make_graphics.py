#!/usr/bin/env python3
"""Color Pour 스토어 그래픽/런처 아이콘 생성 (Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT_STORE = ROOT / "assets-src"
RES = ROOT / "app/src/main/res"
FONT = ROOT / "app/src/main/assets/fonts"

PALETTE = [
    ("#FF4D5E", "#FF8E96"),
    ("#FF8A3D", "#FFB47A"),
    ("#FFD166", "#FFE49B"),
    ("#A3E635", "#C8F582"),
    ("#34D399", "#7DEBC0"),
    ("#22D3EE", "#8CE7F6"),
    ("#3B82F6", "#87B4FF"),
    ("#8B5CF6", "#BE9BFF"),
    ("#EC4899", "#FF90C6"),
    ("#94A3B8", "#C9D4E0"),
    ("#A16207", "#D19A3F"),
]


def hx(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def font(size, weight="Bold"):
    path = FONT / f"NotoSansKR-{weight}.ttf"
    return ImageFont.truetype(str(path), size)


def linear_gradient(size, c1, c2, angle=45):
    w, h = size
    base = Image.new("RGB", (w, h), c1)
    top = Image.new("RGB", (w, h), c2)
    mask = Image.new("L", (w, h))
    md = mask.load()
    # 대각선 그라디언트
    for y in range(h):
        for x in range(0, w, 4):
            v = int(255 * ((x / max(1, w)) * 0.5 + (y / max(1, h)) * 0.5))
            for k in range(4):
                if x + k < w:
                    md[x + k, y] = v
    base.paste(top, (0, 0), mask)
    return base


def glow(img, xy, radius, color, alpha=110, blur=90):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x, y = xy
    d.ellipse([x - radius, y - radius, x + radius, y + radius], fill=color + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    img.alpha_composite(layer)


def ball_layer(size, colors, gap_ratio=0.0):
    """구슬 하나를 RGBA 이미지로."""
    d = size
    img = Image.new("RGBA", (d, d), (0, 0, 0, 0))
    c1, c2 = hx(colors[0]), hx(colors[1])
    # 그림자
    sh = Image.new("RGBA", (d, d), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse([d * 0.12, d * 0.16, d * 0.88, d * 0.92], fill=(0, 0, 0, 90))
    sh = sh.filter(ImageFilter.GaussianBlur(d * 0.05))
    img.alpha_composite(sh)
    # 본체 (세로 그라디언트를 원형 마스크로)
    body = linear_gradient((d, d), c2, c1)
    mask = Image.new("L", (d, d), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, d - 1, d - 1], fill=255)
    img.paste(body, (0, 0), mask)
    dr = ImageDraw.Draw(img)
    dr.ellipse([1, 1, d - 2, d - 2], outline=(255, 255, 255, 70), width=max(1, int(d * 0.03)))
    # 하이라이트
    dr.ellipse([d * 0.24, d * 0.16, d * 0.56, d * 0.38], fill=(255, 255, 255, 140))
    dr.ellipse([d * 0.28, d * 0.20, d * 0.46, d * 0.30], fill=(255, 255, 255, 200))
    return img


def draw_tube(img, x, y, w, h, colors, rim_alpha=90, ball_scale=0.92):
    """유리 튜브 + 아래에서부터 채워진 구슬."""
    r = w * 0.44
    # 1) 유리 안쪽(살짝 밝은 판)
    glass = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(glass).rounded_rectangle([x, y, x + w, y + h], radius=r, fill=(255, 255, 255, 26))
    img.alpha_composite(glass)

    # 2) 구슬: 4칸으로 나눠 아래에서 위로
    slot = h / 4.0
    bd = int(min(w * 0.80, slot * 0.96) * ball_scale)
    for i, c in enumerate(colors[:4]):
        b = ball_layer(bd, PALETTE[c % len(PALETTE)])
        cx = int(x + (w - bd) / 2)
        cy = int(y + h - slot * (i + 0.5) - bd / 2)
        img.alpha_composite(b, (cx, cy))

    # 3) 유리 테두리와 하이라이트를 위에
    over = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    d.rounded_rectangle(
        [x, y, x + w, y + h], radius=r,
        fill=None, outline=(255, 255, 255, rim_alpha), width=max(2, int(w * 0.035))
    )
    d.rounded_rectangle(
        [x + w * 0.13, y + h * 0.08, x + w * 0.25, y + h * 0.66],
        radius=w * 0.06, fill=(255, 255, 255, 55)
    )
    img.alpha_composite(over)


def icon_master(size=1024):
    img = linear_gradient((size, size), hx("#241046"), hx("#0B0A1F")).convert("RGBA")
    glow(img, (int(size * 0.18), int(size * 0.14)), int(size * 0.42), hx("#FF5C93"), 130, int(size * 0.12))
    glow(img, (int(size * 0.86), int(size * 0.82)), int(size * 0.40), hx("#7C5CFF"), 150, int(size * 0.12))

    # 중앙 튜브
    tw = int(size * 0.44)
    th = int(size * 0.62)
    tx = (size - tw) // 2
    ty = int(size * 0.20)
    # 뒤로 번지는 빛
    glow(img, (size // 2, ty + th // 2), int(size * 0.30), hx("#FF8AC2"), 90, int(size * 0.10))
    draw_tube(img, tx, ty, tw, th, [2, 4, 5, 8], rim_alpha=150, ball_scale=0.80)

    # 작은 장식 구슬
    for (px, py, c, d) in [(0.17, 0.74, 3, 0.12), (0.83, 0.30, 1, 0.10), (0.78, 0.80, 7, 0.09)]:
        b = ball_layer(int(size * d), PALETTE[c])
        img.alpha_composite(b, (int(size * px), int(size * py)))
    return img


def rounded(img, radius_ratio=0.22):
    size = img.size[0]
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def circle(img):
    size = img.size[0]
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def foreground(size):
    """적응형 아이콘 전경(투명 배경, 안전 영역 66%)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * 0.66)
    tw = int(inner * 0.52)
    th = int(inner * 0.74)
    tx = (size - tw) // 2
    ty = (size - th) // 2
    draw_tube(img, tx, ty, tw, th, [2, 4, 5, 8], rim_alpha=160, ball_scale=0.80)
    return img


def feature_graphic():
    w, h = 1024, 500
    img = linear_gradient((w, h), hx("#1C0F3C"), hx("#0B0A1F")).convert("RGBA")
    glow(img, (140, 60), 260, hx("#FF5C93"), 120, 120)
    glow(img, (900, 460), 300, hx("#7C5CFF"), 140, 130)

    # 오른쪽 튜브 3개
    tube_w = 92
    tube_h = 300
    base_y = 120
    for i, (colors, dy) in enumerate([([2, 8, 5, 4], 0), ([1, 6, 3, 7], -22), ([9, 0, 10, 2], 6)]):
        draw_tube(img, 610 + i * 118, base_y + dy, tube_w, tube_h, colors, rim_alpha=130, ball_scale=0.82)

    d = ImageDraw.Draw(img)
    f_title = font(76, "Black")
    f_sub = font(40, "Bold")
    f_small = font(24, "Regular")

    d.text((64, 118), "COLOR POUR", font=f_title, fill=(255, 255, 255, 255))
    d.text((66, 214), "볼 정렬 퍼즐", font=f_sub, fill=hx("#FFD166"))
    d.text((66, 280), "인터넷 없이 즐기는 두뇌 퍼즐 · 120 스테이지", font=f_small, fill=(255, 255, 255, 165))

    # 하단 포인트 라인
    d.rounded_rectangle([66, 330, 480, 338], radius=4, fill=hx("#FF5C93"))
    return img.convert("RGB")


def main():
    OUT_STORE.mkdir(parents=True, exist_ok=True)
    master = icon_master(1024)

    # Play 스토어 아이콘 512
    icon512 = master.resize((512, 512), Image.LANCZOS)
    icon512.convert("RGB").save(OUT_STORE / "icon-512.png", "PNG")

    # 피처 그래픽 1024x500
    feature_graphic().save(OUT_STORE / "feature-1024x500.png", "PNG")

    # 레거시/적응형 런처 아이콘
    densities = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for name, px in densities.items():
        d = RES / f"mipmap-{name}"
        d.mkdir(parents=True, exist_ok=True)
        rounded(master.resize((px, px), Image.LANCZOS)).save(d / "ic_launcher.png")
        circle(master.resize((px, px), Image.LANCZOS)).save(d / "ic_launcher_round.png")

    fg_sizes = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
    for name, px in fg_sizes.items():
        d = RES / f"mipmap-{name}"
        d.mkdir(parents=True, exist_ok=True)
        foreground(px).save(d / "ic_launcher_foreground.png")

    print("icon 512:", (OUT_STORE / "icon-512.png").stat().st_size)
    print("feature:", (OUT_STORE / "feature-1024x500.png").stat().st_size)


if __name__ == "__main__":
    main()
