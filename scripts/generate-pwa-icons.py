#!/usr/bin/env python3
"""
Gera todos os ícones PWA + Apple touch icons a partir de public/locvia-icon.png
- Faz crop central quadrado do source (145x156)
- Redimensiona pra cada tamanho
- Pra maskable: canvas com padding pra safe zone de 40% raio
"""
import os
from PIL import Image

SRC = "/Volumes/LovonHD/LOCVIA OK/LOCVIA/public/locvia-icon.png"
OUT = "/Volumes/LovonHD/LOCVIA OK/LOCVIA/public/icons"
os.makedirs(OUT, exist_ok=True)

# Carrega e converte pra RGBA
img = Image.open(SRC).convert("RGBA")
w, h = img.size
print(f"Source: {w}x{h}")

# 1. Crop central quadrado (pega o menor lado)
side = min(w, h)
left = (w - side) // 2
top = (h - side) // 2
square = img.crop((left, top, left + side, top + side))
print(f"Square crop: {square.size}")

# Salva o quadrado base
square.save(f"{OUT}/source-square.png")

# 2. Gera cada tamanho PWA
sizes = {
    # PWA manifest
    "icon-192.png": 192,
    "icon-512.png": 512,
    # Apple touch icons (iOS)
    "apple-touch-icon.png": 180,        # iPhone @3x
    "apple-touch-icon-167.png": 167,    # iPad Pro
    "apple-touch-icon-152.png": 152,    # iPad @2x
    "apple-touch-icon-120.png": 120,    # iPhone @2x
    "favicon-32.png": 32,               # favicon padrão
    "favicon-16.png": 16,               # favicon legacy
}
for name, size in sizes.items():
    out = square.resize((size, size), Image.LANCZOS)
    out.save(f"{OUT}/{name}", optimize=True)
    print(f"  {name} ({size}x{size})")

# 3. Maskable icon: canvas 512x512 com padding ~24% de cada lado
#    Safe zone = círculo central de 80% do menor lado
def make_maskable(src_img, size=512, padding_pct=0.20):
    # Padding = 20% de cada lado (safe zone centralizada em 60% do canvas)
    pad = int(size * padding_pct)
    canvas = Image.new("RGBA", (size, size), (11, 17, 32, 255))  # bg = #0b1120 (theme color)
    inner_size = size - 2 * pad
    inner = src_img.resize((inner_size, inner_size), Image.LANCZOS)
    canvas.paste(inner, (pad, pad), inner)
    return canvas

maskable = make_maskable(square, 512, padding_pct=0.20)
maskable.save(f"{OUT}/icon-maskable-512.png", optimize=True)
maskable.save(f"{OUT}/icon-maskable-192.png", optimize=True)  # iOS adaptive fallback
print(f"  icon-maskable-512.png (512x512, padding 20%)")
print(f"  icon-maskable-192.png (192x192, padding 20%)")

# 4. Splash screens iOS (storyboard usa o icon + status bar, mas gerar apple-splash genérico)
#    iOS lê apple-touch-startup-image via <link>, tamanhos baseados em device
splash_sizes = [
    ("apple-splash-1170-2532.png", 1170, 2532),  # iPhone 14 Pro
    ("apple-splash-1179-2556.png", 1179, 2556),  # iPhone 14 Pro Max
    ("apple-splash-1290-2796.png", 1290, 2796),  # iPhone 14
    ("apple-splash-750-1334.png", 750, 1334),    # iPhone 8
    ("apple-splash-1242-2688.png", 1242, 2688),  # iPhone XS Max
    ("apple-splash-1125-2436.png", 1125, 2436),  # iPhone X
    ("apple-splash-2048-2732.png", 2048, 2732),  # iPad Pro 12.9
]
for name, w_, h_ in splash_sizes:
    # Cria splash com gradient + logo centralizado
    splash = Image.new("RGB", (w_, h_), (11, 17, 32))  # #0b1120
    # Centraliza o logo em ~30% da menor dimensão
    logo_size = int(min(w_, h_) * 0.30)
    logo = square.resize((logo_size, logo_size), Image.LANCZOS)
    px = (w_ - logo_size) // 2
    py = (h_ - logo_size) // 2
    splash.paste(logo, (px, py), logo)
    splash.save(f"{OUT}/{name}", optimize=True)
    print(f"  {name} ({w_}x{h_})")

print(f"\n✓ {len(sizes) + 2 + len(splash_sizes)} ícones gerados em {OUT}")
