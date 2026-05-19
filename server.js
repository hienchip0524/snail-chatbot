import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';
import { SYSTEM_PROMPT } from './system-prompt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

if (!process.env.GEMINI_API_KEY) {
  console.warn('WARNING: Missing GEMINI_API_KEY. Copy .env.example to .env and add your key.');
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store for demo. For production, replace with database/cloud storage.
const sessions = new Map();

function getSession(sessionId = 'default') {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { history: [], files: [] });
  }
  return sessions.get(sessionId);
}

function shortHistory(history) {
  return history
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'Người dùng' : 'Chatbot'}: ${m.text}`)
    .join('\n');
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, model: MODEL });
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  const sessionId = req.body.sessionId || 'default';

  if (!req.file) {
    return res.status(400).json({ error: 'Không có file được tải lên.' });
  }

  try {
    const mimeType = req.file.mimetype || 'application/octet-stream';
    const uploaded = await ai.files.upload({
      file: req.file.path,
      config: {
        mimeType,
        displayName: req.file.originalname,
      },
    });

    const session = getSession(sessionId);
    session.files.push({
      name: uploaded.name,
      uri: uploaded.uri,
      mimeType: uploaded.mimeType || mimeType,
      displayName: req.file.originalname,
      uploadedAt: new Date().toISOString(),
    });

    fs.unlink(req.file.path, () => {});

    res.json({
      ok: true,
      file: {
        displayName: req.file.originalname,
        mimeType: uploaded.mimeType || mimeType,
        name: uploaded.name,
      },
    });
  } catch (error) {
    fs.unlink(req.file.path, () => {});
    console.error(error);
    res.status(500).json({
      error: 'Không upload được file lên Gemini. Hãy kiểm tra API key, định dạng file hoặc dung lượng file.',
      detail: error.message,
    });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Tin nhắn không hợp lệ.' });
  }

  try {
    const session = getSession(sessionId);
    const fileParts = session.files.map((f) => createPartFromUri(f.uri, f.mimeType));

    const userPrompt = `
Lịch sử hội thoại gần đây:
${shortHistory(session.history) || '(Chưa có lịch sử)'}

Các file người dùng đã tải lên trong phiên này:
${session.files.length ? session.files.map((f, i) => `${i + 1}. ${f.displayName} (${f.mimeType})`).join('\n') : '(Chưa có file)'}

Câu hỏi mới của người dùng:
${message}

Hãy trả lời bằng tiếng Việt, ưu tiên thông tin trong file đã tải lên nếu có. Nếu dữ liệu chưa có, nói rõ là tài liệu chưa cung cấp, không tự bịa.
`;

    const contents = createUserContent([...fileParts, userPrompt]);

    const result = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.35,
      },
    });

    const text = result.text || 'Xin lỗi, hiện tôi chưa tạo được câu trả lời.';
    session.history.push({ role: 'user', text: message });
    session.history.push({ role: 'model', text });

    res.json({ reply: text, files: session.files.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Không gọi được Gemini API. Hãy kiểm tra API key, model hoặc kết nối mạng.',
      detail: error.message,
    });
  }
});

app.post('/api/reset', (req, res) => {
  const { sessionId = 'default' } = req.body || {};
  sessions.delete(sessionId);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Golden Snail Chatbot running at http://localhost:${PORT}`);
});
