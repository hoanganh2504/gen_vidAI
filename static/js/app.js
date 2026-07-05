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

// Icon set used for the history action buttons (Xem/Tải/Xóa). Kept as
// plain SVG strings so they inherit currentColor from whatever
// btn-outline-* class is applied (primary/success/danger).
const ACTION_ICONS = {
  view: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><polyline points="7 10 12 15 17 10"/><path d="M5 21h14"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
};

function getEl(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`Missing element with id=${id}`);
  }
  return el;
}

const contentEl = getEl('content');
const charcount = getEl('charcount');
const contentError = getEl('content-error');
const form = getEl('video-form');
const createBtn = getEl('create-btn');
const createSpinner = getEl('create-spinner');
const createLabel = getEl('create-label');
const statusArea = getEl('status-area');
const emptyState = getEl('empty-state');
const statusText = getEl('status-text');
const statusSpinner = getEl('status-spinner');
const jobMeta = getEl('job-meta');
const progressInner = getEl('progress-inner');
const videoContainer = getEl('video-container');
const player = getEl('player');
const downloadLink = getEl('download-link');
const optimizedPrompt = getEl('optimized-prompt');
const errorArea = getEl('error-area');
const historyList = getEl('history-list');
const newBtn = getEl('new-btn');
const toast = getEl('toast');

let currentJobId = null;
let pollTimer = null;
let toastTimer = null;

function showToast(message) {
  if (!toast) {
    console.warn('Toast element missing, message:', message);
    return;
  }
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.display = 'none';
  }, 3200);
}

// Global error handlers to capture uncaught errors and promises
window.addEventListener('error', (ev) => {
  try {
    const msg = ev?.message || String(ev);
    console.error('Uncaught error:', ev.error || ev);
    showToast(msg);
  } catch (e) {
    console.error('Error in global error handler', e);
  }
});

window.addEventListener('unhandledrejection', (ev) => {
  try {
    const reason = ev?.reason;
    console.error('Unhandled rejection:', reason);
    showToast(reason?.message || String(reason));
  } catch (e) {
    console.error('Error in rejection handler', e);
  }
});

function getErrorMessage(payload, fallback = 'Có lỗi xảy ra. Vui lòng thử lại.') {
  return payload?.error?.message || payload?.detail?.error?.message || payload?.detail || fallback;
}

function setSubmitting(isSubmitting) {
  if (createBtn) createBtn.disabled = isSubmitting;
  if (createSpinner && createSpinner.classList) createSpinner.classList.toggle('d-none', !isSubmitting);
  if (createLabel) createLabel.textContent = isSubmitting ? 'Đang tạo yêu cầu...' : 'Tạo video AI';
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
  if (emptyState && emptyState.classList) emptyState.classList.remove('d-none');
  if (statusArea && statusArea.classList) statusArea.classList.add('d-none');
  if (errorArea && errorArea.classList) errorArea.classList.add('d-none');
  if (videoContainer && videoContainer.classList) videoContainer.classList.add('d-none');
  if (newBtn && newBtn.classList) newBtn.classList.add('d-none');
  if (player) {
    try {
      player.removeAttribute('src');
      player.load();
    } catch (e) {
      console.warn('Player reset failed', e);
    }
  }
}

function clearPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function renderJob(job) {
  if (emptyState && emptyState.classList) emptyState.classList.add('d-none');
  if (statusArea && statusArea.classList) statusArea.classList.remove('d-none');
  if (newBtn && newBtn.classList) newBtn.classList.remove('d-none');
  if (errorArea && errorArea.classList) errorArea.classList.add('d-none');

  const label = statusLabels[job.status] || job.status;
  if (statusText) statusText.textContent = label;
  if (jobMeta) jobMeta.textContent = `${job.content} • ${styleLabels[job.style] || job.style} • ${job.duration}s • ${job.aspect_ratio}`;
  if (progressInner) progressInner.style.width = `${Math.round((job.progress || 0) * 100)}%`;
  if (statusSpinner && statusSpinner.classList) statusSpinner.classList.toggle('d-none', ['completed', 'failed', 'cancelled'].includes(job.status));

  if (job.status === 'completed') {
    if (videoContainer && videoContainer.classList) videoContainer.classList.remove('d-none');
    if (player) player.src = `/api/videos/${job.id}/stream`;
    if (downloadLink) downloadLink.href = `/api/videos/${job.id}/download`;
    if (optimizedPrompt) optimizedPrompt.textContent = job.optimized_prompt || '';
  } else {
    if (videoContainer && videoContainer.classList) videoContainer.classList.add('d-none');
  }

  if (job.status === 'failed') {
    if (errorArea && errorArea.classList) {
      errorArea.classList.remove('d-none');
      errorArea.innerHTML = `<strong>Tạo video thất bại.</strong><div>${job.error_message || 'Vui lòng thử lại.'}</div><button class="btn btn-sm btn-outline-danger mt-2" type="button" onclick="retryJob(${job.id})">Thử lại</button>`;
    }
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

if (form) {
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
} else {
  console.warn('Video form not found; submit disabled');
}

contentEl.addEventListener('input', () => {
  updateCharCount();
  validateContent();
});

document.querySelectorAll('.sample').forEach((button) => {
  button.addEventListener('click', () => {
    if (!contentEl) return;
    contentEl.value = button.textContent;
    updateCharCount();
    validateContent();
  });
});

if (newBtn) newBtn.addEventListener('click', resetResult);
const refreshBtn = getEl('refresh-history');
if (refreshBtn) refreshBtn.addEventListener('click', refreshHistory);
document.getElementById('new-clip').addEventListener('click', () => {
  contentEl.value = '';
  updateCharCount();
  validateContent();
  resetResult();
});

window.addEventListener('DOMContentLoaded', () => {
  updateCharCount();
  refreshHistory();
});

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
            <button class="btn btn-sm btn-outline-primary icon-btn" type="button" onclick="viewJob(${job.id})" title="Xem" aria-label="Xem">${ACTION_ICONS.view}</button>
            ${canDownload ? `<a class="btn btn-sm btn-outline-success icon-btn" href="/api/videos/${job.id}/download" title="Tải" aria-label="Tải">${ACTION_ICONS.download}</a>` : ''}
            ${canRetry ? `<button class="btn btn-sm btn-outline-warning" type="button" onclick="retryJob(${job.id})">Thử lại</button>` : ''}
            <button class="btn btn-sm btn-outline-danger icon-btn" type="button" onclick="deleteJob(${job.id})" title="Xóa" aria-label="Xóa">${ACTION_ICONS.trash}</button>
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