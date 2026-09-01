"""Generate solid-color PNG icons (no PIL, no ImageMagick)."""
import struct, zlib, sys

def make_png(width, height, rgb):
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    raw = b""
    for _ in range(height):
        raw += b"\x00" + bytes(rgb) * width
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    idat = zlib.compress(raw, 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")

# pink-500 (#ec4899) -> RGB (236, 72, 153)
def main():
    out = sys.argv[1]
    size = int(sys.argv[2])
    with open(out, "wb") as f:
        f.write(make_png(size, size, (236, 72, 153)))
    print(f"wrote {out} ({size}x{size})")

main()