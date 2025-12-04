# Base image CUDA minimal
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/root/.local/bin:${PATH}"

# Install Python & deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip dan set python alias
RUN pip3 install --no-cache-dir --upgrade pip && \
    ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /app

# Salin requirements dulu (untuk optimalisasi layer cache)
COPY requirements.txt .

# Install Python deps dengan PyTorch CUDA
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cu121 \
    -r requirements.txt \
    && rm -rf /root/.cache

COPY pipman .
