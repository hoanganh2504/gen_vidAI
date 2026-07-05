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

const ACTION_ICONS = {
  view: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><polyline points="7 10 12 15 17 10"/><path d="M5 21h14"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
};

function getEl(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`Missing element with id=${id}`);
  return el;
}

const contentEl = getEl('content');
const charcount = getEl('charcount');
const contentError = getEl('content-error');
const form = getEl('video-form');
const createBtn = getEl('create-btn');
const createSpinner = getEl('create-spinner');
const createLabel = getEl('create-label');
const historyList = getEl('history-list');
const newBtn = getEl('new-clip');
const toast = getEl('toast');

const chatScroll = getEl('chat-scroll');
const composerIntro = getEl('composer-intro');
const chatMessages = getEl('chat-messages');
const storyboardBody = getEl('storyboard-body');

let currentJobId = null;
let pollTimer = null;
let toastTimer = null;

// ---------------------------------- Toast / error helpers ----------------------------------
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

window.addEventListener('error', (ev) => {
  try {
    showToast(ev?.message || String(ev));
  } catch (e) {
    console.error('Error in global error handler', e);
  }
});

window.addEventListener('unhandledrejection', (ev) => {
  try {
    showToast(ev?.reason?.message || String(ev?.reason));
  } catch (e) {
    console.error('Error in rejection handler', e);
  }
});

