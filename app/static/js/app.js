const statusLabels = {
  queued: 'Đang xếp hàng',
  submitting: 'Đang gửi yêu cầu sang Kling',
  processing: 'AI đang tạo video',
  downloading: 'Đang tải video về hệ thống',
  completed: 'Hoàn thành',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
};

const styleLabels = {
  advertising: 'Quảng cáo',
  mukbang: 'Mukbang',
  review: 'Review món ăn',
  cinematic: 'Cinematic',
  asmr: 'Food ASMR',
};

const contentEl = document.getElementById('content');
const charcount = document.getElementById('charcount');
const contentError = document.getElementById('content-error');
const form = document.getElementById('video-form');
const createBtn = document.getElementById('create-btn');
const createSpinner = document.getElementById('create-spinner');
const createLabel = document.getElementById('create-label');
const statusArea = document.getElementById('status-area');
const emptyState = document.getElementById('empty-state');
const statusText = document.getElementById('status-text');
const statusSpinner = document.getElementById('status-spinner');
const jobMeta = document.getElementById('job-meta');
const progressInner = document.getElementById('progress-inner');
const videoContainer = document.getElementById('video-container');
const player = document.getElementById('player');
const downloadLink = document.getElementById('download-link');
const optimizedPrompt = document.getElementById('optimized-prompt');
const errorArea = document.getElementById('error-area');
const historyList = document.getElementById('history-list');
const newBtn = document.getElementById('new-btn');
const toast = document.getElementById('toast');

let currentJobId = null;
let pollTimer = null;
let toastTimer = null;

function showToast(message) {
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.display = 'none';
  }, 3200);
}

function getErrorMessage(payload, fallback = 'Có lỗi xảy ra. Vui lòng thử lại.') {
  return payload?.error?.message || payload?.detail?.error?.message || payload?.detail || fallback;
}

function setSubmitting(isSubmitting) {
  createBtn.disabled = isSubmitting;
  createSpinner.classList.toggle('d-none', !isSubmitting);
  createLabel.textContent = isSubmitting ? 'Đang tạo yêu cầu...' : 'Tạo video AI';
}

function updateCharCount() {
  if (contentEl.value.length > 500) {
    contentEl.value = contentEl.value.slice(0, 500);
  }
  charcount.textContent = `${contentEl.value.length}/500`;
}

function validateContent() {
  const value = contentEl.value.trim();
  contentError.textContent = '';
  if (value.length < 3) {
    contentError.textContent = 'Nội dung phải có ít nhất 3 ký tự.';
    return false;
  }
  return true;
}

function resetResult() {
  currentJobId = null;
  clearPoll();
  emptyState.classList.remove('d-none');
  statusArea.classList.add('d-none');
  errorArea.classList.add('d-none');
  videoContainer.classList.add('d-none');
  newBtn.classList.add('d-none');
  player.removeAttribute('src');
  player.load();
}

function clearPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function renderJob(job) {
  emptyState.classList.add('d-none');
  statusArea.classList.remove('d-none');
  newBtn.classList.remove('d-none');
  errorArea.classList.add('d-none');

  const label = statusLabels[job.status] || job.status;
  statusText.textContent = label;
  jobMeta.textContent = `${job.content} • ${styleLabels[job.style] || job.style} • ${job.duration}s • ${job.aspect_ratio}`;
  progressInner.style.width = `${Math.round((job.progress || 0) * 100)}%`;
  statusSpinner.classList.toggle('d-none', ['completed', 'failed', 'cancelled'].includes(job.status));

  if (job.status === 'completed') {
    videoContainer.classList.remove('d-none');
    player.src = `/api/videos/${job.id}/stream`;
    downloadLink.href = `/api/videos/${job.id}/download`;
    optimizedPrompt.textContent = job.optimized_prompt || '';
  } else {
    videoContainer.classList.add('d-none');
  }

  if (job.status === 'failed') {
    errorArea.classList.remove('d-none');
    errorArea.innerHTML = `<strong>Tạo video thất bại.</strong><div>${job.error_message || 'Vui lòng thử lại.'}</div><button class="btn btn-sm btn-outline-danger mt-2" type="button" onclick="retryJob(${job.id})">Thử lại</button>`;
  }
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(getErrorMessage(payload));
  }
  return payload;
}

