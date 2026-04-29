#!/usr/bin/env python3
"""Generate PWA icons for AICare Dashboard."""
import os
from PIL import Image, ImageDraw

BASE = os.path.join(os.path.dirname(__file__), '..', 'public')
BRAND_BLUE = (37, 99, 235)  # #2563EB
WHITE = (255, 255, 255)

def create_icon(size):
    img = Image.new('RGB', (size, size), BRAND_BLUE)
    draw = ImageDraw.Draw(img)
    
    # Subtle lighter circle in center as background for heart
    cx, cy = size // 2, size // 2
    r = int(size * 0.32)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(59, 130, 246))
    
    # Draw a simple heart shape
    hr = int(size * 0.12)
    h_offset = int(size * 0.08)
    
    # Left hump
    draw.ellipse([cx - hr - h_offset, cy - hr, cx - h_offset, cy], fill=WHITE)
    # Right hump  
    draw.ellipse([cx + h_offset, cy - hr, cx + hr + h_offset, cy], fill=WHITE)
    # Bottom point
    draw.polygon([
        (cx - hr - h_offset, cy),
        (cx + hr + h_offset, cy),
        (cx, cy + int(size * 0.28))
    ], fill=WHITE)
    
    return img

if __name__ == '__main__':
    os.makedirs(BASE, exist_ok=True)
    
    for s in [192, 512]:
        icon = create_icon(s)
        path = os.path.join(BASE, f'icon-{s}x{s}.png')
        icon.save(path, 'PNG')
        print(f'Saved {path}')
