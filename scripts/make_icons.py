"""Resize Icone.png -> squared PNGs with white padding (no Pillow dep if possible, falls back to pure-PNG)."""
import sys, pathlib, struct, zlib, io

def load_png_rgba(path):
    # use Pillow when available (venv / system), else decode manually
    try:
        from PIL import Image
        im = Image.open(path).convert("RGBA")
        return im.width, im.height, bytes(im.tobytes()), True
    except Exception:
        return None

out_map = {"icon-192": 192, "icon-512": 512, "apple-touch-icon": 180}
src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path("public/Icone.png")
dst_dir = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else pathlib.Path("public")

loaded = load_png_rgba(src)
if loaded:
    from PIL import Image
    w, h, raw, _ = loaded
    # reopen properly
    for name, size in out_map.items():
        img = Image.open(src).convert("RGBA")
        # fit inside size x size
        img.thumbnail((size, size), Image.LANCZOS)
        canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
        x = (size - img.width) // 2
        y = (size - img.height) // 2
        canvas.paste(img, (x, y), img)
        # apple-touch-icon and icons must be opaque per PWA spec
        canvas.convert("RGB").save(dst_dir / f"{name}.png", "PNG", optimize=True)
        print(f"{dst_dir / f'{name}.png'} OK ({size}x{size})")

    # splash 750x1334
    W, H = 750, 1334
    splash = Image.new("RGB", (W, H), (255, 255, 255))
    img = Image.open(src).convert("RGBA")
    target_w = int(W * 0.52)
    ratio = target_w / img.width
    target_h = int(img.height * ratio)
    img2 = img.resize((target_w, target_h), Image.LANCZOS)
    cx = (W - target_w) // 2
    cy = H // 2 - target_h // 2 - 20
    tmp = splash.convert("RGBA")
    tmp.paste(img2, (cx, cy), img2)
    tmp.convert("RGB").save(dst_dir / "apple-splash-750x1334.png", "PNG", optimize=True)
    print(f"{dst_dir / 'apple-splash-750x1334.png'} OK")
else:
    print("Pillow not available and manual decode not implemented for RGBA source; install Pillow in venv.")
    sys.exit(2)
