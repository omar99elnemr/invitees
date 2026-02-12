"""Generate PWA icons programmatically using Pillow to match the redesigned favicon SVG."""
from PIL import Image, ImageDraw, ImageFont
import math, os

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
OUT_DIR = os.path.join(os.path.dirname(__file__), "public", "icons")
os.makedirs(OUT_DIR, exist_ok=True)


def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(len(c1)))


def draw_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size  # shorthand

    # ── Background rounded rect with gradient ──
    # Draw gradient by horizontal lines
    c_tl = (99, 102, 241)   # #6366F1 indigo-500
    c_br = (67, 56, 202)    # #4338CA indigo-700
    radius = round(s * 0.25)
    pad = round(s * 0.03125)  # 1/32

    # Create a mask for the rounded rect
    mask = Image.new("L", (s, s), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([pad, pad, s - pad - 1, s - pad - 1], radius=radius, fill=255)

    # Gradient fill
    for y in range(s):
        t = y / max(s - 1, 1)
        # Diagonal gradient approximation
        for x in range(s):
            t2 = (x / max(s - 1, 1) + y / max(s - 1, 1)) / 2.0
            color = lerp_color(c_tl, c_br, t2)
            img.putpixel((x, y), (*color, 255))

    # Apply rounded rect mask
    bg = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    bg.paste(img, mask=mask)
    img = bg
    d = ImageDraw.Draw(img)

    # ── Person silhouette ──
    white = (255, 255, 255, 242)  # 0.95 opacity
    # Head
    head_cx = round(s * 0.40625)   # 13/32
    head_cy = round(s * 0.34375)   # 11/32
    head_r = round(s * 0.11875)    # 3.8/32
    d.ellipse(
        [head_cx - head_r, head_cy - head_r, head_cx + head_r, head_cy + head_r],
        fill=white,
    )
    # Body (arc / half ellipse)
    body_cx = round(s * 0.40625)  # 13/32
    body_top = round(s * 0.521875) # 16.7/32
    body_bottom = round(s * 0.703125) # 22.5/32
    body_hw = round(s * 0.203125)  # 6.5/32
    # Draw the body as a filled chord / pie slice
    body_bbox = [
        body_cx - body_hw,
        body_top - (body_bottom - body_top),
        body_cx + body_hw,
        body_bottom,
    ]
    d.pieslice(body_bbox, start=0, end=180, fill=white)

    # ── Green badge ──
    badge_cx = round(s * 0.734375)  # 23.5/32
    badge_cy = round(s * 0.6875)    # 22/32
    badge_r = round(s * 0.203125)   # 6.5/32

    # Badge gradient (emerald)
    badge_c1 = (52, 211, 153)  # #34D399
    badge_c2 = (5, 150, 105)   # #059669

    # Draw badge with gradient
    badge_img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    bd = ImageDraw.Draw(badge_img)
    for y_off in range(-badge_r, badge_r + 1):
        for x_off in range(-badge_r, badge_r + 1):
            if x_off * x_off + y_off * y_off <= badge_r * badge_r:
                px = badge_cx + x_off
                py = badge_cy + y_off
                if 0 <= px < s and 0 <= py < s:
                    t = ((x_off + badge_r) / (2 * badge_r) + (y_off + badge_r) / (2 * badge_r)) / 2.0
                    c = lerp_color(badge_c1, badge_c2, t)
                    badge_img.putpixel((px, py), (*c, 255))

    img = Image.alpha_composite(img, badge_img)
    d = ImageDraw.Draw(img)

    # Badge ring (subtle white outline)
    ring_width = max(1, round(s * 0.01875))
    for angle_deg in range(360):
        angle = math.radians(angle_deg)
        for rr in range(badge_r - ring_width, badge_r + 1):
            px = round(badge_cx + rr * math.cos(angle))
            py = round(badge_cy + rr * math.sin(angle))
            if 0 <= px < s and 0 <= py < s:
                existing = img.getpixel((px, py))
                # Blend white at 20% opacity
                blended = tuple(int(existing[i] * 0.8 + 255 * 0.2) for i in range(3)) + (existing[3],)
                img.putpixel((px, py), blended)

    # ── Checkmark ──
    d = ImageDraw.Draw(img)
    check_width = max(2, round(s * 0.0625))  # 2/32 scaled

    # Checkmark points (from SVG: M20.2 22 l2.3 2.3 3.8-3.8 scaled)
    p1 = (round(s * 0.63125), round(s * 0.6875))    # start
    p2 = (round(s * 0.703125), round(s * 0.759375))  # mid
    p3 = (round(s * 0.821875), round(s * 0.640625))  # end

    d.line([p1, p2], fill=(255, 255, 255, 255), width=check_width)
    d.line([p2, p3], fill=(255, 255, 255, 255), width=check_width)

    # Round the line caps
    cap_r = check_width // 2
    for pt in [p1, p2, p3]:
        d.ellipse([pt[0] - cap_r, pt[1] - cap_r, pt[0] + cap_r, pt[1] + cap_r],
                  fill=(255, 255, 255, 255))

    return img


def draw_maskable_icon(size):
    """Generate a maskable icon: full-bleed gradient background, no transparency,
    artwork centered in the safe zone (inner 80%)."""
    s = size
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    c_tl = (99, 102, 241)   # #6366F1
    c_br = (67, 56, 202)    # #4338CA

    # Fill entire canvas with gradient (no rounded corners, no transparency)
    for y in range(s):
        for x in range(s):
            t = (x / max(s - 1, 1) + y / max(s - 1, 1)) / 2.0
            color = lerp_color(c_tl, c_br, t)
            img.putpixel((x, y), (*color, 255))

    d = ImageDraw.Draw(img)

    # Safe zone is inner 80% — offset artwork into that region
    # Scale factor: draw the person+badge at 70% of canvas, centered
    safe_offset = round(s * 0.15)
    safe_size = s - 2 * safe_offset

    white = (255, 255, 255, 242)

    # Person head — centered in safe zone
    head_cx = safe_offset + round(safe_size * 0.38)
    head_cy = safe_offset + round(safe_size * 0.30)
    head_r = round(safe_size * 0.125)
    d.ellipse([head_cx - head_r, head_cy - head_r, head_cx + head_r, head_cy + head_r], fill=white)

    # Person body
    body_cx = head_cx
    body_top = safe_offset + round(safe_size * 0.48)
    body_bottom = safe_offset + round(safe_size * 0.70)
    body_hw = round(safe_size * 0.21)
    body_bbox = [body_cx - body_hw, body_top - (body_bottom - body_top), body_cx + body_hw, body_bottom]
    d.pieslice(body_bbox, start=0, end=180, fill=white)

    # Badge
    badge_cx = safe_offset + round(safe_size * 0.72)
    badge_cy = safe_offset + round(safe_size * 0.66)
    badge_r = round(safe_size * 0.20)

    badge_c1 = (52, 211, 153)
    badge_c2 = (5, 150, 105)

    badge_img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    for y_off in range(-badge_r, badge_r + 1):
        for x_off in range(-badge_r, badge_r + 1):
            if x_off * x_off + y_off * y_off <= badge_r * badge_r:
                px = badge_cx + x_off
                py = badge_cy + y_off
                if 0 <= px < s and 0 <= py < s:
                    t = ((x_off + badge_r) / (2 * badge_r) + (y_off + badge_r) / (2 * badge_r)) / 2.0
                    c = lerp_color(badge_c1, badge_c2, t)
                    badge_img.putpixel((px, py), (*c, 255))

    img = Image.alpha_composite(img, badge_img)
    d = ImageDraw.Draw(img)

    # Checkmark
    check_width = max(2, round(safe_size * 0.065))
    p1 = (safe_offset + round(safe_size * 0.60), safe_offset + round(safe_size * 0.66))
    p2 = (safe_offset + round(safe_size * 0.68), safe_offset + round(safe_size * 0.74))
    p3 = (safe_offset + round(safe_size * 0.82), safe_offset + round(safe_size * 0.60))

    d.line([p1, p2], fill=(255, 255, 255, 255), width=check_width)
    d.line([p2, p3], fill=(255, 255, 255, 255), width=check_width)
    cap_r = check_width // 2
    for pt in [p1, p2, p3]:
        d.ellipse([pt[0] - cap_r, pt[1] - cap_r, pt[0] + cap_r, pt[1] + cap_r], fill=(255, 255, 255, 255))

    return img


for sz in SIZES:
    icon = draw_icon(sz)
    icon.save(os.path.join(OUT_DIR, f"icon-{sz}.png"), "PNG")
    print(f"  Generated icon-{sz}.png")

# Maskable icons (used for splash screens & adaptive icons)
MASKABLE_SIZES = [192, 384, 512]
for sz in MASKABLE_SIZES:
    micon = draw_maskable_icon(sz)
    micon.save(os.path.join(OUT_DIR, f"icon-maskable-{sz}.png"), "PNG")
    print(f"  Generated icon-maskable-{sz}.png")

# Apple touch icon (180x180)
apple = draw_icon(180)
apple.save(os.path.join(OUT_DIR, "apple-touch-icon.png"), "PNG")
print("  Generated apple-touch-icon.png")

print("Done! All icons generated.")
