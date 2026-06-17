# Food AI Video Generator

Web tool noi bo de tao video mon an bang AI. Backend dung FastAPI, Jinja2, SQLite, SQLAlchemy va co Mock Mode de phat trien ma khong ton Kling credit.

## Tinh nang

- Form tao video tu noi dung mon an, phong cach, thoi luong va ty le khung hinh.
- Prompt builder rule-based chuyen input thanh prompt tieng Anh toi uu.
- Background job khong giu HTTP request trong luc tao video.
- SQLite luu lich su job, status, prompt, loi va duong dan video local.
- Mock Mode mo phong Kling va copy `data/mock/sample.mp4` sang `data/videos/{job_id}.mp4`.
- Giao dien Jinja/HTML/CSS/JS thuan, co polling status, xem video, tai MP4, retry va xoa job.

## Cau truc

```text
app/
  api/videos.py
  core/config.py
  core/constants.py
  db/database.py
  db/models.py
  repositories/video_job_repository.py
  schemas/video.py
  services/kling_client.py
  services/prompt_builder.py
  services/video_downloader.py
  services/video_job_service.py
  static/css/app.css
  static/js/app.js
  templates/index.html
tests/
data/mock/
data/videos/
```

## Yeu cau

- Python 3.11+
- Windows PowerShell hoac terminal tuong duong

## Cai dat tren Windows

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Them video mau cho Mock Mode:

```powershell
mkdir data\mock
copy C:\path\to\sample.mp4 data\mock\sample.mp4
```

Khoi dong:

```powershell
uvicorn app.main:app --reload
```

Mo trang:

```text
http://127.0.0.1:8000
```

## Chay bang Docker

Yeu cau:

- Docker Desktop
- File `.env` da duoc tao tu `.env.example`

Lenh chay:

```powershell
copy .env.example .env
docker compose up --build
```

Mo trang:

```text
http://127.0.0.1:8000
```

Dung container:

```powershell
docker compose down
```

Du lieu SQLite va video duoc mount ra thu muc local:

```text
data/app.db
data/videos/
data/mock/sample.mp4
```

Khong dua `.env` vao Docker image. API key Kling/OpenAI chi duoc nap luc container chay qua `env_file`.

## Mock Mode

Trong `.env`:

```env
KLING_MOCK_MODE=true
MOCK_VIDEO_PATH=./data/mock/sample.mp4
```

Neu thieu `sample.mp4`, job se chuyen sang `failed` va hien loi ro rang. Server khong crash.

## Real Kling API

Trong `.env`, tat mock va dien cau hinh:

```env
KLING_MOCK_MODE=false
KLING_ACCESS_KEY=your_access_key
KLING_SECRET_KEY=your_secret_key
KLING_API_BASE_URL=https://api-singapore.klingai.com
KLING_MODEL_NAME=kling-v1-6
```

Real mode tao JWT tu `KLING_ACCESS_KEY` va `KLING_SECRET_KEY`, goi text-to-video, poll task, lay video URL va tai MP4 ve local. Hay bat dau bang model `kling-v1-6` de kiem soat chi phi; khi doi model, can doi chieu duration/aspect ratio voi docs Kling hien tai.

## API

- `GET /` - giao dien chinh.
- `POST /api/videos/generate` - tao job, tra ve `202 Accepted`.
- `GET /api/videos/{job_id}` - chi tiet job.
- `GET /api/videos?page=1&page_size=20` - lich su.
- `GET /api/videos/{job_id}/stream` - stream MP4.
- `GET /api/videos/{job_id}/download` - tai MP4.
- `POST /api/videos/{job_id}/retry` - tao job moi tu job failed.
- `DELETE /api/videos/{job_id}` - xoa record va file local neu co.

## Loi thuong gap

- `VIDEO_DOWNLOAD_FAILED`: thieu `data/mock/sample.mp4` trong Mock Mode hoac URL provider khong tai duoc.
- `KLING_REAL_API_NOT_CONFIGURED`: dang tat Mock Mode nhung adapter real chua duoc cau hinh/xac minh.
- `VIDEO_FILE_NOT_FOUND`: job chua completed hoac file local da bi xoa.

## Test

```powershell
pytest
```

## Backup

Dung server truoc khi backup de tranh copy file dang ghi:

```powershell
copy data\app.db backup\app.db
xcopy data\videos backup\videos /E /I
```

## Canh bao credit

Khi chay Real API, moi job co the ton Kling credit. Hay test bang Mock Mode truoc, gioi han noi dung dau vao va theo doi loi rate limit/balance tu provider.
