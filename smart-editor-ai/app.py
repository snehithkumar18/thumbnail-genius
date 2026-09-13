"""
Enhanced Face Swap with Quality & Accuracy Improvements
- Better face detection with quality validation
- Image upscaling for low-res inputs
- Post-processing with sharpening and color enhancement
- Improved error messages
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import os
import io
import requests
import numpy as np
import cv2
import base64
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fix for basicsr/gfpgan compatibility with newer torchvision
try:
    import sys
    import types
    import torchvision
    from torchvision.transforms import functional as F
    
    # Create a dummy module to satisfy the absolute import 'from torchvision.transforms.functional_tensor import ...'
    if 'torchvision.transforms.functional_tensor' not in sys.modules:
        fake_module = types.ModuleType('torchvision.transforms.functional_tensor')
        # Map required functions (BasicSR usually needs rgb_to_grayscale)
        fake_module.rgb_to_grayscale = F.rgb_to_grayscale
        sys.modules['torchvision.transforms.functional_tensor'] = fake_module
        logger.info("Injected fake torchvision.transforms.functional_tensor module for BasicSR compatibility")
except Exception as e:
    logger.warning(f"Failed to apply torchvision monkeypatch: {e}")

try:
    from ultralytics import YOLO
    logger.info("YOLO imported successfully")
except Exception as e:
    YOLO = None
    logger.warning(f"YOLO import failed: {e}")

try:
    import easyocr
    logger.info("EasyOCR imported successfully")
except Exception as e:
    easyocr = None
    logger.warning(f"EasyOCR import failed: {e}")

# Try to import PaddleOCR (preferred when available and configured)
try:
    from paddleocr import PaddleOCR
    paddleocr_available = True
    logger.info("PaddleOCR import available")
except Exception as e:
    PaddleOCR = None
    paddleocr_available = False
    logger.info(f"PaddleOCR not available: {e}")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class DetectRequest(BaseModel):
    image_url: str
    max_dim: int = 1024

class Layer(BaseModel):
    id: str
    type: str
    label: str
    mask: Optional[str] = None
    bbox: Optional[List[float]] = None
    content: Optional[str] = None

class DetectResponse(BaseModel):
    layers: List[Layer]

class ReplaceRequest(BaseModel):
    image_url: str
    mask_url: str
    prompt: str
    replacement_image_url: Optional[str] = None
    edit_type: Optional[str] = None
    bbox: Optional[List[float]] = None
    overlay_x: Optional[float] = None
    overlay_y: Optional[float] = None
    overlay_w: Optional[float] = None
    overlay_h: Optional[float] = None


class ReplaceResponse(BaseModel):
    image_base64: str
    width: int
    height: int

class EraseTextRequest(BaseModel):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    bbox: List[float]  # [x, y, w, h] in pixel coordinates
    dilation_px: int = 12

class EraseTextResponse(BaseModel):
    image_base64: str
    width: int
    height: int

class BlendCompositeRequest(BaseModel):
    original_url: Optional[str] = None
    original_base64: Optional[str] = None
    replacement_url: Optional[str] = None
    replacement_base64: Optional[str] = None
    mask_url: Optional[str] = None
    mask_base64: Optional[str] = None

class BlendCompositeResponse(BaseModel):
    image_base64: str
    width: int
    height: int

# Initialize OCR engine with error handling
ocr_engine = None
if easyocr:
    try:
        ocr_engine = easyocr.Reader(['en'], gpu=False)
        logger.info("EasyOCR engine loaded")
    except Exception as e:
        logger.warning(f"EasyOCR engine initialization failed: {e} — text detection will be skipped")
else:
    logger.warning("EasyOCR not available — text detection will be skipped")

# Initialize PaddleOCR engine if available (CPU, Latin languages default)
paddle_ocr_engine = None
if paddleocr_available:
    try:
        # use CPU; set use_angle_cls to detect rotated text when needed
        paddle_ocr_engine = PaddleOCR(use_angle_cls=True, lang='en')
        logger.info("PaddleOCR engine loaded")
    except Exception as e:
        paddle_ocr_engine = None
        logger.warning(f"PaddleOCR initialization failed: {e}")

YOLO_CONF = 0.2
YOLO_MAX_OBJECTS = 24
GRAPHIC_MIN_AREA_RATIO = 0.01
GRAPHIC_MAX_AREA_RATIO = 0.6
GRAPHIC_MIN_EDGE_LEN = 40
YOLO_MIN_CONF = 0.35
YOLO_MIN_AREA_PIXELS = 800
SAM_BOX_MARGIN_RATIO = 0.08
SAM_MAX_SIDE = 1024
SAM_CHECKPOINT_URL = "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth"
SAM_CHECKPOINT_PATH = Path(__file__).parent / "weights" / "sam_vit_b_01ec64.pth"

def resolve_yolo_model_path() -> str:
    if os.path.exists("yolov8n-seg.pt"):
        return "yolov8n-seg.pt"
    if os.path.exists("yolov8s-seg.pt"):
        return "yolov8s-seg.pt"
    if os.path.exists("yolov8s.pt"):
        return "yolov8s.pt"
    return "yolov8n.pt"

yolo_model_path = resolve_yolo_model_path()
yolo_model = YOLO(yolo_model_path) if YOLO else None

if yolo_model:
    logger.info(f"YOLO model loaded: {yolo_model.model_name if hasattr(yolo_model, 'model_name') else yolo_model_path}")
else:
    logger.warning("YOLO model NOT loaded — object detection will be skipped")


def _ensure_sam_checkpoint() -> Path:
    SAM_CHECKPOINT_PATH.parent.mkdir(parents=True, exist_ok=True)
    if SAM_CHECKPOINT_PATH.exists() and SAM_CHECKPOINT_PATH.stat().st_size > 1024 * 1024:
        return SAM_CHECKPOINT_PATH

    logger.info(f"Downloading SAM checkpoint to {SAM_CHECKPOINT_PATH}")
    resp = requests.get(SAM_CHECKPOINT_URL, timeout=120, stream=True)
    resp.raise_for_status()
    with open(SAM_CHECKPOINT_PATH, "wb") as f:
        for chunk in resp.iter_content(chunk_size=1024 * 1024):
            if chunk:
                f.write(chunk)
    return SAM_CHECKPOINT_PATH


try:
    from segment_anything import SamPredictor, sam_model_registry

    sam_predictor = None
    try:
        sam_checkpoint = _ensure_sam_checkpoint()
        sam_model = sam_model_registry["vit_b"](checkpoint=str(sam_checkpoint))
        sam_model.to(device="cpu")
        sam_predictor = SamPredictor(sam_model)
        logger.info(f"SAM predictor loaded: {sam_checkpoint}")
    except Exception as e:
        sam_predictor = None
        logger.warning(f"SAM initialization failed: {e}")
except Exception as e:
    SamPredictor = None
    sam_model_registry = None
    sam_predictor = None
    logger.warning(f"segment_anything import failed: {e}")


def download_image(url: str) -> Image.Image:
    """Download or decode base64 data URI and convert image to RGB"""
    if url.startswith("data:image"):
        b64 = url.split(",", 1)[1]
        return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
    resp = requests.get(url, headers=headers, timeout=10)
    resp.raise_for_status()
    img = Image.open(io.BytesIO(resp.content)).convert("RGB")
    logger.info(f"Downloaded image: {url[:50]}... size: {img.size}")
    return img


def clamp_bbox(bbox, width: int, height: int, margin_ratio: float = 0.0):
    x, y, bw, bh = [float(v) for v in bbox]
    margin_x = bw * margin_ratio
    margin_y = bh * margin_ratio
    x1 = max(0.0, x - margin_x)
    y1 = max(0.0, y - margin_y)
    x2 = min(float(width), x + bw + margin_x)
    y2 = min(float(height), y + bh + margin_y)
    return [x1, y1, x2, y2]


def bbox_to_xyxy_int(bbox, width: int, height: int, margin_ratio: float = SAM_BOX_MARGIN_RATIO):
    x1, y1, x2, y2 = clamp_bbox(bbox, width, height, margin_ratio=margin_ratio)
    return [int(round(x1)), int(round(y1)), int(round(x2)), int(round(y2))]


def mask_png_from_bool(mask_bool: np.ndarray) -> str:
    mask_img = Image.fromarray((mask_bool.astype(np.uint8) * 255), mode="L")
    buffer = io.BytesIO()
    mask_img.save(buffer, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}"


def bbox_mask_png(bbox, width: int, height: int) -> str:
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    x1, y1, x2, y2 = clamp_bbox(bbox, width, height)
    draw.rectangle([x1, y1, x2, y2], fill=255)
    buf = io.BytesIO()
    mask.save(buf, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"


def sam_segment_from_bbox(img: Image.Image, bbox):
    if sam_predictor is None:
        return None

    try:
        rgb = np.array(img.convert("RGB"))
        h, w = rgb.shape[:2]
        if max(h, w) > SAM_MAX_SIDE:
            scale = SAM_MAX_SIDE / max(h, w)
            rgb = cv2.resize(rgb, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
            h, w = rgb.shape[:2]
            bbox = [bbox[0] * scale, bbox[1] * scale, bbox[2] * scale, bbox[3] * scale]

        sam_predictor.set_image(rgb)
        x1, y1, x2, y2 = bbox_to_xyxy_int(bbox, w, h)
        masks, scores, _ = sam_predictor.predict(
            box=np.array([x1, y1, x2, y2]),
            multimask_output=True,
        )
        if masks is None or len(masks) == 0:
            return None
        best_idx = int(np.argmax(scores)) if scores is not None and len(scores) else 0
        mask = masks[best_idx]
        if mask.shape[0] != img.height or mask.shape[1] != img.width:
            mask = cv2.resize(mask.astype(np.uint8), (img.width, img.height), interpolation=cv2.INTER_NEAREST) > 0
        return mask
    except Exception as e:
        logger.warning(f"SAM segmentation failed for bbox {bbox}: {e}")
        return None


def upscale_image_if_needed(img: Image.Image, min_threshold: int = 512) -> Image.Image:
    """Upscale low-res images for better quality"""
    min_dim = min(img.size)
    if min_dim < min_threshold:
        # Determine scale factor
        if min_dim < 256:
            scale_factor = 3
        elif min_dim < 384:
            scale_factor = 2.5
        else:
            scale_factor = 2
        
        new_size = (int(img.width * scale_factor), int(img.height * scale_factor))
        img_upscaled = img.resize(new_size, Image.Resampling.LANCZOS)
        logger.info(f"Upscaled image from {img.size} to {img_upscaled.size} (scale: {scale_factor}x)")
        return img_upscaled
    return img
def resize_image(img: Image.Image, max_dim: int) -> tuple:
    """Resize image and return (resized_img, scale_factor)"""
    w, h = img.size
    scale = min(max_dim / max(w, h), 1.0)
    if scale == 1.0:
        return img, 1.0
    resized = img.resize((int(w * scale), int(h * scale)))
    return resized, scale


def yolo_detect(img: Image.Image, conf: float = YOLO_CONF):
    """Detect objects using YOLO. Returns list of {label, bbox, confidence}."""
    if not yolo_model:
        logger.warning("YOLO model not available, skipping object detection")
        return []

    img_np = np.array(img)
    results = yolo_model.predict(img_np, verbose=False, conf=conf, iou=0.5)
    allowed_labels = {
        "person",
        "face",
        "tv",
        "laptop",
        "cell phone",
        "book",
        "keyboard",
        "mouse",
        "sports ball",
        "bottle",
        "cup",
        "microwave",
        "remote",
        "clock",
        "scissors",
        "keyboard",
        "monitor",
        "screen",
    }
    items = []
    for r in results:
        if getattr(r, 'boxes', None) is None or len(r.boxes) == 0:
            continue
        has_masks = getattr(r, 'masks', None) is not None
        for idx, box in enumerate(r.boxes):
            cls = int(box.cls[0])
            label = r.names.get(cls, "object")
            confv = float(box.conf[0])
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            # filter low-confidence and generic "object" labels
            area = (x2 - x1) * (y2 - y1)
            if confv < YOLO_MIN_CONF or area < YOLO_MIN_AREA_PIXELS:
                continue
            if label.lower() == 'object':
                # skip generic object detections to avoid noise
                continue
            if label.lower() not in allowed_labels:
                continue
            item = {
                "label": label,
                "bbox": [x1, y1, x2 - x1, y2 - y1],
                "confidence": confv,
            }
            if has_masks and idx < len(r.masks.data):
                m_np = r.masks.data[idx].cpu().numpy()
                m_resized = cv2.resize((m_np * 255).astype(np.uint8), (img.width, img.height))
                item["mask_data"] = m_resized
            items.append(item)
    logger.info(f"YOLO detected {len(items)} objects: {[i['label'] for i in items]}")
    return items


def ocr_detect(img: Image.Image):
    """Try PaddleOCR first, fall back to EasyOCR.
    Returns list of {text, bbox, confidence} in resized-image coordinates.
    Merges adjacent words on the same line into clean line banners.
    """
    raw_items = []
    seen_boxes = []

    def add_raw_detection(box, text, conf):
        if isinstance(box, (list, tuple)) and len(box) == 4 and isinstance(box[0], (list, tuple)):
            xs = [p[0] for p in box]
            ys = [p[1] for p in box]
        elif isinstance(box, (list, tuple)) and len(box) == 4:
            xs = [box[0], box[2]]
            ys = [box[1], box[3]]
        else:
            return

        x1 = max(0.0, float(min(xs)))
        y1 = max(0.0, float(min(ys)))
        x2 = min(float(w), float(max(xs)))
        y2 = min(float(h), float(max(ys)))
        
        bw = x2 - x1
        bh = y2 - y1
        if bw < 5 or bh < 5:
            return

        text_clean = text.strip()
        # Filter out false positive UI tags from screenshots
        if text_clean in ["Text Element", "Person", "Element", "Text Elemer", "Eler flElement"]:
            return

        pad_x = bw * 0.12
        pad_y = bh * 0.12
        padded_bbox = [max(0.0, x1 - pad_x), max(0.0, y1 - pad_y), (x2 - x1) + 2 * pad_x, (y2 - y1) + 2 * pad_y]

        for sb in seen_boxes:
            if bbox_ioa(padded_bbox, sb) > 0.65:
                return
        seen_boxes.append(padded_bbox)
        raw_items.append({"text": text_clean, "bbox": padded_bbox, "confidence": conf})

    img_np = np.array(img)
    h, w = img_np.shape[:2]

    if paddle_ocr_engine is not None:
        try:
            bgr_img = np.array(img)[:, :, ::-1]
            result = paddle_ocr_engine.ocr(bgr_img, cls=True)
            if result is not None:
                for line in result:
                    if line is None:
                        continue
                    for seg in line:
                        box = seg[0]
                        text = seg[1][0] if isinstance(seg[1], (list, tuple)) else seg[1]
                        conf = float(seg[1][1]) if isinstance(seg[1], (list, tuple)) and len(seg[1]) > 1 else 0.5
                        if len(text.strip()) < 1 or conf < 0.25:
                            continue
                        add_raw_detection(box, text, conf)
        except Exception as e:
            logger.warning(f"PaddleOCR read failed: {e}")

    if not raw_items and ocr_engine:
        try:
            results = ocr_engine.readtext(img_np)
            if results:
                for det in results:
                    box = det[0]
                    text = str(det[1])
                    conf = float(det[2])
                    if len(text.strip()) < 1 or conf < 0.30:
                        continue
                    add_raw_detection(box, text, conf)
        except Exception as e:
            logger.warning(f"EasyOCR failed: {e}")

    if not raw_items:
        return []

    # Merge adjacent text boxes on the same horizontal row into single text line banners
    merged_items = []
    sorted_raw = sorted(raw_items, key=lambda t: (t["bbox"][1], t["bbox"][0]))

    for item in sorted_raw:
        bx, by, bw, bh = item["bbox"]
        b_cy = by + bh / 2.0
        merged = False
        for m in merged_items:
            mx, my, mw, mh = m["bbox"]
            m_cy = my + mh / 2.0
            # Same horizontal line: vertical center within 20px & horizontal gap < 75px
            if abs(b_cy - m_cy) < 22 and abs((mx + mw) - bx) < 75:
                new_x = min(mx, bx)
                new_y = min(my, by)
                new_w = max(mx + mw, bx + bw) - new_x
                new_h = max(my + mh, by + bh) - new_y
                m["bbox"] = [new_x, new_y, new_w, new_h]
                m["text"] = m["text"] + " " + item["text"]
                m["confidence"] = max(m["confidence"], item["confidence"])
                merged = True
                break
        if not merged:
            merged_items.append(dict(item))

    logger.info(f"OCR detected {len(merged_items)} clean text lines: {[i['text'][:30] for i in merged_items]}")
    return merged_items


def bbox_iou(a, b) -> float:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ax2, ay2 = ax + aw, ay + ah
    bx2, by2 = bx + bw, by + bh
    ix1, iy1 = max(ax, bx), max(ay, by)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    union = (aw * ah) + (bw * bh) - inter
    return inter / union if union > 0 else 0.0


def bbox_ioa(a, b) -> float:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ax2, ay2 = ax + aw, ay + ah
    bx2, by2 = bx + bw, by + bh
    ix1, iy1 = max(ax, bx), max(ay, by)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    area_a = aw * ah
    return inter / area_a if area_a > 0 else 0.0


def detect_graphic_regions(img: Image.Image):
    """Detect graphic/logo/icon inserts, product cards, and app badges.
    Categorizes compact square/rounded cards as 'Icon' and large cards as 'Graphic'.
    """
    img_np = np.array(img)
    h, w = img_np.shape[:2]
    image_area = float(w * h)
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    items = []
    seen = []

    for c in contours:
        x, y, bw, bh = cv2.boundingRect(c)
        area = float(bw * bh)
        area_ratio = area / image_area
        if bw < 35 or bh < 35 or area_ratio < 0.003 or area_ratio > 0.45:
            continue
            
        aspect = bw / float(max(1, bh))
        if 0.65 <= aspect <= 1.45 and area_ratio <= 0.09:
            label = "Icon"
        else:
            label = "Graphic"

        bbox = [float(x), float(y), float(bw), float(bh)]
        if any(bbox_ioa(bbox, s) > 0.6 for s in seen):
            continue
        seen.append(bbox)
        items.append({"label": label, "bbox": bbox, "confidence": 0.7})

    items = sorted(items, key=lambda i: i["bbox"][2] * i["bbox"][3], reverse=True)
    logger.info(f"Detected {len(items)} graphic/icon regions")
    return items


def extract_glyph_mask(crop_np: np.ndarray) -> np.ndarray:
    """Extract a precise binary mask of ONLY text characters and strokes inside a crop.
    Preserves 95%+ of background pixels (gradients, textures, nearby graphics).
    """
    if crop_np.size == 0 or crop_np.shape[0] < 4 or crop_np.shape[1] < 4:
        return np.ones(crop_np.shape[:2], dtype=np.uint8) * 255

    h, w = crop_np.shape[:2]
    gray = cv2.cvtColor(crop_np, cv2.COLOR_RGB2GRAY)

    # 1. Background color estimation from perimeter (border) pixels
    border_mask = np.zeros((h, w), dtype=bool)
    border_mask[0:max(1, int(h * 0.08)), :] = True
    border_mask[-max(1, int(h * 0.08)):, :] = True
    border_mask[:, 0:max(1, int(w * 0.05))] = True
    border_mask[:, -max(1, int(w * 0.05)):] = True

    bg_pixels = crop_np[border_mask]
    bg_median = np.median(bg_pixels, axis=0) if len(bg_pixels) > 0 else np.array([20, 20, 20])

    # 2. Color difference in LAB color space
    crop_lab = cv2.cvtColor(crop_np, cv2.COLOR_RGB2LAB).astype(np.float32)
    bg_lab = cv2.cvtColor(np.uint8([[bg_median]]), cv2.COLOR_RGB2LAB)[0, 0].astype(np.float32)
    diff_lab = np.linalg.norm(crop_lab - bg_lab, axis=2)

    th_val = max(18.0, float(np.percentile(diff_lab, 45)))
    color_glyph = (diff_lab > th_val).astype(np.uint8) * 255

    # 3. Otsu thresholding with border polarity check
    _, otsu1 = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    otsu2 = cv2.bitwise_not(otsu1)
    b_ratio1 = np.mean(otsu1[border_mask] == 255)
    b_ratio2 = np.mean(otsu2[border_mask] == 255)
    best_otsu = otsu2 if b_ratio2 < b_ratio1 else otsu1

    # 4. Combine Otsu and color difference
    combined = cv2.bitwise_and(color_glyph, best_otsu)
    if np.mean(combined == 255) < 0.05:
        combined = best_otsu

    # 5. Clean up noise with morphological opening, dilate slightly (2-3px) to swallow strokes & anti-aliasing
    kernel_clean = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    cleaned = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel_clean)

    kernel_dilate = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    dilated = cv2.dilate(cleaned, kernel_dilate, iterations=1)

    # Fallback if mask is either too small or covering entire crop
    mask_coverage = np.mean(dilated == 255)
    if mask_coverage < 0.02 or mask_coverage > 0.88:
        fb_mask = np.zeros((h, w), dtype=np.uint8)
        inset_y = max(1, int(h * 0.06))
        inset_x = max(1, int(w * 0.04))
        fb_mask[inset_y:h-inset_y, inset_x:w-inset_x] = 255
        return fb_mask

    return dilated


def extract_text_style(img_crop: Image.Image):
    """Extract dominant text fill color, stroke, and font style hint from cropped text patch."""
    try:
        arr = np.array(img_crop.convert("RGB"))
        if arr.size == 0 or arr.shape[0] < 4 or arr.shape[1] < 4:
            return "#FFFFFF", "bold_sans", True

        glyph_mask = extract_glyph_mask(arr)

        kernel_erode = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        core_mask = cv2.erode(glyph_mask, kernel_erode, iterations=1)
        if np.sum(core_mask == 255) < 20:
            core_mask = glyph_mask

        text_pixels = arr[core_mask == 255]
        if len(text_pixels) > 0:
            med = np.median(text_pixels, axis=0).astype(int)
            hex_color = f"#{int(med[0]):02X}{int(med[1]):02X}{int(med[2]):02X}"
        else:
            hex_color = "#FFFFFF"

        outline_mask = cv2.subtract(glyph_mask, core_mask)
        outline_pixels = arr[outline_mask == 255]
        has_stroke = False
        if len(outline_pixels) > 0:
            outline_brightness = float(np.mean(cv2.cvtColor(outline_pixels.reshape(-1, 1, 3), cv2.COLOR_RGB2GRAY)))
            if outline_brightness < 95:
                has_stroke = True

        aspect = arr.shape[1] / max(1, arr.shape[0])
        font_style = "condensed" if aspect < 1.2 else "bold_sans"

        return hex_color, font_style, has_stroke
    except Exception as e:
        logger.warning(f"Style extraction fallback: {e}")
        return "#FFFFFF", "bold_sans", True


def build_layers(img: Image.Image, scale: float):
    """Build all layers. Bounding boxes are in ORIGINAL image coordinates."""
    w, h = img.size
    orig_w = round(w / scale) if scale > 0 else w
    orig_h = round(h / scale) if scale > 0 else h
    inv_scale = 1.0 / scale if scale > 0 else 1.0
    layers = []

    def mask_from_bbox_original(bbox):
        mask = Image.new("L", (orig_w, orig_h), 0)
        draw = ImageDraw.Draw(mask)
        x, y, bw, bh = bbox
        draw.rectangle([x, y, x + bw, y + bh], fill=255)
        buffer = io.BytesIO()
        mask.save(buffer, format="PNG")
        encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{encoded}"

    def mask_from_array(mask_arr):
        if mask_arr is None:
            return None
        if mask_arr.shape != (orig_h, orig_w):
            mask_arr = cv2.resize(mask_arr.astype(np.uint8), (orig_w, orig_h), interpolation=cv2.INTER_NEAREST)
        mask = Image.fromarray(mask_arr.astype(np.uint8), mode="L")
        buffer = io.BytesIO()
        mask.save(buffer, format="PNG")
        encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{encoded}"

    def scale_bbox_to_original(bbox):
        x, y, bw, bh = bbox
        return [
            round(x * inv_scale, 1),
            round(y * inv_scale, 1),
            round(bw * inv_scale, 1),
            round(bh * inv_scale, 1),
        ]

    def normalize_bbox_float(bbox):
        x, y, bw, bh = bbox
        orig_x = x * inv_scale
        orig_y = y * inv_scale
        orig_bw = bw * inv_scale
        orig_bh = bh * inv_scale
        
        nx = max(0.0, min(1.0, orig_x / orig_w))
        ny = max(0.0, min(1.0, orig_y / orig_h))
        nw = max(0.005, min(1.0 - nx, orig_bw / orig_w))
        nh = max(0.005, min(1.0 - ny, orig_bh / orig_h))
        return [round(nx, 4), round(ny, 4), round(nw, 4), round(nh, 4)]

    # Background layer (full normalized [0, 0, 1, 1])
    layers.append({
        "id": "layer_bg",
        "type": "background",
        "label": "Background",
        "bbox": [0.0, 0.0, 1.0, 1.0],
        "mask": mask_from_bbox_original([0, 0, orig_w, orig_h]),
    })

    objects = yolo_detect(img)
    texts = ocr_detect(img)

    faces = []
    if face_analyser is not None:
        try:
            face_boxes = face_analyser.get(np.array(img)[:, :, ::-1])
            for face_idx, face in enumerate(face_boxes):
                try:
                    x1, y1, x2, y2 = [float(v) for v in face.bbox]
                except Exception:
                    continue
                faces.append({
                    "id": f"layer_face_{face_idx + 1}",
                    "type": "face",
                    "label": "Face",
                    "bbox": [x1, y1, x2 - x1, y2 - y1],
                    "confidence": float(getattr(face, 'det_score', 0.0)),
                })
        except Exception as e:
            logger.warning(f"Face detection failed: {e}")

    # Discard text boxes that overlap significantly with detected face/head regions (prevents unwanted boxes over faces)
    if texts and faces:
        clean_texts = []
        for t in texts:
            if any(bbox_ioa(t["bbox"], f["bbox"]) > 0.30 for f in faces):
                logger.info(f"Filtered false positive text box over face: '{t['text']}'")
                continue
            clean_texts.append(t)
        texts = clean_texts

    if texts:
        texts_sorted = sorted(texts, key=lambda t: t["bbox"][1])
        for idx, text_item in enumerate(texts_sorted):
            norm_bbox = normalize_bbox_float(text_item["bbox"])
            tb = text_item["bbox"]
            tx, ty, tw, th = int(tb[0]), int(tb[1]), int(tb[2]), int(tb[3])
            tc_crop = img.crop((tx, ty, tx + max(1, tw), ty + max(1, th)))
            text_color, font_style, has_stroke = extract_text_style(tc_crop)

            layers.append({
                "id": f"layer_text_{idx + 1}",
                "type": "text",
                "label": text_item["text"][:30],
                "content": text_item["text"],
                "bbox": norm_bbox,
                "mask": mask_from_bbox_original(scale_bbox_to_original(text_item["bbox"])),
                "text_color": text_color,
                "font_style": font_style,
                "has_stroke": has_stroke,
            })

    if faces:
        for idx, face_item in enumerate(faces):
            norm_bbox = normalize_bbox_float(face_item["bbox"])
            layers.append({
                "id": face_item["id"],
                "type": "face",
                "label": "Face",
                "bbox": norm_bbox,
                "mask": mask_from_bbox_original(scale_bbox_to_original(face_item["bbox"])),
                "confidence": face_item["confidence"],
            })

    occupied_bboxes = [t["bbox"] for t in texts] + [o["bbox"] for o in objects] + [f["bbox"] for f in faces]

    for idx, obj in enumerate(objects[:YOLO_MAX_OBJECTS]):
        norm_bbox = normalize_bbox_float(obj["bbox"])
        layer_type = "person" if obj["label"] == "person" else "object"
        layer_mask = (
            mask_from_array(obj.get("mask_data"))
            if obj.get("mask_data") is not None
            else mask_from_bbox_original(scale_bbox_to_original(obj["bbox"]))
        )
        layers.append({
            "id": f"layer_obj_{idx + 1}",
            "type": layer_type,
            "label": obj["label"].capitalize(),
            "bbox": norm_bbox,
            "mask": layer_mask,
            "confidence": obj["confidence"],
        })

    graphic_regions = detect_graphic_regions(img)
    for idx, region in enumerate(graphic_regions[:12]):
        if any(bbox_ioa(region["bbox"], b) > 0.5 for b in occupied_bboxes):
            continue
        norm_bbox = normalize_bbox_float(region["bbox"])
        layers.append({
            "id": f"layer_graphic_{idx + 1}",
            "type": "object",
            "label": region.get("label", "Icon"),
            "bbox": norm_bbox,
            "mask": mask_from_bbox_original(scale_bbox_to_original(region["bbox"])),
        })

    deduped = []
    priority = {'background': 0, 'text': 4, 'face': 3, 'person': 2, 'object': 1}
    for layer in sorted(layers, key=lambda l: priority.get(l.get('type'), 0), reverse=True):
        bbox = layer.get('bbox') or [0,0,0,0]
        skip = False
        for ex in deduped:
            if bbox_ioa(bbox, ex.get('bbox', [0,0,0,0])) > 0.7:
                skip = True
                break
        if not skip:
            deduped.append(layer)

    logger.info(f"Built {len(deduped)} total layers after dedupe: {[l['type'] + ':' + l.get('label','') for l in deduped]}")
    return deduped


# ──────────────────────────────────────────────
#  FACE SWAP — InsightFace (free, local, no API)
# ──────────────────────────────────────────────

try:
    import insightface
    from insightface.app import FaceAnalysis
    from gfpgan import GFPGANer

    SWAP_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "inswapper_128.onnx")

    face_analyser = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    face_analyser.prepare(ctx_id=0, det_size=(640, 640))
    logger.info("InsightFace analyser loaded (buffalo_l)")

    if os.path.exists(SWAP_MODEL_PATH):
        face_swapper = insightface.model_zoo.get_model(SWAP_MODEL_PATH, providers=["CPUExecutionProvider"])
        logger.info(f"InsightFace swapper loaded: {SWAP_MODEL_PATH}")
    else:
        face_swapper = None
        logger.warning(f"inswapper_128.onnx not found at {SWAP_MODEL_PATH} — face swap disabled")

    # Initialize GFPGAN for face restoration
    GFPGAN_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "GFPGANv1.4.pth")
    if os.path.exists(GFPGAN_MODEL_PATH):
        # arch='clean', channel_multiplier=2 is for v1.4
        face_restorer = GFPGANer(
            model_path=GFPGAN_MODEL_PATH,
            upscale=1,
            arch='clean',
            channel_multiplier=2,
            bg_upsampler=None # We only want face restoration
        )
        logger.info(f"GFPGAN restorer loaded: {GFPGAN_MODEL_PATH}")
    else:
        face_restorer = None
        logger.warning(f"GFPGAN model not found at {GFPGAN_MODEL_PATH} — quality restoration disabled")
except Exception as e:
    face_analyser = None
    face_swapper = None
    face_restorer = None
    logger.warning(f"AI model initialization failed: {e}")


class FaceSwapRequest(BaseModel):
    source_url: str          # The face photo (the user's face)
    target_url: str          # The thumbnail to paste the face onto
    strength: float = 1.0    # 0.0 – 1.0 (for future enhancements)


class FaceSwapResponse(BaseModel):
    image_base64: str
    width: int
    height: int


@app.post("/face-swap", response_model=FaceSwapResponse)
def face_swap_endpoint(req: FaceSwapRequest):
    """
    High-accuracy face swap pipeline:
    1. Detect faces at high resolution
    2. Swap with inswapper_128 (handles blending and color matching natively)
    3. Light GFPGAN restoration to fix blurriness
    4. Blend restored result with raw swap to preserve original facial features (beard/hair)
    """
    if not face_analyser or not face_swapper:
        raise Exception("Face swap models not loaded. Please check server configuration.")

    logger.info(f"Face swap request: strength={req.strength}")

    try:
        # Download and upscale images for better quality detection
        logger.info("Downloading source image...")
        source_pil = download_image(req.source_url)
        source_pil = upscale_image_if_needed(source_pil, min_threshold=512)

        logger.info("Downloading target image...")
        target_pil = download_image(req.target_url)

        # Convert to BGR for InsightFace
        source_img = np.array(source_pil)[:, :, ::-1]
        target_img = np.array(target_pil)[:, :, ::-1]

        # Detect faces
        logger.info("Detecting faces in source image...")
        source_faces = face_analyser.get(source_img, max_num=1)
        
        logger.info("Detecting faces in target image...")
        target_faces = face_analyser.get(target_img)

        if not source_faces:
            raise Exception(
                "❌ No face detected in your source photo. "
                "Please use: clear front-facing photo, good lighting, no sunglasses/hats, "
                "head fills ~40% of image"
            )
        if not target_faces:
            raise Exception(
                "❌ No face detected in the target image. "
                "Try a different thumbnail that has visible faces."
            )

        source_face = source_faces[0]
        logger.info(f"Source face confidence: {source_face.det_score:.2f}")
        logger.info(f"Target faces found: {len(target_faces)}")

        # ─── FACE SWAP ───
        # inswapper_128 natively handles color matching and seamless cloning perfectly
        result = target_img.copy()
        for idx, tface in enumerate(target_faces):
            logger.info(f"Swapping face {idx + 1}/{len(target_faces)}...")
            result = face_swapper.get(result, tface, source_face, paste_back=True)
            
            # --- RESTORE ORIGINAL FACE COLOR/LIGHTING ---
            try:
                tx1, ty1, tx2, ty2 = map(int, tface.bbox)
                th_img, tw_img = result.shape[:2]
                tx1 = max(0, tx1)
                ty1 = max(0, ty1)
                tx2 = min(tw_img, tx2)
                ty2 = min(th_img, ty2)
                
                if (tx2 - tx1) > 10 and (ty2 - ty1) > 10:
                    swapped_crop = result[ty1:ty2, tx1:tx2]
                    
                    # Normalize skin color to healthy, natural warm skin tones
                    corrected_bgr = _normalize_skin_color(swapped_crop)
                    
                    # Create Gaussian feather mask (std dev = size/4.5) to keep color correction full on the face
                    fh, fw = swapped_crop.shape[:2]
                    mask_y = cv2.getGaussianKernel(fh, fh / 4.5)
                    mask_x = cv2.getGaussianKernel(fw, fw / 4.5)
                    mask_2d = np.outer(mask_y, mask_x)
                    mask_2d = mask_2d / mask_2d.max()
                    
                    mask = np.zeros(swapped_crop.shape, dtype=np.float32)
                    mask[:, :, :] = mask_2d[:, :, np.newaxis]
                    
                    blended = corrected_bgr.astype(np.float32) * mask + swapped_crop.astype(np.float32) * (1.0 - mask)
                    result[ty1:ty2, tx1:tx2] = np.clip(blended, 0, 255).astype(np.uint8)
                    logger.info(f"Restored original face color/lighting for face {idx + 1}")
            except Exception as ce:
                logger.warning(f"Failed to restore original face color: {ce}")

        # ─── FACE RESTORATION (GFPGAN — light touch) ───
        # GFPGAN fixes the 128x128 blurriness, but can sometimes hallucinate features (remove beard/etc).
        # We blend it with the raw swap to get the best of both worlds: sharp details but original features.
        raw_swap = result.copy()
        if face_restorer:
            logger.info("Applying light GFPGAN restoration...")
            try:
                # Some GFPGAN versions support weight parameter, some don't. We'll blend manually.
                _, _, restored = face_restorer.enhance(
                    result,
                    has_aligned=False,
                    only_center_face=False,
                    paste_back=True
                )
                
                # Blend restored with raw swap.
                # 0.6 means 60% GFPGAN (sharpness) and 40% Inswapper (accurate features/beard)
                gfpgan_weight = 0.6
                result = cv2.addWeighted(
                    restored, gfpgan_weight,
                    raw_swap, 1.0 - gfpgan_weight,
                    0
                )
                logger.info(f"GFPGAN applied and blended at {gfpgan_weight:.0%} weight")
            except Exception as re:
                logger.warning(f"Face restoration failed: {re}")
                result = raw_swap

        # ─── POST-PROCESSING ───
        logger.info("Applying post-processing...")
        result_rgb = result[:, :, ::-1]
        pil_result = Image.fromarray(result_rgb.astype('uint8'))

        # Very light sharpening to make features pop slightly
        sharpness_enhancer = ImageEnhance.Sharpness(pil_result)
        pil_result = sharpness_enhancer.enhance(1.1)
        
        # Ensure result doesn't exceed max dimensions
        max_dim = max(pil_result.size)
        if max_dim > 2048:
            scale = 2048 / max_dim
            new_size = (int(pil_result.width * scale), int(pil_result.height * scale))
            pil_result = pil_result.resize(new_size, Image.Resampling.LANCZOS)
            logger.info(f"Downscaled result to {new_size} (max: 2048px)")

        # ─── ENCODE TO BASE64 ───
        buf = io.BytesIO()
        pil_result.save(buf, format="PNG", optimize=False)
        buf.seek(0)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        logger.info(
            f"✅ Face swap complete: {pil_result.size[0]}x{pil_result.size[1]}, "
            f"swapped {len(target_faces)} face(s), output: {len(b64)} bytes"
        )
        
        return FaceSwapResponse(
            image_base64=b64,
            width=pil_result.size[0],
            height=pil_result.size[1],
        )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Face swap failed: {error_msg}")
        raise Exception(f"Face swap error: {error_msg}")


@app.get("/health")
async def health():
    return {
        "status": "ok", 
        "models_loaded": {
            "face_analyser": face_analyser is not None, 
            "face_swapper": face_swapper is not None,
            "face_restorer": face_restorer is not None
        }
    }


@app.post("/detect", response_model=DetectResponse)
def detect(req: DetectRequest):
    """Full detect endpoint: runs OCR, YOLO object detection and graphic contour detection
    and returns a unified list of layers (background, text, objects, graphics, faces).
    """
    logger.info(f"Detect request: image_url={req.image_url[:120]}..., max_dim={req.max_dim}")
    try:
        img = download_image(req.image_url)
        img_resized, scale = resize_image(img, req.max_dim)
        logger.info(f"Image: original={img.size}, resized={img_resized.size}, scale={scale:.3f}")

        # Build comprehensive layers using YOLO + OCR + contour heuristics
        layers = build_layers(img_resized, scale)
        logger.info(f"Detect returning {len(layers)} layers")
        return {"layers": layers}
    except Exception as e:
        logger.error(f"Detect failed: {e}")
        return {"layers": []}


def _cv2_inpaint_erase(orig_img: Image.Image, mask_img: Image.Image, dilation_px: int = 7) -> Image.Image:
    """Use OpenCV Navier-Stokes inpainting to cleanly erase the masked region.
    Much better than Gaussian blur — propagates surrounding pixel colors inward.
    """
    logger.info("Erasing old person using cv2.inpaint (Navier-Stokes)...")
    img_np = np.array(orig_img.convert("RGB"))[:, :, ::-1]  # RGB -> BGR for OpenCV
    mask_np = np.array(mask_img)

    # Dilate mask to catch edge shadows and artifacts
    k_size = dilation_px * 2 + 1 if dilation_px > 0 else 1
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_size, k_size)) if dilation_px > 0 else np.ones((1, 1), np.uint8)
    mask_dilated = cv2.dilate(mask_np, kernel, iterations=1) if dilation_px > 0 else mask_np

    # Navier-Stokes inpainting with radius 15
    result_bgr = cv2.inpaint(img_np, mask_dilated, inpaintRadius=15, flags=cv2.INPAINT_NS)
    result_rgb = result_bgr[:, :, ::-1]  # BGR -> RGB
    logger.info("cv2.inpaint erase complete.")
    return Image.fromarray(result_rgb)


def _color_transfer(source_img: Image.Image, target_region: Image.Image, strength: float = 0.45) -> Image.Image:
    """Transfer color statistics (mean and standard deviation in LAB space)
    from target_region to source_img. strength (0.0 to 1.0) controls blending weight.
    This makes the replacement photo match the ambient lighting of the thumbnail.
    100% local, runs in milliseconds, completely free.
    """
    logger.info(f"Applying LAB color transfer (strength={strength})...")
    src_rgb = np.array(source_img.convert("RGB"))
    tgt_rgb = np.array(target_region.convert("RGB"))

    # Skip if either image is too small
    if src_rgb.size < 10 or tgt_rgb.size < 10:
        logger.warning("Color transfer skipped: image too small")
        return source_img

    src_lab = cv2.cvtColor(src_rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    tgt_lab = cv2.cvtColor(tgt_rgb, cv2.COLOR_RGB2LAB).astype(np.float32)

    s_mean, s_std = cv2.meanStdDev(src_lab)
    t_mean, t_std = cv2.meanStdDev(tgt_lab)

    s_mean = s_mean.flatten()
    s_std = np.clip(s_std.flatten(), 1e-5, None)
    t_mean = t_mean.flatten()
    t_std = np.clip(t_std.flatten(), 1e-5, None)

    # Normalize each LAB channel to target statistics
    result_lab = src_lab.copy()
    for i in range(3):
        result_lab[:, :, i] = (src_lab[:, :, i] - s_mean[i]) * (t_std[i] / s_std[i]) + t_mean[i]

    result_lab = np.clip(result_lab, 0, 255).astype(np.uint8)
    result_rgb = cv2.cvtColor(result_lab, cv2.COLOR_LAB2RGB)

    # Blend original and color-transferred at the given strength
    final_rgb = cv2.addWeighted(src_rgb, 1.0 - strength, result_rgb, strength, 0)
    logger.info("LAB color transfer complete.")
    return Image.fromarray(final_rgb)


def _normalize_skin_color(crop_bgr: np.ndarray) -> np.ndarray:
    """Normalize the A and B color channels in LAB color space of a face crop
    to match natural, healthy human skin tone statistics, removing strong color casts
    (like blue, green, or red ambient tints) while preserving original luminance.
    """
    logger.info("Normalizing skin color to natural tones...")
    try:
        crop_lab = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
        means, stds = cv2.meanStdDev(crop_lab)
        means = means.flatten()
        stds = np.clip(stds.flatten(), 1e-5, None)

        # Target healthy, warm human skin tone averages in LAB space:
        # L (0): keep original to preserve shadows/details/luminance
        # A (1): 139.0 (warm reddish-pink skin range, standard neutral is 128)
        # B (2): 146.0 (healthy yellowish-warm skin range, standard neutral is 128)
        target_means = [means[0], 139.0, 146.0]
        target_stds = [stds[0], 7.5, 7.5]

        result_lab = crop_lab.copy()
        for i in [1, 2]:
            result_lab[:, :, i] = (crop_lab[:, :, i] - means[i]) * (target_stds[i] / stds[i]) + target_means[i]

        result_lab = np.clip(result_lab, 0, 255).astype(np.uint8)
        return cv2.cvtColor(result_lab, cv2.COLOR_LAB2BGR)
    except Exception as e:
        logger.warning(f"Skin color normalization failed: {e}")
        return crop_bgr


def _flux_erase_person(orig_img: Image.Image, mask_img: Image.Image) -> Image.Image:
    """Use FLUX.1-Fill-dev to cleanly regenerate the background where the old person was.
    Returns the full image with the person completely erased and background filled.
    """
    import tempfile
    import random
    from gradio_client import Client as GradioClient, handle_file

    logger.info("Erasing old person using FLUX.1-Fill-dev inpainting...")
    width, height = orig_img.size

    # Save original to temp file
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_img:
        orig_img.save(tmp_img, format="PNG")
        img_path = tmp_img.name

    # Convert mask to RGBA layer (white area with alpha = region to inpaint)
    mask_arr = np.array(mask_img)
    h, w = mask_arr.shape
    rgba_arr = np.zeros((h, w, 4), dtype=np.uint8)
    mask_threshold = mask_arr > 128
    rgba_arr[mask_threshold] = [255, 255, 255, 255]
    mask_rgba = Image.fromarray(rgba_arr, "RGBA")

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_mask:
        mask_rgba.save(tmp_mask, format="PNG")
        mask_path = tmp_mask.name

    try:
        client = GradioClient("black-forest-labs/FLUX.1-Fill-dev", verbose=False)
        edit_images = {
            "background": handle_file(img_path),
            "layers": [handle_file(mask_path)],
            "composite": None,
            "id": None,
        }
        seed = random.randint(0, 2147483647)
        erase_prompt = "Clean background, natural continuation of surrounding area, seamless background fill, no person, no objects, matching lighting and colors"
        logger.info(f"Calling FLUX.1-Fill-dev to erase person with prompt: {erase_prompt[:80]}...")

        result = client.predict(
            edit_images=edit_images,
            prompt=erase_prompt,
            seed=seed,
            randomize_seed=True,
            width=min(width, 1024),
            height=min(height, 1024),
            guidance_scale=30,
            num_inference_steps=28,
            api_name="/infer",
        )

        result_path = result[0] if isinstance(result, (list, tuple)) else result
        erased_img = Image.open(result_path).convert("RGB")

        # Resize back to original dimensions if needed
        if erased_img.size != (width, height):
            erased_img = erased_img.resize((width, height), Image.Resampling.LANCZOS)

        logger.info(f"FLUX erase complete: {erased_img.size}")
        return erased_img
    finally:
        try:
            os.unlink(img_path)
            os.unlink(mask_path)
        except Exception:
            pass


def _enhance_replacement_quality(rep_img: Image.Image, target_w: int = 0, target_h: int = 0) -> Image.Image:
    """MrBeast YouTube Studio Portrait Quality Enhancer:
    1. MrBeast Studio Lighting Recovery: gamma curve (0.85) + 1.08x exposure lift to bring out clean studio catchlights on face & eyes.
    2. Dynamic Micro-Contrast (1.08x): sharpens iris, teeth, facial expressions, and clothing weave for 3D depth.
    3. True-to-Life Skin Color Harmony (1.03x): natural skin warmth without over-saturation or fake orange tint.
    4. Ultra-Crisp HD Lens Sharpness (1.30x): clean 85mm prime lens clarity across facial features and hair.
    5. Clean Transparency: 100% alpha mask preservation.
    """
    try:
        cur_w, cur_h = rep_img.size
        if target_w > 0 and target_h > 0:
            scale_factor = max(target_w / max(cur_w, 1), target_h / max(cur_h, 1))
            if scale_factor > 1.2:
                logger.info(f"Upscaling replacement image {scale_factor:.1f}x using LANCZOS...")
                new_w = int(cur_w * scale_factor)
                new_h = int(cur_h * scale_factor)
                rep_img = rep_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        has_alpha = rep_img.mode == "RGBA"
        alpha_channel = None
        if has_alpha:
            alpha_channel = rep_img.split()[-1]
            rgb_img = rep_img.convert("RGB")
        else:
            rgb_img = rep_img.convert("RGB")

        # 1. Studio Key-Lighting Shadow Lift (Gamma 0.85 brings out studio catchlights softly)
        img_np = np.array(rgb_img, dtype=np.float32) / 255.0
        gamma = 0.85
        shadow_lifted = np.power(img_np, gamma)
        img_uint8 = (shadow_lifted * 255.0).clip(0, 255).astype(np.uint8)
        pil_lifted = Image.fromarray(img_uint8)

        # 2. Exposure & Micro-Contrast Lift (MrBeast Studio Pop)
        enh_bright = ImageEnhance.Brightness(pil_lifted).enhance(1.08)
        enh_contrast = ImageEnhance.Contrast(enh_bright).enhance(1.08)

        # 3. Natural Skin Color Warmth (1.03x balanced)
        enh_color = ImageEnhance.Color(enh_contrast).enhance(1.03)

        # 4. Ultra-Crisp HD Lens Sharpness (1.30x for eye/facial clarity)
        enh_sharp = ImageEnhance.Sharpness(enh_color).enhance(1.30)

        logger.info(f"MrBeast Studio Portrait Enhancement complete: size={enh_sharp.size}")

        if has_alpha and alpha_channel is not None:
            if alpha_channel.size != enh_sharp.size:
                alpha_channel = alpha_channel.resize(enh_sharp.size, Image.Resampling.LANCZOS)
            result = enh_sharp.convert("RGBA")
            result.putalpha(alpha_channel)
            return result
        else:
            return enh_sharp
    except Exception as e:
        logger.warning(f"Failed to enhance replacement quality: {e}")
        return rep_img


def replace_person_cutout(orig_img: Image.Image, req: ReplaceRequest) -> ReplaceResponse:
    """Precise person cutout and silhouetted inpainting:
    1. Cuts out ONLY the selected person using instance segmentation (YOLO-seg / contour).
    2. Zeroes out all other people and all text banners from the mask.
    3. Removes and inpaints ONLY the person's silhouette (not the bounding box rectangle).
    4. Cuts out the replacement image with rembg, and composites it seamlessly.
    """
    from rembg import remove as rembg_remove
    width, height = orig_img.size
    img_np = np.array(orig_img)
    img_bgr = img_np[:, :, ::-1]

    # Parse requested bbox
    if req.bbox and len(req.bbox) == 4:
        bx, by, bw, bh = [float(v) for v in req.bbox]
        if bx <= 1.0 and by <= 1.0 and bw <= 1.0 and bh <= 1.0:
            bx, by, bw, bh = bx * width, by * height, bw * width, bh * height
        bx, by, bw, bh = int(round(bx)), int(round(by)), int(round(bw)), int(round(bh))
    else:
        bx, by, bw, bh = 0, 0, width, height

    req_xyxy = [bx, by, bx + bw, by + bh]
    req_cx = bx + bw / 2.0
    req_cy = by + bh / 2.0

    def calc_iou(b1, b2):
        xA = max(b1[0], b2[0])
        yA = max(b1[1], b2[1])
        xB = min(b1[2], b2[2])
        yB = min(b1[3], b2[3])
        inter = max(0, xB - xA) * max(0, yB - yA)
        a1 = (b1[2] - b1[0]) * (b1[3] - b1[1])
        a2 = (b2[2] - b2[0]) * (b2[3] - b2[1])
        return inter / float(a1 + a2 - inter + 1e-6)

    # 1. Run YOLO-seg on original image to isolate the target person and all other objects
    target_mask = None
    other_people_mask = np.zeros((height, width), dtype=np.uint8)

    if yolo_model:
        try:
            res = yolo_model.predict(img_np, verbose=False, conf=0.15, iou=0.5)[0]
            if res.masks is not None:
                all_person_candidates = []
                for idx, (box, mdata) in enumerate(zip(res.boxes, res.masks.data)):
                    cls = int(box.cls[0])
                    label = res.names.get(cls, "")
                    m_np = mdata.cpu().numpy()
                    m_resized = cv2.resize((m_np * 255).astype(np.uint8), (width, height))

                    if label == "person":
                        xyxy = box.xyxy[0].tolist()
                        iou = calc_iou(req_xyxy, xyxy)
                        dist = np.hypot((xyxy[0] + xyxy[2]) / 2.0 - req_cx, (xyxy[1] + xyxy[3]) / 2.0 - req_cy)
                        score = iou * 2.0 + (1.0 / (1.0 + dist / max(1.0, float(bw))))
                        all_person_candidates.append((idx, xyxy, m_resized, score))
                    else:
                        other_people_mask = cv2.bitwise_or(other_people_mask, m_resized)

                if all_person_candidates:
                    all_person_candidates.sort(key=lambda x: x[3], reverse=True)
                    best_match = all_person_candidates[0]
                    target_mask = best_match[2]
                    logger.info(f"YOLO-seg matched person index {best_match[0]} with score {best_match[3]:.3f}")

                    for cand in all_person_candidates[1:]:
                        other_people_mask = cv2.bitwise_or(other_people_mask, cand[2])
        except Exception as yolo_err:
            logger.warning(f"YOLO segmentation failed in replace: {yolo_err}")

    # 2. Extract text regions via OCR to protect all text banners and titles
    text_mask = np.zeros((height, width), dtype=np.uint8)
    try:
        detected_texts = ocr_detect(orig_img)
        for t in detected_texts:
            tb = t["bbox"]
            tx1 = max(0, int(tb[0]))
            ty1 = max(0, int(tb[1]))
            tx2 = min(width, int(tb[0] + tb[2]))
            ty2 = min(height, int(tb[1] + tb[3]))
            text_mask[ty1:ty2, tx1:tx2] = 255
        logger.info(f"Built protection mask for {len(detected_texts)} detected text elements.")
    except Exception as ocr_err:
        logger.warning(f"OCR text protection failed: {ocr_err}")

    # Fallback if YOLO-seg didn't find person:
    if target_mask is None:
        try:
            person_crop = orig_img.crop((bx, by, bx + bw, by + bh))
            crop_cutout = rembg_remove(person_crop)
            crop_alpha = np.array(crop_cutout.split()[-1])
            target_mask = np.zeros((height, width), dtype=np.uint8)
            target_mask[by:by + bh, bx:bx + bw] = (crop_alpha > 20).astype(np.uint8) * 255
            logger.info("Using rembg crop fallback for person silhouette.")
        except Exception as fb_err:
            logger.warning(f"Fallback person silhouette failed: {fb_err}")
            target_mask = np.zeros((height, width), dtype=np.uint8)
            target_mask[by:by + bh, bx:bx + bw] = 255

    # 3. Clean target mask: strictly remove any neighboring people and any text
    clean_target_mask = cv2.bitwise_and(target_mask, cv2.bitwise_not(other_people_mask))
    clean_target_mask = cv2.bitwise_and(clean_target_mask, cv2.bitwise_not(text_mask))

    # 4. Dilate silhouette by 2-3 pixels to swallow edge anti-aliasing, BUT keep protection intact!
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    dilated_target = cv2.dilate(clean_target_mask, kernel, iterations=1)
    inpaint_mask = cv2.bitwise_and(dilated_target, cv2.bitwise_not(other_people_mask | text_mask))

    # Inpaint ONLY the person silhouette — other parts remain 100% untouched!
    inpainted_bgr = cv2.inpaint(img_bgr, inpaint_mask, inpaintRadius=4, flags=cv2.INPAINT_TELEA)
    clean_bg = Image.fromarray(inpainted_bgr[:, :, ::-1]).convert("RGBA")
    logger.info("Inpainting of person silhouette complete — all other thumbnail elements 100% untouched.")

    # 5. Process replacement image
    rep_img = download_image(req.replacement_image_url).convert("RGBA")
    logger.info("Extracting subject from uploaded replacement image...")
    rep_cutout = rembg_remove(rep_img)
    crop_box = rep_cutout.split()[-1].getbbox()
    if crop_box:
        rep_cutout = rep_cutout.crop(crop_box)
    rep_cutout = _enhance_replacement_quality(rep_cutout)

    # 6. Sizing & Positioning
    if req.overlay_x is not None and req.overlay_y is not None and req.overlay_w is not None and req.overlay_h is not None:
        ox = float(req.overlay_x)
        oy = float(req.overlay_y)
        ow = float(req.overlay_w)
        oh = float(req.overlay_h)
        if ow <= 2.0 and oh <= 2.0:
            ox, oy, ow, oh = ox * width, oy * height, ow * width, oh * height
        target_h = max(1, int(oh))
        target_w = max(1, int(target_h * (rep_cutout.width / max(1, rep_cutout.height))))
        pos_x = int(ox)
        pos_y = int(oy)
    else:
        # Auto-position over old person silhouette
        pts = cv2.findNonZero(clean_target_mask)
        if pts is not None:
            tx, ty, tw, th = cv2.boundingRect(pts)
        else:
            tx, ty, tw, th = bx, by, bw, bh

        aspect = rep_cutout.width / max(1, rep_cutout.height)
        target_h = max(th, int(0.92 * height))
        target_w = int(target_h * aspect)

        # Anchor to right edge if old person was on right edge
        if tx + tw >= width - 35:
            pos_x = width - target_w
        elif tx <= 35:
            pos_x = 0
        else:
            pos_x = tx + tw // 2 - target_w // 2

        if ty + th >= height - 35:
            pos_y = height - target_h
        else:
            pos_y = ty + th - target_h
        if pos_y < 0:
            pos_y = 0

    rep_resized = rep_cutout.resize((target_w, target_h), Image.Resampling.LANCZOS)

    # 7. Soft Edge Feathering & Studio Drop Shadow
    alpha = rep_resized.split()[-1].filter(ImageFilter.GaussianBlur(radius=1.2))
    rep_resized.putalpha(alpha)

    shadow_mask = alpha.filter(ImageFilter.GaussianBlur(radius=8))
    shadow_arr = (np.array(shadow_mask) * 0.30).astype(np.uint8)
    shadow_img = Image.new("RGBA", rep_resized.size, (0, 0, 0, 0))
    shadow_img.putalpha(Image.fromarray(shadow_arr))
    clean_bg.paste(shadow_img, (pos_x + 3, pos_y + 3), shadow_img)

    clean_bg.paste(rep_resized, (pos_x, pos_y), rep_resized)

    result_final = clean_bg.convert("RGB")
    buf = io.BytesIO()
    result_final.save(buf, format="PNG")
    buf.seek(0)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    logger.info(f"Direct person replace completed successfully: size={result_final.size}, base64 len={len(b64)}")
    return ReplaceResponse(
        image_base64=b64,
        width=width,
        height=height,
    )


@app.post("/replace", response_model=ReplaceResponse)
def replace(req: ReplaceRequest):
    logger.info(f"Replace request: image_url={req.image_url[:120]}..., mask_url={req.mask_url[:120]}..., prompt={req.prompt}, edit_type={req.edit_type}")
    try:
        import tempfile
        import shutil
        import random
        try:
            from gradio_client import Client as GradioClient, handle_file
        except ImportError:
            GradioClient = None
            handle_file = None

        # --- List of FLUX/SDXL inpainting Spaces to try (fallback chain) ---
        SPACES = [
            "black-forest-labs/FLUX.1-Fill-dev",
        ]

        # 1. Download original image to a temp file
        orig_img = download_image(req.image_url).convert("RGB")
        width, height = orig_img.size

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_img:
            orig_img.save(tmp_img, format="PNG")
            img_path = tmp_img.name
        logger.info(f"Saved original image to {img_path} ({width}x{height})")

        # 2. Download mask image or construct from bbox
        mask_img = None
        if req.mask_url:
            try:
                mask_img = download_image(req.mask_url).convert("L")
            except Exception as mask_err:
                logger.warning(f"Failed to fetch mask from URL {req.mask_url}: {mask_err}")

        if mask_img is None:
            # Construct a clean mask from bbox if mask_url is missing or failed
            mask_img = Image.new("L", (width, height), 0)
            draw = ImageDraw.Draw(mask_img)
            if req.bbox and len(req.bbox) == 4:
                bx, by, bw, bh = req.bbox
                if bx <= 1.0 and by <= 1.0:
                    bx, by, bw, bh = int(bx * width), int(by * height), int(bw * width), int(bh * height)
                draw.rectangle([bx, by, bx + bw, by + bh], fill=255)
            else:
                draw.rectangle([0, 0, width, height], fill=255)

        # Ensure mask size matches original image
        if mask_img.size != orig_img.size:
            mask_img = mask_img.resize(orig_img.size, Image.Resampling.LANCZOS)

        # Refine the mask using SAM if it's a person/object layer and SAM is available
        is_person_or_object = req.edit_type in ["replace_person", "replace_object"] or req.replacement_image_url is not None
        if is_person_or_object and sam_predictor is not None:
            bbox = mask_img.getbbox()
            if bbox is not None:
                bbox_x1, bbox_y1, bbox_x2, bbox_y2 = bbox
                bbox_w = bbox_x2 - bbox_x1
                bbox_h = bbox_y2 - bbox_y1
                if bbox_w > 0 and bbox_h > 0:
                    logger.info(f"Refining mask using SAM predictor for bbox: {bbox_x1}, {bbox_y1}, {bbox_w}, {bbox_h}...")
                    sam_mask = sam_segment_from_bbox(orig_img, [bbox_x1, bbox_y1, bbox_w, bbox_h])
                    if sam_mask is not None:
                        mask_img = Image.fromarray((sam_mask.astype(np.uint8) * 255), mode="L")
                        logger.info("SAM refinement succeeded, using contour mask instead of rectangular mask.")
                    else:
                        logger.warning("SAM refinement returned None, falling back to original mask.")

        # If replacement_image_url is provided, perform direct image compositing
        # with background removal, proper aspect-ratio fitting, and real replacement
        if req.replacement_image_url:
            logger.info(f"Direct replacement image URL provided: {req.replacement_image_url[:120]}")
            return replace_person_cutout(orig_img, req)

        # Convert mask to RGBA layer (white region = area to inpaint, with alpha) using NumPy for speed
        mask_arr = np.array(mask_img)
        h, w = mask_arr.shape
        rgba_arr = np.zeros((h, w, 4), dtype=np.uint8)
        mask_threshold = mask_arr > 128
        rgba_arr[mask_threshold] = [255, 255, 255, 255]
        mask_rgba = Image.fromarray(rgba_arr, "RGBA")

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_mask:
            mask_rgba.save(tmp_mask, format="PNG")
            mask_path = tmp_mask.name
        logger.info(f"Saved mask layer to {mask_path}")

        # 3. Call the FLUX.1-Fill-dev Space via Gradio Client
        last_error = None
        result_path = None

        for space_id in SPACES:
            try:
                logger.info(f"Connecting to HuggingFace Space: {space_id}")
                client = GradioClient(space_id, verbose=False)

                # The FLUX.1-Fill-dev space expects an ImageEditor dict:
                #   background = original image
                #   layers = [mask layer as RGBA png]
                #   composite = None (auto-computed)
                edit_images = {
                    "background": handle_file(img_path),
                    "layers": [handle_file(mask_path)],
                    "composite": None,
                    "id": None,
                }

                seed = random.randint(0, 2147483647)
                logger.info(f"Calling {space_id} /infer with prompt: {req.prompt[:100]}...")

                result = client.predict(
                    edit_images=edit_images,
                    prompt=req.prompt,
                    seed=seed,
                    randomize_seed=True,
                    width=min(width, 1024),
                    height=min(height, 1024),
                    guidance_scale=30,
                    num_inference_steps=28,
                    api_name="/infer",
                )

                # result is a tuple: (result_image_path, seed)
                if isinstance(result, (list, tuple)):
                    result_path = result[0]
                else:
                    result_path = result

                logger.info(f"FLUX Fill result received: {result_path}")
                break  # Success, stop trying other spaces

            except Exception as e:
                last_error = e
                logger.warning(f"Space {space_id} failed: {e}")
                continue

        if result_path is None:
            raise Exception(f"All inpainting spaces failed. Last error: {last_error}")

        # 4. Read the result image and encode to base64
        result_img = Image.open(result_path).convert("RGB")

        # Resize back to original dimensions if the space changed them
        if result_img.size != (width, height):
            result_img = result_img.resize((width, height), Image.Resampling.LANCZOS)

        buf = io.BytesIO()
        result_img.save(buf, format="PNG")
        buf.seek(0)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        # Clean up temp files
        try:
            os.unlink(img_path)
            os.unlink(mask_path)
        except Exception:
            pass

        logger.info(f"Replace complete: output {result_img.size[0]}x{result_img.size[1]}, base64 length={len(b64)}")
        return ReplaceResponse(
            image_base64=b64,
            width=width,
            height=height,
        )
    except Exception as e:
        logger.error(f"Replace failed: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Image replace failed: {str(e)}")


@app.post("/erase-text", response_model=EraseTextResponse)
def erase_text(req: EraseTextRequest):
    try:
        # 1. Load image from URL or base64
        img = None
        if req.image_base64:
            b64 = req.image_base64
            if b64.startswith("data:image"):
                b64 = b64.split(",", 1)[1]
            img = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")
        elif req.image_url:
            img = download_image(req.image_url)
        else:
            raise Exception("No image provided")
            
        w, h = img.size
        img_np = np.array(img)

        # 2. Convert bounding box to pixel coordinates
        x, y, bw, bh = req.bbox
        if x <= 1.0 and y <= 1.0 and bw <= 1.0 and bh <= 1.0:
            x = int(x * w)
            y = int(y * h)
            bw = int(bw * w)
            bh = int(bh * h)
        else:
            x, y, bw, bh = int(x), int(y), int(bw), int(bh)

        x = max(0, min(w - 1, x))
        y = max(0, min(h - 1, y))
        bw = max(1, min(w - x, bw))
        bh = max(1, min(h - y, bh))

        # 3. Extract stroke-level glyph mask for the text region
        crop_np = img_np[y:y+bh, x:x+bw]
        glyph_mask = extract_glyph_mask(crop_np)

        # 4. Insert glyph mask into full image canvas
        full_mask = np.zeros((h, w), dtype=np.uint8)
        full_mask[y:y+bh, x:x+bw] = glyph_mask

        # 5. Inpaint ONLY the letter strokes with cv2.INPAINT_TELEA (preserves gradients and backgrounds)
        img_bgr = img_np[:, :, ::-1]
        erased_bgr = cv2.inpaint(img_bgr, full_mask, inpaintRadius=4, flags=cv2.INPAINT_TELEA)
        erased_rgb = cv2.cvtColor(erased_bgr, cv2.COLOR_BGR2RGB)
        erased_img = Image.fromarray(erased_rgb)
        
        # 6. Return erased image as base64 PNG
        buf = io.BytesIO()
        erased_img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        
        return EraseTextResponse(
            image_base64=b64,
            width=w,
            height=h
        )
    except Exception as e:
        logger.error(f"Erase text failed: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/blend-composite", response_model=BlendCompositeResponse)
def blend_composite(req: BlendCompositeRequest):
    try:
        def get_img(url, b64, mode="RGB"):
            if b64:
                if b64.startswith("data:image"):
                    b64 = b64.split(",", 1)[1]
                return Image.open(io.BytesIO(base64.b64decode(b64))).convert(mode)
            elif url:
                if mode == "L":
                    resp = requests.get(url, timeout=30)
                    resp.raise_for_status()
                    return Image.open(io.BytesIO(resp.content)).convert("L")
                return download_image(url)
            raise Exception("Missing image source")

        orig_pil = get_img(req.original_url, req.original_base64)
        rep_pil = get_img(req.replacement_url, req.replacement_base64)
        mask_pil = get_img(req.mask_url, req.mask_base64, mode="L")
        
        orig_np = np.array(orig_pil)[:, :, ::-1]  # RGB to BGR
        rep_np = np.array(rep_pil)[:, :, ::-1]
        mask_np = np.array(mask_pil)
        
        # 2. Resize replacement to match original dimensions if needed
        h, w = orig_np.shape[:2]
        if rep_np.shape[:2] != (h, w):
            rep_np = cv2.resize(rep_np, (w, h), interpolation=cv2.INTER_LANCZOS4)
        if mask_np.shape[:2] != (h, w):
            mask_np = cv2.resize(mask_np, (w, h), interpolation=cv2.INTER_LANCZOS4)
            
        # 3. Feather mask edges
        mask_np = cv2.GaussianBlur(mask_np, (9, 9), 4)
        
        # 4. Calculate center of the white region
        M = cv2.moments(mask_np)
        if M["m00"] != 0:
            cX = int(M["m10"] / M["m00"])
            cY = int(M["m01"] / M["m00"])
        else:
            cX, cY = w // 2, h // 2
        center = (cX, cY)
        
        # 5. Apply seamlessClone
        # seamlessClone requires mask to be same size and 255 for foreground.
        try:
            result_np = cv2.seamlessClone(rep_np, orig_np, mask_np, center, cv2.NORMAL_CLONE)
        except Exception as e:
            logger.warning(f"seamlessClone failed: {e}. Falling back to alpha blending.")
            mask_float = mask_np.astype(float) / 255.0
            mask_float = np.stack([mask_float, mask_float, mask_float], axis=2)
            result_np = (rep_np.astype(float) * mask_float + orig_np.astype(float) * (1.0 - mask_float))
            result_np = np.clip(result_np, 0, 255).astype(np.uint8)
            
        result_rgb = result_np[:, :, ::-1]
        
        # 7. Return composited result
        buf = io.BytesIO()
        Image.fromarray(result_rgb).save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        
        return BlendCompositeResponse(
            image_base64=b64,
            width=w,
            height=h
        )
    except Exception as e:
        logger.error(f"Blend composite failed: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8000)