function getErrorMessage(payload, fallback = 'Có lỗi xảy ra. Vui lòng thử lại.') {
  return payload?.error?.message || payload?.detail?.error?.message || payload?.detail || fallback;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
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

// ---------------------------------- Composer helpers ----------------------------------
function setSubmitting(isSubmitting) {
  if (createBtn) createBtn.disabled = isSubmitting;
  if (createSpinner) createSpinner.classList.toggle('d-none', !isSubmitting);
  if (createLabel) createLabel.textContent = isSubmitting ? 'Đang tạo yêu cầu...' : 'Tạo video AI';
}

function updateCharCount() {
  if (contentEl.value.length > 500) contentEl.value = contentEl.value.slice(0, 500);
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

// ---------------------------------- Chat feed ----------------------------------
function scrollChatToBottom() {
  if (chatScroll) chatScroll.scrollTop = chatScroll.scrollHeight;
}

function hideIntro() {
  if (composerIntro) composerIntro.classList.add('d-none');
}

function addUserMessage(job) {
  hideIntro();
  const wrap = document.createElement('div');
  wrap.className = 'chat-msg user';
  wrap.innerHTML = `
    <div class="msg-bubble">
      <div>${escapeHtml(job.content)}</div>
      <div class="msg-meta">${styleLabels[job.style] || job.style} • ${job.duration}s • ${job.aspect_ratio}</div>
    </div>
  `;
  chatMessages.appendChild(wrap);
  scrollChatToBottom();
}

function ensureAssistantMessage(jobId, initialLabel) {
  let el = document.getElementById(`job-msg-${jobId}`);
  if (el) return el;
  hideIntro();
  const wrap = document.createElement('div');
  wrap.className = 'chat-msg assistant';
  wrap.id = `job-msg-${jobId}`;
  wrap.innerHTML = `
    <div class="msg-bubble status-bubble">
      <div class="status-line">
        <span class="spinner-border spinner-border-sm text-primary status-spinner"></span>
        <span class="status-text">${initialLabel || 'Đang xếp hàng'}</span>
      </div>
      <div class="progress"><div class="progress-bar" style="width:0%"></div></div>
      <div class="status-error d-none"></div>
      <div class="status-prompt d-none">
        <details>
          <summary>Prompt đã tối ưu</summary>
          <pre class="prompt-box"></pre>
        </details>
      </div>
    </div>
  `;
  chatMessages.appendChild(wrap);
  scrollChatToBottom();
  return wrap;
}

function updateAssistantMessage(job) {
  const el = ensureAssistantMessage(job.id, statusLabels[job.status] || job.status);
  const label = statusLabels[job.status] || job.status;
  const statusText = el.querySelector('.status-text');
  const spinner = el.querySelector('.status-spinner');
  const progressBar = el.querySelector('.progress-bar');
  const errorBox = el.querySelector('.status-error');
  const promptBox = el.querySelector('.status-prompt');
  const promptPre = promptBox ? promptBox.querySelector('.prompt-box') : null;
  const isDone = ['completed', 'failed', 'cancelled'].includes(job.status);

  if (statusText) statusText.textContent = label;
  if (spinner) spinner.classList.toggle('d-none', isDone);
  if (progressBar) progressBar.style.width = `${Math.round((job.progress || 0) * 100)}%`;

  if (job.status === 'failed') {
    errorBox.classList.remove('d-none');
    errorBox.innerHTML = `
      <strong>Tạo video thất bại.</strong>
      <div>${escapeHtml(job.error_message || 'Vui lòng thử lại.')}</div>
      <button class="btn btn-sm btn-outline-danger" type="button" onclick="retryJob(${job.id})">Thử lại</button>
    `;
    if (promptBox) promptBox.classList.add('d-none');
  } else if (job.status === 'completed') {
    errorBox.classList.add('d-none');
    statusText.textContent = `${label} • xem kết quả ở Storyboard →`;
    if (promptBox && promptPre && job.optimized_prompt) {
      promptPre.textContent = job.optimized_prompt;
      promptBox.classList.remove('d-none');
    }
  } else {
    errorBox.classList.add('d-none');
    if (promptBox) promptBox.classList.add('d-none');
  }
  scrollChatToBottom();
}

// ---------------------------------- Storyboard (result) ----------------------------------
function renderStoryboardPlaceholder() {
  storyboardBody.innerHTML = `
    <div id="storyboard-placeholder" class="storyboard-placeholder">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
      <p>Storyboard của bạn sẽ xuất hiện ở đây sau khi tạo.</p>
    </div>
  `;
}

function renderStoryboard(job) {
  if (!job) {
    renderStoryboardPlaceholder();
    return;
  }

  if (job.status === 'completed') {
    storyboardBody.innerHTML = `
      <div class="storyboard-video">
        <video id="player" controls preload="metadata" src="/api/videos/${job.id}/stream"></video>
        <a class="btn btn-outline-primary btn-sm" href="/api/videos/${job.id}/download">Download MP4</a>
      </div>
    `;
  } else if (job.status === 'failed') {
    storyboardBody.innerHTML = `
      <div class="storyboard-generating">
        <strong>Tạo video thất bại</strong>
        <p>${escapeHtml(job.error_message || 'Vui lòng thử lại.')}</p>
        <button class="btn btn-sm btn-outline-danger" type="button" onclick="retryJob(${job.id})">Thử lại</button>
      </div>
    `;
  } else {
    storyboardBody.innerHTML = `
      <div class="storyboard-generating">
        <div class="spinner-border spinner-border-sm text-primary"></div>
        <strong>${statusLabels[job.status] || job.status}</strong>
        <p>${escapeHtml(job.content)}</p>
        <div class="progress"><div class="progress-bar" style="width:${Math.round((job.progress || 0) * 100)}%"></div></div>
      </div>
    `;
  }
}

// ---------------------------------- Polling ----------------------------------
function clearPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function openJobThread(job) {
  clearPoll();
  chatMessages.innerHTML = ''; // clear toàn bộ chat cũ trước khi mở job này
  composerIntro.classList.add('d-none');
  addUserMessage(job);
  ensureAssistantMessage(job.id, statusLabels[job.status] || job.status);
  updateAssistantMessage(job);
  renderStoryboard(job);
}

function pollJob(jobId) {
  clearPoll();
  const tick = async () => {
    try {
      const job = await fetchJob(jobId);
      updateAssistantMessage(job);
      if (currentJobId === jobId) renderStoryboard(job);
      await refreshHistory();
      if (['completed', 'failed', 'cancelled'].includes(job.status)) clearPoll();
    } catch (error) {
      showToast(error.message);
    }
  };
  tick();
  pollTimer = setInterval(tick, 3000);
}

// ---------------------------------- Form submit ----------------------------------
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
      const job = result.data;
      currentJobId = job.id;

      chatMessages.innerHTML = '';
      openJobThread(job);

      contentEl.value = '';
      updateCharCount();

      pollJob(job.id);
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


if (newBtn) {
  newBtn.addEventListener('click', () => {
    clearPoll();
    currentJobId = null;
    chatMessages.innerHTML = '';
    composerIntro.classList.remove('d-none');
    renderStoryboardPlaceholder();
    contentEl.value = '';
    updateCharCount();
    validateContent();
  });
}

const refreshBtn = getEl('refresh-history');
if (refreshBtn) refreshBtn.addEventListener('click', refreshHistory);

window.addEventListener('DOMContentLoaded', () => {
  updateCharCount();
  refreshHistory();
});

// ---------------------------------- History ----------------------------------
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

// ---------------------------------- History actions ----------------------------------
window.viewJob = async function viewJob(id) {
  try {
    currentJobId = id;
    const job = await fetchJob(id);
    openJobThread(job);
    if (!['completed', 'failed', 'cancelled'].includes(job.status)) {
      pollJob(id);
    }
  } catch (error) {
    showToast(error.message);
  }
};

window.retryJob = async function retryJob(id) {
  try {
    const payload = await apiFetch(`/api/videos/${id}/retry`, { method: 'POST' });
    const job = payload.data;
    currentJobId = job.id;
    openJobThread(job);
    showToast('Đã tạo job thử lại.');
    pollJob(job.id);
    await refreshHistory();
  } catch (error) {
    showToast(error.message);
  }
};

window.deleteJob = async function deleteJob(id) {
  if (!confirm('Xóa job này khỏi lịch sử?')) return;
  try {
    await apiFetch(`/api/videos/${id}`, { method: 'DELETE' });
    if (currentJobId === id) {
      currentJobId = null;
      renderStoryboardPlaceholder();
    }
    await refreshHistory();
    showToast('Đã xóa job.');
  } catch (error) {
    showToast(error.message);
  }
};

updateCharCount();
refreshHistory();