"""Lossless diagnostic crops; nearest-neighbor enlargement never smooths edges."""
import os
from pathlib import Path
from PIL import Image, ImageDraw

temporary = Path(os.environ['TEMP'])
output = Path('docs/verification/jitter')
output.mkdir(parents=True, exist_ok=True)
before = temporary / 'polyshade-jitter-before-probes'
after = temporary / 'polyshade-jitter-release-1280x720'
if not (after / 'report.json').exists():
    after = temporary / 'polyshade-jitter-final-720'
for mode in ['sgsr2-compute', 'fsr31']:
    frames = []
    for index in range(32):
        images = [Image.open(root / f'{mode}-50/{index:03}.png').convert('RGB') for root in [before, after]]
        canvas = Image.new('RGB', (1280, 500), '#111820')
        draw = ImageDraw.Draw(canvas)
        draw.text((12, 10), f'{mode} 50% | Before', fill='white')
        draw.text((652, 10), 'Corrected | same jitter amplitude', fill='white')
        for column, image in enumerate(images):
            crop = image.crop((480, 420, 800, 650)).resize((640, 460), Image.Resampling.NEAREST)
            canvas.paste(crop, (column * 640, 36))
        frames.append(canvas)
    # All consecutive phases, approximately the original 60-Hz sample cadence.
    frames[0].save(output / f'{mode}-50-cycle.png', save_all=True,
                   append_images=frames[1:], duration=[16, 17, 17, 17] * 8, loop=0)
    sheet = Image.new('RGB', (1020, 604), '#111820')
    draw = ImageDraw.Draw(sheet)
    for row, root in enumerate([before, after]):
        draw.text((8, row * 302 + 6), f'{mode} | {"Before" if row == 0 else "Corrected"} | phases 0, 8, 16, 24', fill='white')
        for column, index in enumerate([0, 8, 16, 24]):
            image = Image.open(root / f'{mode}-50/{index:03}.png').convert('RGB')
            crop = image.crop((690, 535, 775, 625)).resize((255, 270), Image.Resampling.NEAREST)
            sheet.paste(crop, (column * 255, row * 302 + 28))
    sheet.save(output / f'{mode}-50-phases.png')
print('Saved complete-cycle APNGs and phase contact sheets:', output)
