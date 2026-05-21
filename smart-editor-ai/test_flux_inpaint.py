import sys
import logging
from PIL import Image, ImageDraw
from gradio_client import Client as GradioClient, handle_file
import tempfile
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_flux")

try:
    logger.info("Initializing Gradio Client for black-forest-labs/FLUX.1-Fill-dev...")
    client = GradioClient("black-forest-labs/FLUX.1-Fill-dev", verbose=False)
    
    # Create a simple red 512x512 image
    img = Image.new("RGB", (512, 512), "red")
    # Draw a green square in the middle
    draw = ImageDraw.Draw(img)
    draw.rectangle([200, 200, 312, 312], fill="green")
    
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_img:
        img.save(tmp_img, format="PNG")
        img_path = tmp_img.name
        
    # Create a mask layer (RGBA) for the middle green square
    mask_rgba = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    mask_draw = ImageDraw.Draw(mask_rgba)
    mask_draw.rectangle([200, 200, 312, 312], fill=(255, 255, 255, 255))
    
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_mask:
        mask_rgba.save(tmp_mask, format="PNG")
        mask_path = tmp_mask.name
        
    edit_images = {
        "background": handle_file(img_path),
        "layers": [handle_file(mask_path)],
        "composite": None,
        "id": None,
    }
    
    prompt = "A shiny golden cube"
    seed = random.randint(0, 2147483647)
    
    logger.info("Sending request to FLUX Space...")
    result = client.predict(
        edit_images=edit_images,
        prompt=prompt,
        seed=seed,
        randomize_seed=True,
        width=512,
        height=512,
        guidance_scale=30,
        num_inference_steps=20,
        api_name="/infer",
    )
    
    print("SUCCESS: FLUX result received!")
    print("Result path:", result)
except Exception as e:
    print("FAILED to call FLUX Space:", e)
