# syntax=docker/dockerfile:1

FROM node:22-alpine AS frontend-builder
WORKDIR /frontend
COPY gen_vidAI/frontend/package*.json ./
RUN npm ci
COPY gen_vidAI/frontend/ ./
RUN npm run build

FROM python:3.11-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY gen_vidAI/frontend/public ./gen_vidAI/frontend/public
COPY --from=frontend-builder /frontend/dist ./gen_vidAI/frontend/dist
COPY .env.example README.md ./

RUN mkdir -p /app/data/mock /app/data/videos

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
