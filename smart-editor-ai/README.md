# Smart Editor AI Service

Python FastAPI microservice for detection.

## Setup

```bash
cd smart-editor-ai
python -m venv .venv
. .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app:app --host 0.0.0.0 --port 8082
```

## Notes
- Uses YOLOv8 (ultralytics) + PaddleOCR.
- Replace with MobileSAM integration as needed.
