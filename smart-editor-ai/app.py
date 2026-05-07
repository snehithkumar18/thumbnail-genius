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
    """Download and convert image to RGB"""
    resp = requests.get(url, timeout=30)
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
        for box in r.boxes:
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
            items.append({
                "label": label,
                "bbox": [x1, y1, x2 - x1, y2 - y1],
                "confidence": confv,
            })
    logger.info(f"YOLO detected {len(items)} objects: {[i['label'] for i in items]}")
    return items


def ocr_detect(img: Image.Image):
    """Try PaddleOCR first (better accuracy), fall back to EasyOCR variants.
    Returns list of {text, bbox, confidence} in resized-image coordinates.
    """
    items = []
    seen_boxes = []

    def add_detection(box, text, conf):
        x1, y1, x2, y2 = box
        bbox = [x1, y1, x2 - x1, y2 - y1]
        for sb in seen_boxes:
            if bbox_ioa(bbox, sb) > 0.6:
                return
        seen_boxes.append(bbox)
        items.append({"text": text.strip(), "bbox": bbox, "confidence": conf})

    img_np = np.array(img)
    h, w = img_np.shape[:2]

    # Prefer PaddleOCR if available (more accurate on stylized text)
    if paddle_ocr_engine is not None:
        try:
            # paddleocr returns list of lists [[(box), (text), score], ...]
            result = paddle_ocr_engine.ocr(np.array(img)[:, :, ::-1], cls=True)
            for line in result:
                for seg in line:
                    box = seg[0]
                    text = seg[1][0] if isinstance(seg[1], (list, tuple)) else seg[1]
                    conf = float(seg[1][1]) if isinstance(seg[1], (list, tuple)) and len(seg[1]) > 1 else 0.5
                    xs = [p[0] for p in box]
                    ys = [p[1] for p in box]
                    x1, y1, x2, y2 = min(xs), min(ys), max(xs), max(ys)
                    if len(text.strip()) < 1 or conf < 0.2:
                        continue
                    add_detection((x1, y1, x2, y2), text, conf)
            logger.info(f"PaddleOCR detected {len(items)} text items")
            if items:
                return items
        except Exception as e:
            logger.warning(f"PaddleOCR read failed: {e}, falling back to EasyOCR")

    # Fallback to EasyOCR multi-variant method
    if not ocr_engine:
        logger.warning("No OCR engine available, skipping text detection")
        return []

    # Prepare preprocessing variants
    variants = []
    if len(img_np.shape) == 3 and img_np.shape[2] == 3:
        variants.append(cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR))
    else:
        variants.append(img_np)
    try:
        hsv = cv2.cvtColor(img_np, cv2.COLOR_RGB2HSV)
        hsv[:,:,2] = cv2.equalizeHist(hsv[:,:,2])
        variants.append(cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR))
    except Exception:
        pass
    try:
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        th = cv2.adaptiveThreshold(gray,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15)
        variants.append(cv2.cvtColor(th, cv2.COLOR_GRAY2BGR))
    except Exception:
        pass
    for s in (1.5, 2.0):
        try:
            neww, newh = int(w * s), int(h * s)
            up = cv2.resize(img_np, (neww, newh), interpolation=cv2.INTER_CUBIC)
            variants.append(cv2.cvtColor(up, cv2.COLOR_RGB2BGR))
        except Exception:
            pass

    for var in variants:
        try:
            results = ocr_engine.readtext(var)
        except Exception as e:
            logger.warning(f"EasyOCR readtext failed on variant: {e}")
            continue
        if not results:
            continue
        for det in results:
            box = det[0]
            text = str(det[1])
            conf = float(det[2])
            if len(text.strip()) < 1 or conf < 0.25:
                continue
            xs = [p[0] for p in box]
            ys = [p[1] for p in box]
            x1, y1, x2, y2 = min(xs), min(ys), max(xs), max(ys)
            add_detection((x1, y1, x2, y2), text, conf)

    logger.info(f"EasyOCR detected {len(items)} text lines after variants: {[i['text'][:20] for i in items]}")
    return items


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
    """Detect large graphic/thumbnail regions via contours and thresholding.
    This aims to find logos, screenshot inserts, badge-like graphics and flat color regions.
    """
    img_np = np.array(img)
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

    # Edge-based contours
    edges = cv2.Canny(gray, 80, 160)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)
    contours_e, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Threshold-based regions (for flat-color logos and badges)
    _, th = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    th = cv2.medianBlur(th, 3)
    th = cv2.dilate(th, np.ones((5,5), np.uint8), iterations=1)
    contours_t, _ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    contours = contours_e + contours_t
    h, w = gray.shape[:2]
    image_area = float(w * h)
    items = []
    seen = []
    for c in contours:
        x, y, bw, bh = cv2.boundingRect(c)
        if bw < GRAPHIC_MIN_EDGE_LEN or bh < GRAPHIC_MIN_EDGE_LEN:
            continue
        area = float(bw * bh)
        area_ratio = area / image_area
        if area_ratio < GRAPHIC_MIN_AREA_RATIO or area_ratio > GRAPHIC_MAX_AREA_RATIO:
            continue
        bbox = [float(x), float(y), float(bw), float(bh)]
        # avoid near-duplicates
        if any(bbox_ioa(bbox, s) > 0.7 for s in seen):
            continue
        seen.append(bbox)
        items.append({"label": "graphic", "bbox": bbox, "confidence": 0.5})

    items = sorted(items, key=lambda i: i["bbox"][2] * i["bbox"][3], reverse=True)
    logger.info(f"Contour/threshold detected {len(items)} graphic regions")
    return items


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

    def scale_bbox_to_original(bbox):
        x, y, bw, bh = bbox
        return [
            round(x * inv_scale, 1),
            round(y * inv_scale, 1),
            round(bw * inv_scale, 1),
            round(bh * inv_scale, 1),
        ]

    # Background layer (full original image)
    layers.append({
        "id": "layer_bg",
        "type": "background",
        "label": "Background",
        "bbox": [0, 0, orig_w, orig_h],
        "mask": mask_from_bbox_original([0, 0, orig_w, orig_h]),
    })

    # Run detections on resized image
    objects = yolo_detect(img)
    texts = ocr_detect(img)

    # Face layers from InsightFace to better separate person/face regions
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

    # Add ALL text lines as separate layers (sorted by vertical position)
    if texts:
        texts_sorted = sorted(texts, key=lambda t: t["bbox"][1])
        for idx, text_item in enumerate(texts_sorted):
            original_bbox = scale_bbox_to_original(text_item["bbox"])
            text_mask = sam_segment_from_bbox(img, text_item["bbox"])
            layers.append({
                "id": f"layer_text_{idx + 1}",
                "type": "text",
                "label": text_item["text"][:30],
                "content": text_item["text"],
                "bbox": original_bbox,
                "mask": mask_png_from_bool(text_mask) if text_mask is not None else mask_from_bbox_original(original_bbox),
            })

    if faces:
        for idx, face_item in enumerate(faces):
            original_bbox = scale_bbox_to_original(face_item["bbox"])
            face_mask = sam_segment_from_bbox(img, face_item["bbox"])
            layers.append({
                "id": face_item["id"],
                "type": "face",
                "label": "Face",
                "bbox": original_bbox,
                "mask": mask_png_from_bool(face_mask) if face_mask is not None else mask_from_bbox_original(original_bbox),
                "confidence": face_item["confidence"],
            })

    occupied_bboxes = [t["bbox"] for t in texts] + [o["bbox"] for o in objects] + [f["bbox"] for f in faces]

    for idx, obj in enumerate(objects[:YOLO_MAX_OBJECTS]):
        original_bbox = scale_bbox_to_original(obj["bbox"])
        layer_type = "person" if obj["label"] == "person" else "object"
        obj_mask = sam_segment_from_bbox(img, obj["bbox"])
        layers.append({
            "id": f"layer_obj_{idx + 1}",
            "type": layer_type,
            "label": obj["label"].capitalize(),
            "bbox": original_bbox,
            "mask": mask_png_from_bool(obj_mask) if obj_mask is not None else mask_from_bbox_original(original_bbox),
            "confidence": obj["confidence"],
        })

    # Fallback: detect graphic-like regions (logos, screenshots, UI cards)
    graphic_regions = detect_graphic_regions(img)
    for idx, region in enumerate(graphic_regions[:12]):
        if any(bbox_ioa(region["bbox"], b) > 0.5 for b in occupied_bboxes):
            continue
        original_bbox = scale_bbox_to_original(region["bbox"])
        region_mask = sam_segment_from_bbox(img, region["bbox"])
        layers.append({
            "id": f"layer_graphic_{idx + 1}",
            "type": "object",
            "label": "Graphic",
            "bbox": original_bbox,
            "mask": mask_png_from_bool(region_mask) if region_mask is not None else mask_from_bbox_original(original_bbox),
        })

    # Dedupe overlapping layers: prefer text > person > object > graphic
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
except Exception as e:
    face_analyser = None
    face_swapper = None
    logger.warning(f"InsightFace import failed: {e}")


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
    Enhanced face swap endpoint with:
    - Image upscaling for low-res inputs
    - Better face detection
    - Post-processing for sharpness and color
    - High-quality PNG output
    """
    if not face_analyser or not face_swapper:
        raise Exception("Face swap models not loaded. Please check server configuration.")

    logger.info(f"Face swap request: strength={req.strength}")

    try:
        # Download and upscale images for better quality
        logger.info("Downloading source image...")
        source_pil = download_image(req.source_url)
        source_pil = upscale_image_if_needed(source_pil, min_threshold=512)

        logger.info("Downloading target image...")
        target_pil = download_image(req.target_url)

        # Convert to BGR for InsightFace
        source_img = np.array(source_pil)[:, :, ::-1]
        target_img = np.array(target_pil)[:, :, ::-1]

        # Detect faces with better parameters
        logger.info("Detecting faces in source image...")
        source_faces = face_analyser.get(source_img, max_num=1)  # Get only best face
        
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

        # Swap faces with quality refinement
        result = target_img.copy()
        for idx, tface in enumerate(target_faces):
            logger.info(f"Swapping face {idx + 1}/{len(target_faces)}...")
            result = face_swapper.get(result, tface, source_face, paste_back=True)

        # ─── POST-PROCESSING FOR QUALITY ───
        logger.info("Applying post-processing...")
        result_rgb = result[:, :, ::-1]
        pil_result = Image.fromarray(result_rgb.astype('uint8'))

        # Step 1: Enhance sharpness for face details
        sharpness_enhancer = ImageEnhance.Sharpness(pil_result)
        pil_result = sharpness_enhancer.enhance(1.2)  # +20% sharpness
        logger.info("Applied sharpness enhancement")

        # Step 2: Enhance color saturation for better skin tone
        color_enhancer = ImageEnhance.Color(pil_result)
        pil_result = color_enhancer.enhance(1.1)  # +10% saturation
        logger.info("Applied color enhancement")

        # Step 3: Slight contrast boost for better definition
        contrast_enhancer = ImageEnhance.Contrast(pil_result)
        pil_result = contrast_enhancer.enhance(1.08)  # +8% contrast
        logger.info("Applied contrast enhancement")

        # Step 4: Ensure result doesn't exceed max dimensions
        max_dim = max(pil_result.size)
        if max_dim > 2048:
            scale = 2048 / max_dim
            new_size = (int(pil_result.width * scale), int(pil_result.height * scale))
            pil_result = pil_result.resize(new_size, Image.Resampling.LANCZOS)
            logger.info(f"Downscaled result to {new_size} (max: 2048px)")

        # ─── ENCODE TO BASE64 ───
        buf = io.BytesIO()
        # Use PNG for lossless quality (better than JPEG)
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
    return {"status": "ok", "models_loaded": {"face_analyser": face_analyser is not None, "face_swapper": face_swapper is not None}}


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


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8000)
