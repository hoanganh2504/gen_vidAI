# Food AI Video Generator - Docker Release

## Yeu cau

- Cai Docker Desktop
- Mo Docker Desktop truoc khi chay

## Chay lan dau

1. Giai nen goi release.
2. Chay:

```powershell
.\run-docker.ps1
```

Lan dau script se tao file `.env`. Mo `.env` va dien API key:

```env
KLING_MOCK_MODE=false
KLING_ACCESS_KEY=
KLING_SECRET_KEY=
KLING_API_BASE_URL=https://api-singapore.klingai.com
KLING_MODEL_NAME=kling-v1-6

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
USE_GPT_PROMPT_BUILDER=true
```

Sau khi dien key, chay lai:

```powershell
.\run-docker.ps1
```

Mo web:

```text
http://127.0.0.1:8000
```

## Dung app

```powershell
.\stop-docker.ps1
```

## Du lieu

Database va video nam o:

```text
data/app.db
data/videos/
```

## Mock Mode

Neu muon test khong ton Kling credit:

```env
KLING_MOCK_MODE=true
```

Them video mau:

```text
data/mock/sample.mp4
```
