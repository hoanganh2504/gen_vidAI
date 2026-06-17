STYLE_LABELS = {
    "advertising": "Quang cao",
    "mukbang": "Mukbang",
    "review": "Review mon an",
    "cinematic": "Cinematic",
    "asmr": "Food ASMR",
    "cooking": "Huong dan nau an",
}

ALLOWED_DURATIONS = [5, 10]
ALLOWED_ASPECT_RATIOS = ["9:16", "16:9", "1:1"]

STATUS_LABELS = {
    "queued": "Dang xep hang",
    "submitting": "Dang gui yeu cau sang Kling",
    "processing": "AI dang tao video",
    "downloading": "Dang tai video ve he thong",
    "completed": "Hoan thanh",
    "failed": "That bai",
    "cancelled": "Da huy",
}

TERMINAL_STATUSES = {"completed", "failed", "cancelled"}

ERROR_MESSAGES = {
    "VALIDATION_ERROR": "Du lieu khong hop le. Vui long kiem tra lai.",
    "JOB_NOT_FOUND": "Khong tim thay job video.",
    "KLING_AUTH_ERROR": "Kling xac thuc that bai. Vui long kiem tra access key va secret key.",
    "KLING_INSUFFICIENT_BALANCE": "Tai khoan Kling khong du credit.",
    "KLING_RATE_LIMIT": "Kling dang gioi han so luot tao video. Vui long thu lai sau.",
    "KLING_BAD_REQUEST": "Yeu cau gui sang Kling khong hop le.",
    "KLING_CONTENT_REJECTED": "Noi dung bi Kling tu choi.",
    "KLING_TASK_FAILED": "Kling xu ly that bai.",
    "KLING_TIMEOUT": "Qua thoi gian cho Kling tao video.",
    "KLING_NETWORK_ERROR": "Khong ket noi duoc toi Kling.",
    "VIDEO_DOWNLOAD_FAILED": "Khong tai duoc video ve he thong.",
    "VIDEO_FILE_NOT_FOUND": "Khong tim thay file video.",
    "DATABASE_ERROR": "Co loi khi thao tac database.",
    "INTERNAL_ERROR": "Co loi he thong. Vui long thu lai.",
    "KLING_REAL_API_NOT_CONFIGURED": "Real API chua duoc cau hinh day du. Hay bat Mock Mode hoac bo sung cau hinh Kling.",
}
