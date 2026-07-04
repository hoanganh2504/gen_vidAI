# Food AI Video Generator

Ứng dụng tạo video món ăn bằng AI với FastAPI, Jinja2, SQLite và tích hợp Kling.

## Tính năng

- Giao diện tạo prompt và theo dõi tiến trình video
- Đăng nhập cơ bản trước khi sử dụng
- Mock mode để test local khi chưa có khóa thật
- Real mode gọi API Kling để tạo video thật
- Lưu lịch sử job và file video vào local

## Cấu trúc chính

```text
app/
  api/
  core/
  db/
  repositories/
  schemas/
  services/
  static/
  templates/
```

## Yêu cầu

- Python 3.11+
- Docker Desktop (nếu dùng Docker)
- Windows PowerShell hoặc terminal tương đương

## Chạy thủ công trên Windows

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Chỉnh sửa file `.env` trước khi chạy:

```env
KLING_MOCK_MODE=false
KLING_ACCESS_KEY=your_access_key
KLING_SECRET_KEY=your_secret_key
KLING_API_BASE_URL=https://api-singapore.klingai.com
KLING_MODEL_NAME=kling-v1-6
AUTH_USERNAME=admin
AUTH_PASSWORD=admin
```

Khởi động server:

```powershell
uvicorn app.main:app --reload
```

Mở trình duyệt:

```text
http://127.0.0.1:8000
```

## Chạy bằng Docker

Tạo file `.env` trước:

```powershell
copy .env.example .env
```

Khởi động container:

```powershell
docker compose up --build
```

Mở:

```text
http://127.0.0.1:8000
```

Dừng container:

```powershell
docker compose down
```

Dữ liệu SQLite và video được lưu ở thư mục local:

```text
data/app.db
data/videos/
data/mock/
```

## Mock mode

Đặt:

```env
KLING_MOCK_MODE=true
MOCK_VIDEO_PATH=./data/mock/sample.mp4
```

Nếu thiếu file mẫu, job sẽ báo lỗi rõ ràng nhưng server vẫn chạy.

## Real Kling API

Đặt:

```env
KLING_MOCK_MODE=false
KLING_ACCESS_KEY=your_access_key
KLING_SECRET_KEY=your_secret_key
KLING_API_BASE_URL=https://api-singapore.klingai.com
KLING_MODEL_NAME=kling-v1-6
```

## Test

```powershell
pytest -q
```
