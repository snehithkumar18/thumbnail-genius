from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from PIL import Image, ImageDraw
import io
import requests
import numpy as np
import cv2
import base64
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from ultralytics import YOLO
    logger.info("YOLO imported successfully")
except Exception as e:
    YOLO = None
    logger.warning(f"YOLO import failed: {e}")

try:
    from paddleocr import PaddleOCR
    logger.info("PaddleOCR imported successfully")
except Exception as e:
    PaddleOCR = None
    logger.warning(f"PaddleOCR import failed: {e}")

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

ocr_engine = PaddleOCR(lang='en', use_angle_cls=True, show_log=False) if PaddleOCR else None

yolo_model = YOLO('yolov8n.pt') if YOLO else None

if yolo_model:
    logger.info(f"YOLO model loaded: {yolo_model.model_name if hasattr(yolo_model, 'model_name') else 'yolov8n.pt'}")
else:
    logger.warning("YOLO model NOT loaded — object detection will be skipped")

if ocr_engine:
    logger.info("PaddleOCR engine loaded")
else:
    logger.warning("PaddleOCR engine NOT loaded — text detection will be skipped")


def download_image(url: str) -> Image.Image:
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return Image.open(io.BytesIO(resp.content)).convert("RGB")


def resize_image(img: Image.Image, max_dim: int) -> tuple:
    """Resize image and return (resized_img, scale_factor)"""
    w, h = img.size
    scale = min(max_dim / max(w, h), 1.0)
    if scale == 1.0:
        return img, 1.0
    resized = img.resize((int(w * scale), int(h * scale)))
    return resized, scale


def yolo_detect(img: Image.Image):
    """Detect objects using YOLO. Returns list of {label, bbox, confidence}."""
    if not yolo_model:
        logger.warning("YOLO model not available, skipping object detection")
        return []

    img_np = np.array(img)
    results = yolo_model.predict(img_np, verbose=False, conf=0.25)
    items = []
    for r in results:
        if r.boxes is None or len(r.boxes) == 0:
            continue
        for box in r.boxes:
            cls = int(box.cls[0])
            label = r.names.get(cls, "object")
            conf = float(box.conf[0])
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            items.append({
                "label": label,
                "bbox": [x1, y1, x2 - x1, y2 - y1],
                "confidence": conf,
            })
    logger.info(f"YOLO detected {len(items)} objects: {[i['label'] for i in items]}")
    return items


def ocr_detect(img: Image.Image):
    """Detect ALL text lines using PaddleOCR. Returns list of {text, bbox, confidence}."""
    if not ocr_engine:
        logger.warning("PaddleOCR not available, skipping text detection")
        return []

    img_np = np.array(img)
    result = ocr_engine.ocr(img_np, cls=True)
    items = []

    if not result or not result[0]:
        logger.info("PaddleOCR returned no text")
        return items

    for line in result[0]:
        # PaddleOCR 2.7.x returns (box, (text, confidence))
        box = line[0]
        text_info = line[1]
        if isinstance(text_info, (list, tuple)):
            text = str(text_info[0])
            conf = float(text_info[1]) if len(text_info) > 1 else 0.0
        else:
            text = str(text_info)
            conf = 0.0

        # Skip very short or low-confidence texts
        if len(text.strip()) < 1 or conf < 0.3:
            continue

        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        x1, y1, x2, y2 = min(xs), min(ys), max(xs), max(ys)
        items.append({
            "text": text.strip(),
            "bbox": [x1, y1, x2 - x1, y2 - y1],
            "confidence": conf,
        })

    logger.info(f"PaddleOCR detected {len(items)} text lines: {[i['text'][:20] for i in items]}")
    return items


def build_layers(img: Image.Image, scale: float):
    """Build all layers. Bounding boxes are in ORIGINAL image coordinates."""
    w, h = img.size
    # Original image dimensions (before resize)
    orig_w = round(w / scale) if scale > 0 else w
    orig_h = round(h / scale) if scale > 0 else h
    inv_scale = 1.0 / scale if scale > 0 else 1.0

    layers = []

    def mask_from_bbox_original(bbox):
        """Create mask in original image dimensions."""
        mask = Image.new("L", (orig_w, orig_h), 0)
        draw = ImageDraw.Draw(mask)
        x, y, bw, bh = bbox
        draw.rectangle([x, y, x + bw, y + bh], fill=255)
        buffer = io.BytesIO()
        mask.save(buffer, format="PNG")
        encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{encoded}"

    def scale_bbox_to_original(bbox):
        """Convert bbox from resized coordinates to original image coordinates."""
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

    # Add ALL text lines as separate layers (sorted by vertical position)
    if texts:
        texts_sorted = sorted(texts, key=lambda t: t["bbox"][1])  # sort top to bottom
        for idx, text_item in enumerate(texts_sorted):
            original_bbox = scale_bbox_to_original(text_item["bbox"])
            layers.append({
                "id": f"layer_text_{idx + 1}",
                "type": "text",
                "label": text_item["text"][:30],  # Use actual text as label
                "content": text_item["text"],
                "bbox": original_bbox,
                "mask": mask_from_bbox_original(original_bbox),
            })

    # Add ALL detected objects as layers
    for idx, obj in enumerate(objects[:12]):
        original_bbox = scale_bbox_to_original(obj["bbox"])
        layer_type = "person" if obj["label"] == "person" else "object"
        layers.append({
            "id": f"layer_obj_{idx + 1}",
            "type": layer_type,
            "label": obj["label"].capitalize(),
            "bbox": original_bbox,
            "mask": mask_from_bbox_original(original_bbox),
        })

    logger.info(f"Built {len(layers)} total layers: {[l['type'] + ':' + l['label'] for l in layers]}")
    return layers


@app.get("/health")
def health():
    return {
        "ok": True,
        "yolo_loaded": yolo_model is not None,
        "ocr_loaded": ocr_engine is not None,
    }


@app.post("/detect", response_model=DetectResponse)
def detect(req: DetectRequest):
    logger.info(f"Detect request: image_url={req.image_url[:80]}..., max_dim={req.max_dim}")
    img = download_image(req.image_url)
    original_size = img.size
    img_resized, scale = resize_image(img, req.max_dim)
    logger.info(f"Image: original={original_size}, resized={img_resized.size}, scale={scale:.3f}")
    layers = build_layers(img_resized, scale)
    return {"layers": layers}
