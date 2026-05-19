const sessionId = crypto.randomUUID();
const messages = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const fileStatus = document.getElementById('fileStatus');
const resetBtn = document.getElementById('resetBtn');
const micBtn = document.getElementById('micBtn');
const camera = document.getElementById('camera');
const canvas = document.getElementById('canvas');
const openCameraBtn = document.getElementById('openCameraBtn');
const captureBtn = document.getElementById('captureBtn');
const cameraStatus = document.getElementById('cameraStatus');

function addMessage(role, text) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.innerHTML = `<div class="bubble"></div>`;
  div.querySelector('.bubble').textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  const clean = text.replace(/[*#`_]/g, '').slice(0, 900);
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = 'vi-VN';
  utterance.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

async function sendMessage(text) {
  addMessage('user', text);
  addMessage('bot', 'Đang suy nghĩ...');
  const lastBot = messages.lastElementChild.querySelector('.bubble');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: text }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || data.error || 'Lỗi không xác định');
    lastBot.textContent = data.reply;
    speak(data.reply);
  } catch (err) {
    lastBot.textContent = `Lỗi: ${err.message}`;
  }
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  messageInput.value = '';
  await sendMessage(text);
});

messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = messageInput.scrollHeight + 'px';
});

document.querySelectorAll('.quick').forEach((btn) => {
  btn.addEventListener('click', () => sendMessage(btn.textContent));
});

async function uploadFile(file, customStatusElement = fileStatus) {
  const form = new FormData();
  form.append('sessionId', sessionId);
  form.append('file', file);

  customStatusElement.textContent = 'Đang upload file...';
  const response = await fetch('/api/upload', { method: 'POST', body: form });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || data.error || 'Upload thất bại');
  customStatusElement.textContent = `Đã thêm file: ${data.file.displayName}`;
  return data;
}

uploadBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) {
    fileStatus.textContent = 'Bạn chưa chọn file.';
    return;
  }
  uploadBtn.disabled = true;
  try {
    await uploadFile(file);
  } catch (err) {
    fileStatus.textContent = `Lỗi: ${err.message}`;
  } finally {
    uploadBtn.disabled = false;
  }
});

resetBtn.addEventListener('click', async () => {
  await fetch('/api/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  messages.innerHTML = '';
  addMessage('bot', 'Đã reset phiên chat. Bạn có thể bắt đầu lại hoặc upload file mới.');
  fileStatus.textContent = '';
});

micBtn.addEventListener('click', () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    addMessage('bot', 'Trình duyệt này chưa hỗ trợ speech-to-text. Bạn có thể dùng Chrome để thử chức năng giọng nói.');
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = 'vi-VN';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.start();
  micBtn.textContent = '🎧';
  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    messageInput.value = text;
    sendMessage(text);
  };
  recognition.onerror = () => addMessage('bot', 'Tôi chưa nghe rõ. Bạn thử nói lại hoặc nhập bằng bàn phím nhé.');
  recognition.onend = () => (micBtn.textContent = '🎙️');
});

openCameraBtn.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    camera.srcObject = stream;
    camera.hidden = false;
    cameraStatus.textContent = 'Camera đã mở. Bấm “Chụp & upload” để gửi ảnh.';
  } catch (err) {
    cameraStatus.textContent = `Không mở được camera: ${err.message}`;
  }
});

captureBtn.addEventListener('click', async () => {
  if (!camera.srcObject) {
    cameraStatus.textContent = 'Bạn cần mở camera trước.';
    return;
  }
  canvas.width = camera.videoWidth || 1280;
  canvas.height = camera.videoHeight || 720;
  canvas.getContext('2d').drawImage(camera, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
    try {
      await uploadFile(file, cameraStatus);
      await sendMessage('Hãy phân tích ảnh vừa chụp. Nếu thấy dấu hiệu ốc bươu vàng, trứng ốc, bùn/rác hoặc điều kiện ruộng cần lưu ý, hãy hướng dẫn ngắn gọn cho nông dân.');
    } catch (err) {
      cameraStatus.textContent = `Lỗi: ${err.message}`;
    }
  }, 'image/jpeg', 0.92);
});