async function fetchJob(jobId) {
  const payload = await apiFetch(`/api/videos/${jobId}`);
  return payload.data;
}

function pollJob(jobId) {
  clearPoll();
  const tick = async () => {
    try {
      const job = await fetchJob(jobId);
      renderJob(job);
      await refreshHistory();
      if (['completed', 'failed', 'cancelled'].includes(job.status)) {
        clearPoll();
      }
    } catch (error) {
      showToast(error.message);
    }
  };
  tick();
  pollTimer = setInterval(tick, 3000);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!validateContent()) return;

  const payload = {
    content: contentEl.value.trim(),
    style: document.getElementById('style').value,
    duration: Number(document.getElementById('duration').value),
    aspect_ratio: document.getElementById('aspect_ratio').value,
  };

  setSubmitting(true);
  try {
    const result = await apiFetch('/api/videos/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    currentJobId = result.data.id;
    showToast('Đã tạo job video.');
    pollJob(currentJobId);
    await refreshHistory();
  } catch (error) {
    showToast(error.message);
  } finally {
    setSubmitting(false);
  }
});

contentEl.addEventListener('input', () => {
  updateCharCount();
  validateContent();
});

document.querySelectorAll('.sample').forEach((button) => {
  button.addEventListener('click', () => {
    contentEl.value = button.textContent;
    updateCharCount();
    validateContent();
  });
});

newBtn.addEventListener('click', resetResult);
document.getElementById('refresh-history').addEventListener('click', refreshHistory);

async function refreshHistory() {
  try {
    const payload = await apiFetch('/api/videos?page=1&page_size=20');
    const rows = payload.data;
    if (!rows.length) {
      historyList.innerHTML = '<div class="text-secondary">Chưa có lịch sử.</div>';
      return;
    }

    historyList.innerHTML = rows.map((job) => {
      const canDownload = job.status === 'completed';
      const canRetry = job.status === 'failed';
      const created = job.created_at ? new Date(job.created_at).toLocaleString('vi-VN') : '';
      return `
        <article class="history-item">
          <div>
            <strong>${escapeHtml(job.content)}</strong>
            <div class="small text-secondary">${styleLabels[job.style] || job.style} • ${job.duration}s • ${job.aspect_ratio} • ${created}</div>
            <span class="badge ${job.status === 'completed' ? 'text-bg-success' : job.status === 'failed' ? 'text-bg-danger' : 'text-bg-secondary'}">${statusLabels[job.status] || job.status}</span>
          </div>
          <div class="history-actions">
            <button class="btn btn-sm btn-outline-primary" type="button" onclick="viewJob(${job.id})">Xem</button>
            ${canDownload ? `<a class="btn btn-sm btn-outline-success" href="/api/videos/${job.id}/download">Tải</a>` : ''}
            ${canRetry ? `<button class="btn btn-sm btn-outline-warning" type="button" onclick="retryJob(${job.id})">Thử lại</button>` : ''}
            <button class="btn btn-sm btn-outline-danger" type="button" onclick="deleteJob(${job.id})">Xóa</button>
          </div>
        </article>
      `;
    }).join('');
  } catch (error) {
    historyList.innerHTML = '<div class="text-danger">Không tải được lịch sử.</div>';
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

window.viewJob = async function viewJob(id) {
  try {
    currentJobId = id;
    const job = await fetchJob(id);
    renderJob(job);
    if (!['completed', 'failed', 'cancelled'].includes(job.status)) {
      pollJob(id);
    } else {
      clearPoll();
    }
  } catch (error) {
    showToast(error.message);
  }
};

window.retryJob = async function retryJob(id) {
  try {
    const payload = await apiFetch(`/api/videos/${id}/retry`, { method: 'POST' });
    currentJobId = payload.data.id;
    showToast('Đã tạo job thử lại.');
    pollJob(currentJobId);
    await refreshHistory();
  } catch (error) {
    showToast(error.message);
  }
};

window.deleteJob = async function deleteJob(id) {
  if (!confirm('Xóa job này khỏi lịch sử?')) return;
  try {
    await apiFetch(`/api/videos/${id}`, { method: 'DELETE' });
    if (currentJobId === id) resetResult();
    await refreshHistory();
    showToast('Đã xóa job.');
  } catch (error) {
    showToast(error.message);
  }
};

updateCharCount();
refreshHistory();
