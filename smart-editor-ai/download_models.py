import os
import urllib.request
import sys

def download_file(url, dest_path, expected_min_size):
    print(f"Downloading {url} to {dest_path}...")
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    
    # Try downloading with a standard User-Agent header to bypass blocks
    opener = urllib.request.build_opener()
    opener.addheaders = [('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')]
    urllib.request.install_opener(opener)
    
    try:
        urllib.request.urlretrieve(url, dest_path)
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        # Cleanup if file created
        if os.path.exists(dest_path):
            os.remove(dest_path)
        return False
        
    if os.path.exists(dest_path):
        size = os.path.getsize(dest_path)
        print(f"Downloaded size: {size} bytes")
        if size < expected_min_size:
            print(f"Error: Downloaded file is too small ({size} bytes). Expected at least {expected_min_size} bytes.")
            os.remove(dest_path)
            return False
        return True
    return False

# 1. Download inswapper_128.onnx (using verified open HuggingFace / GitHub URLs)
inswapper_urls = [
    "https://huggingface.co/ashleykleynhans/inswapper/resolve/main/inswapper_128.onnx",
    "https://huggingface.co/ezioruan/inswapper_128.onnx/resolve/main/inswapper_128.onnx",
    "https://huggingface.co/Kuvshin/kuvshin8/resolve/main/insightface/inswapper_128.onnx",
    "https://github.com/facefusion/facefusion-assets/releases/download/models-3.0.0/inswapper_128.onnx"
]
inswapper_dest = os.path.join("models", "inswapper_128.onnx")
# Expected size: ~554 MB (554,253,681 bytes)
success_inswapper = False
for url in inswapper_urls:
    if download_file(url, inswapper_dest, 500 * 1024 * 1024):
        success_inswapper = True
        break

# 2. Download GFPGANv1.4.pth
gfpgan_urls = [
    "https://github.com/TencentARC/GFPGAN/releases/download/v1.3.4/GFPGANv1.4.pth",
    "https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth",
    "https://huggingface.co/GDF/GFPGAN/resolve/main/GFPGANv1.4.pth"
]
gfpgan_dest = os.path.join("models", "GFPGANv1.4.pth")
# Expected size: ~348 MB (348,632,874 bytes)
success_gfpgan = False
for url in gfpgan_urls:
    if download_file(url, gfpgan_dest, 300 * 1024 * 1024):
        success_gfpgan = True
        break

# 3. Download sam_vit_b_01ec64.pth (SAM checkpoint)
sam_urls = [
    "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth",
    "https://huggingface.co/YouLiXiya/YL-SAM/resolve/main/sam_vit_b_01ec64.pth",
    "https://huggingface.co/scenario-labs/sam_vit/resolve/main/sam_vit_b_01ec64.pth"
]
sam_dest = os.path.join("weights", "sam_vit_b_01ec64.pth")
# Expected size: ~375 MB (375,042,383 bytes)
success_sam = False
for url in sam_urls:
    if download_file(url, sam_dest, 350 * 1024 * 1024):
        success_sam = True
        break

if not success_inswapper:
    print("FATAL: Failed to download inswapper_128.onnx")
    sys.exit(1)

if not success_gfpgan:
    print("FATAL: Failed to download GFPGANv1.4.pth")
    sys.exit(1)

if not success_sam:
    print("FATAL: Failed to download sam_vit_b_01ec64.pth")
    sys.exit(1)

print("All models downloaded successfully!")
