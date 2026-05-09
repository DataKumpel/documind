FROM python:3.12-slim

# System dependencies for Tesseract OCR and pdf2image
# NOTE: Keep additional packages minimal with --no-install-recommends
# NOTE: poppler-utils is needed for pdf2image
# NOTE: libtesseract-ocr-dev is needed for german language support
# NOTE: Clear out apt lists to reduce image size with "rm -rf /var/lib/apt/lists/*"
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-deu \
    poppler-utils \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
