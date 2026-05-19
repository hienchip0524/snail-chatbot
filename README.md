# Ốc Vàng AI - Chatbot tư vấn máy thu gom ốc bươu vàng

Đây là prototype web chatbot dùng Gemini API từ Google AI Studio.

## Chức năng có sẵn

- Chat hỏi đáp về máy thu gom ốc bươu vàng và trứng.
- System prompt riêng cho dự án nông nghiệp.
- Add file: upload PDF, TXT, DOC/DOCX, ảnh poster, ảnh ruộng, ảnh máy.
- Camera: mở camera, chụp ảnh và upload để AI phân tích.
- Voice: nói bằng microphone, trình duyệt chuyển giọng nói thành chữ.
- Text-to-speech: chatbot đọc câu trả lời bằng giọng nói nếu trình duyệt hỗ trợ.

## Cách chạy

### 1. Cài Node.js

Cài Node.js bản 18 trở lên.

### 2. Cài thư viện

Mở terminal trong thư mục project và chạy:

```bash
npm install
```

### 3. Tạo file `.env`

Copy file `.env.example` thành `.env`:

```bash
cp .env.example .env
```

Trên Windows có thể tự copy file bằng File Explorer.

Sau đó mở `.env` và dán API key từ Google AI Studio:

```bash
GEMINI_API_KEY=YOUR_KEY_HERE
GEMINI_MODEL=gemini-2.0-flash
PORT=3000
```

### 4. Chạy app

```bash
npm start
```

Mở trình duyệt:

```text
http://localhost:3000
```

## Lưu ý bảo mật

Không dán API key trực tiếp vào file HTML hoặc JavaScript frontend. Project này dùng backend `server.js` để giữ API key trong `.env`.

## Gợi ý test

Sau khi mở app, bạn có thể hỏi:

- Máy này dùng để làm gì?
- Cách sử dụng máy như thế nào?
- Máy có làm hư lúa non không?
- Thông số kỹ thuật của máy?
- Tạo bài đăng Facebook giới thiệu sản phẩm.

Bạn cũng có thể upload poster hoặc file dự án rồi hỏi:

- Tóm tắt file này cho nông dân dễ hiểu.
- Dựa trên file, hãy viết thông số kỹ thuật sản phẩm.
- Dựa trên ảnh vừa upload, hãy phân tích máy này.

## Ghi chú

Đây là bản prototype local để demo. Nếu muốn deploy thật, nên dùng Render, Railway, Vercel + serverless API, hoặc Google Cloud Run.
