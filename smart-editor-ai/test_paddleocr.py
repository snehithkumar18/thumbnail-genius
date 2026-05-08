from paddleocr import PaddleOCR
from PIL import Image, ImageDraw
import numpy as np

img = Image.new('RGB', (200, 100), color=(255,255,255))
d = ImageDraw.Draw(img)
d.text((10,10), "Hello World", fill=(0,0,0))
img_np = np.array(img)

ocr = PaddleOCR(use_angle_cls=True, lang='en')
result = ocr.ocr(img_np, cls=True)

print("Result length:", len(result))
for idx in range(len(result)):
    res = result[idx]
    if res is None: continue
    for line in res:
        print("Line:", line)
