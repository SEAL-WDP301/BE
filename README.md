# SEAL – Software Engineering Hackathon Management System (Backend)

Hệ thống quản lý giải chạy học thuật thường niên **SEAL Hackathon** của Khoa Kỹ thuật Phần mềm phối hợp cùng PDP tại Trường Đại học FPT TP.HCM. Hệ thống vừa là nền tảng số hóa toàn bộ quy trình tổ chức cuộc thi, vừa đóng vai trò thu thập dữ liệu phục vụ nghiên cứu khoa học về độ tin cậy liên đánh giá viên (Inter-rater reliability) trong kỹ thuật phần mềm.

---

## ⚡ Tech Stack & Architecture

Hệ thống được phát triển theo tiêu chuẩn **Enterprise-ready**, đảm bảo tính bảo mật, khả năng mở rộng cao và hiệu năng ổn định:

*   **Backend Framework:** NestJS (TypeScript) với kiến trúc Module-based Layered Architecture (Phân tách rạch ròi Controllers, Services, và Repositories).
*   **Database ORM:** Prisma ORM, cung cấp Type-safe Database Access kết hợp PostgreSQL. Khai thác mạnh mẽ các trường JSON để lưu trữ linh hoạt (ví dụ: Rubrics, FAQs).
*   **Cache & Message Broker:** Redis (ioredis) dùng cho việc Cache dữ liệu nặng, quản lý Session và làm Adapter cho WebSocket cluster.
*   **Real-time Engine:** NestJS WebSockets (`@nestjs/websockets` + Socket.IO) phục vụ đồng bộ dữ liệu thời gian thực cho chat nhóm và hệ thống thông báo.
*   **Event-Driven Communication:** Sử dụng `@nestjs/event-emitter` để Decouple (tách rời) các logic gửi Email, tạo Thông báo (Notification) khỏi luồng xử lý chính.
*   **Security & Auth:** 
    *   Bảo vệ theo mô hình Cookie-based JWT Authentication.
    *   OAuth2 (Google, GitHub) tích hợp qua Passport.js.
    *   Bảo vệ chống tấn công bằng Helmet, cấu hình CORS khắt khe và HttpOnly/Secure Cookies.
*   **Cron Jobs & Scheduling:** Xử lý các tác vụ định kỳ tự động bằng `@nestjs/schedule` (ví dụ: tự động khóa/mở vòng thi, khóa kho lưu trữ GitHub khi hết hạn).
*   **Cloud Storage & Integrations:** Amazon S3 (quản lý file qua Presigned URLs) và GitHub Octokit API (quản lý Organization & Repositories tự động).

---

## 🧠 Các Kỹ thuật Xử lý Chuyên sâu (Advanced Techniques)

### 1. Kiến trúc Dependency Injection & Lifecycle Hook
*   **Nền tảng NestJS v10:** Áp dụng nghiêm ngặt luồng xử lý (Request Lifecycle): `Middleware ➔ Guard ➔ Interceptor ➔ Pipe ➔ Controller/Handler`.
*   **Global Exception Handling:** Tất cả các lỗi trong hệ thống được gom về `AllExceptionsFilter`. Lỗi sẽ được log chi tiết xuống file (thông qua Winston) kèm định danh `RequestId`, nhưng chỉ trả về HTTP Error Response sạch sẽ, chuẩn hóa (ẩn Stack Trace) cho client để bảo mật.
*   **Custom Decorators & Guards:** Xây dựng `RolesGuard` để kiểm tra quyền hạn (RBAC) và `AuthUser` decorator để lấy thông tin định danh JWT một cách gọn gàng ở Controller.

### 2. Tự động hóa Workflow (Automation via Background Jobs)
*   **GitHub Repositories Provisioning:** Khi một sự kiện/vòng thi có cấu hình nộp bài qua GitHub mở ra, một tiến trình chạy ngầm sẽ duyệt qua tất cả các đội thi đủ điều kiện, tự động gọi API GitHub bằng `Octokit` để:
    1. Tạo Private Repository trên tổ chức (Organization) chỉ định.
    2. Quét tài khoản GitHub của thành viên và tự động cấp quyền `Collaborator`.
*   **Time-based Status Synchronization:** Hệ thống sử dụng Cronjob kiểm tra `submissionDeadline`. Khi thời gian đếm ngược kết thúc, trạng thái của vòng thi được chuyển tự động, và quyền Push code trên GitHub của thí sinh sẽ bị hạ cấp xuống Read-only.

### 3. Lưu trữ hướng Cloud (Presigned URL Architecture)
*   Thay vì để Backend nhận file project (làm nghẽn băng thông và memory), BE chỉ đóng vai trò xác thực tính hợp lệ (Size, File Type) và sinh ra một **AWS S3 Presigned URL** ngắn hạn (có chữ ký số hợp lệ trong 5 phút).
*   Client sử dụng URL này để upload trực tiếp lên Cloud. Sau khi thành công, BE mới lưu bản ghi vào Database. Cơ chế này giúp Backend xử lý hàng ngàn request cùng lúc mà không bị thắt nút cổ chai (Bottleneck) ở băng thông Mạng.

### 4. Tối ưu hóa Database với Prisma
*   **Batch Queries & Transactions:** Để đảm bảo tính toàn vẹn (ACID), khi chấm điểm nhiều tiêu chí cùng lúc hoặc phân bổ nhiều giám khảo, BE sử dụng tính năng `$transaction` của Prisma.
*   **Complex Relations Querying:** Tối ưu hóa truy vấn bằng cơ chế `include` và `select` chính xác các fields cần thiết để giảm tải lượng dữ liệu trả về mạng. Quản lý trạng thái đa vòng (TeamRounds) với các sub-queries lồng ghép để tính điểm tổng kết.

### 5. Nghiên cứu Khoa học (RBL - Inter-rater reliability)
*   Hệ thống không tính điểm gộp chung ngay từ đầu, mà lưu vết độc lập (Isolation) kết quả đánh giá của từng giám khảo đối với từng tiêu chí nhỏ (Rubric Items).
*   Cấu trúc Data Model hỗ trợ xuất khẩu các mẫu dữ liệu dưới dạng Ma trận điểm (Score Matrix) để chạy thuật toán thống kê hệ số đồng thuận (Krippendorff's Alpha, ICC) trực tiếp trên các phần mềm như SPSS hoặc R.

---

## 🛠️ Hướng dẫn Cài đặt & Chạy dự án (Quick Start)

### 1. Cấu hình Môi trường
Copy file `.env.example` thành `.env.development` và điền thông tin kết nối DB (PostgreSQL) và Redis:
```bash
cp .env.example .env.development
```

### 2. Khởi chạy Ứng dụng NestJS
```bash
# 1. Cài đặt các thư viện (Lưu ý: Prisma CLI đã được ghim ở version 6.x)
npm install

# 2. Sinh mã Prisma Client tương ứng với Schema
npx prisma generate

# 3. Khởi chạy Server (chế độ tự động reload)
npm run start:dev
```

Sau khi chạy thành công:
* **API Server:** Chạy tại [http://localhost:3000/api](http://localhost:3000/api)
* **Tài liệu API (Swagger UI):** Truy cập tại [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
