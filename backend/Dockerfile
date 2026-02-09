FROM node:20-alpine as web-build
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json* ./ 
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

WORKDIR /app

RUN mkdir -p /data
ENV DATA_DIR=/data
ENV DATABASE_URL=sqlite:////data/mangat.db

# System deps for pdf2image (poppler) are optional; keep minimal
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -U pip && pip install --no-cache-dir -r /app/requirements.txt

COPY backend/app /app/app
COPY --from=web-build /web/dist /app/app/static

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
