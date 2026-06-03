# Use a lightweight python image
FROM python:3.10-slim

# Install system dependencies required by OpenCV and other libraries (including curl for downloads)
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Step 1: Install CPU-only PyTorch first (smaller, no CUDA conflicts)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Step 2: Install gfpgan and basicsr with PEP 517 build
RUN pip install --no-cache-dir --use-pep517 basicsr gfpgan

# Step 3: Install remaining requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the download script and run it to fetch validated weights
COPY download_models.py .
RUN python download_models.py

# Copy the rest of the application code
COPY . .

# Expose Hugging Face's default port 7860
EXPOSE 7860

# Run FastAPI app via uvicorn on port 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
