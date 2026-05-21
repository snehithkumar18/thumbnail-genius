import sys
import logging
from pathlib import Path
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_sam")

SAM_CHECKPOINT_URL = "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth"
SAM_CHECKPOINT_PATH = Path("weights") / "sam_vit_b_01ec64.pth"

def _ensure_sam_checkpoint() -> Path:
    SAM_CHECKPOINT_PATH.parent.mkdir(parents=True, exist_ok=True)
    if SAM_CHECKPOINT_PATH.exists() and SAM_CHECKPOINT_PATH.stat().st_size > 1024 * 1024:
        logger.info(f"SAM checkpoint already exists: {SAM_CHECKPOINT_PATH}")
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
    sam_checkpoint = _ensure_sam_checkpoint()
    sam_model = sam_model_registry["vit_b"](checkpoint=str(sam_checkpoint))
    sam_model.to(device="cpu")
    sam_predictor = SamPredictor(sam_model)
    print("SUCCESS: SAM loaded successfully!")
except Exception as e:
    print("FAILED to load SAM:", e)
