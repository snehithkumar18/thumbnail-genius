
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
