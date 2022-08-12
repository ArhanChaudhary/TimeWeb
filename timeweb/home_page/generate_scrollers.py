from PIL import Image
from pathlib import Path

app_dir = Path(__file__).resolve().parent
light = True

if light:
    img = Image.open(app_dir / "light_scroller.png")
    wanted_column_colors = ([255, 255, 255], [0,0,0])
else:
    img = Image.open(app_dir / "dark_scroller.png")
    wanted_column_colors = ([48, 48, 48], [0,0,0])

good_column = None
good_column_padding = 50 # account for the border_radius on .assignment

for i in range(img.width - 1 - good_column_padding, good_column_padding, -1):
    is_good_column = True
    for j in range(0, img.height):
        p = [*img.getpixel((i, j))][:3]
        if p not in wanted_column_colors:
            is_good_column = False
            break
    if is_good_column:
        good_column = i
        break

top = None
bottom = None
left = 0
right = img.width - 500

count = 0
old_color = wanted_column_colors[1]
for i in range(0, img.height):
    p = [*img.getpixel((good_column, i))][:3]
    if p != old_color:
        if p == wanted_column_colors[0]:
            assert old_color == wanted_column_colors[1]
            top = i
        else:
            assert p == wanted_column_colors[1]
            assert old_color == wanted_column_colors[0]
            bottom = i
            print(f"Cropping from {top} to {bottom}")
            # crop top, bottom, left, right and save it
            img2 = img.crop((left, top, right, bottom))
            img2.save(app_dir / f"static/home_page/scrollers/scroller{count}_{'light' if light else 'dark'}.png")
            count += 1
    old_color = p

