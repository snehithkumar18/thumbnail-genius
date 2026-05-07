from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from PIL import Image, ImageDraw
import os
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
    import easyocr
    logger.info("EasyOCR imported successfully")
except Exception as e:
    easyocr = None
    logger.warning(f"EasyOCR import failed: {e}")

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

YOLO_CONF = 0.2
YOLO_MAX_OBJECTS = 24
GRAPHIC_MIN_AREA_RATIO = 0.01
GRAPHIC_MAX_AREA_RATIO = 0.6
GRAPHIC_MIN_EDGE_LEN = 40

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


def yolo_detect(img: Image.Image, conf: float = YOLO_CONF):
    """Detect objects using YOLO. Returns list of {label, bbox, confidence}."""
    if not yolo_model:
        logger.warning("YOLO model not available, skipping object detection")
        return []

    img_np = np.array(img)
    results = yolo_model.predict(img_np, verbose=False, conf=conf, iou=0.5)
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
    """Detect ALL text lines using EasyOCR. Returns list of {text, bbox, confidence}."""
    if not ocr_engine:
        logger.warning("EasyOCR not available, skipping text detection")
        return []

    img_np = np.array(img)
    # Convert RGB to BGR for EasyOCR
    if len(img_np.shape) == 3 and img_np.shape[2] == 3:
        img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    else:
        img_bgr = img_np
    
    result = ocr_engine.readtext(img_bgr)
    items = []

    if not result:
        logger.info("EasyOCR returned no text")
        return items

    for detection in result:
        # EasyOCR returns (bbox, text, confidence)
        # bbox is [[x1,y1], [x2,y1], [x2,y2], [x1,y2]]
        box = detection[0]
        text = str(detection[1])
        conf = float(detection[2])

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

    logger.info(f"EasyOCR detected {len(items)} text lines: {[i['text'][:20] for i in items]}")
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
    """Detect large graphic/thumbnail regions via contours (logos, screenshots, cards)."""
    img_np = np.array(img)
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, 80, 160)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    h, w = gray.shape[:2]
    image_area = float(w * h)
    items = []
    for c in contours:
        x, y, bw, bh = cv2.boundingRect(c)
        if bw < GRAPHIC_MIN_EDGE_LEN or bh < GRAPHIC_MIN_EDGE_LEN:
            continue
        area = float(bw * bh)
        area_ratio = area / image_area
        if area_ratio < GRAPHIC_MIN_AREA_RATIO or area_ratio > GRAPHIC_MAX_AREA_RATIO:
            continue
        items.append({
            "label": "graphic",
            "bbox": [float(x), float(y), float(bw), float(bh)],
            "confidence": 0.5,
        })

    items = sorted(items, key=lambda i: i["bbox"][2] * i["bbox"][3], reverse=True)
    logger.info(f"Contour detected {len(items)} graphic regions")
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
    occupied_bboxes = [t["bbox"] for t in texts] + [o["bbox"] for o in objects]

    for idx, obj in enumerate(objects[:YOLO_MAX_OBJECTS]):
        original_bbox = scale_bbox_to_original(obj["bbox"])
        layer_type = "person" if obj["label"] == "person" else "object"
        layers.append({
            "id": f"layer_obj_{idx + 1}",
            "type": layer_type,
            "label": obj["label"].capitalize(),
            "bbox": original_bbox,
            "mask": mask_from_bbox_original(original_bbox),
        })

    # Fallback: detect graphic-like regions (logos, screenshots, UI cards)
    graphic_regions = detect_graphic_regions(img)
    for idx, region in enumerate(graphic_regions[:12]):
        if any(bbox_ioa(region["bbox"], b) > 0.5 for b in occupied_bboxes):
            continue
        original_bbox = scale_bbox_to_original(region["bbox"])
        layers.append({
            "id": f"layer_graphic_{idx + 1}",
            "type": "object",
            "label": "Graphic",
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
    strength: float = 1.0    # 0.0 – 1.0


class FaceSwapResponse(BaseModel):
    image_base64: str
    width: int
    height: int


@app.post("/face-swap", response_model=FaceSwapResponse)
def face_swap_endpoint(req: FaceSwapRequest):
    if not face_analyser or not face_swapper:
        raise Exception("Face swap models not loaded")

    logger.info(f"Face swap: source={req.source_url[:60]}... target={req.target_url[:60]}...")

    # Download both images
    source_img = np.array(download_image(req.source_url))[:, :, ::-1]  # RGB->BGR for InsightFace
    target_img = np.array(download_image(req.target_url))[:, :, ::-1]

    # Detect faces
    source_faces = face_analyser.get(source_img)
    target_faces = face_analyser.get(target_img)

    if not source_faces:
        raise Exception("No face detected in the source (your face) image")
    if not target_faces:
        raise Exception("No face detected in the target thumbnail")

    # Pick the largest source face (most prominent)
    source_face = max(source_faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

    # Swap every face in the target with the source face
    result = target_img.copy()
    for tface in target_faces:
        result = face_swapper.get(result, tface, source_face, paste_back=True)

    # Convert BGR->RGB->PNG->base64
    result_rgb = result[:, :, ::-1]
    pil_result = Image.fromarray(result_rgb)
    buf = io.BytesIO()
    pil_result.save(buf, format="PNG", quality=95)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    logger.info(f"Face swap complete: {pil_result.size[0]}x{pil_result.size[1]}, swapped {len(target_faces)} face(s)")
    return FaceSwapResponse(
        image_base64=b64,
        width=pil_result.size[0],
        height=pil_result.size[1],
    )


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8000)
