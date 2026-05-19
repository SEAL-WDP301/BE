# SEAL – Software Engineering Hackathon Management System (Backend)

Hệ thống quản lý giải chạy học thuật thường niên **SEAL Hackathon** của Khoa Kỹ thuật Phần mềm phối hợp cùng PDP tại Trường Đại học FPT TP.HCM. Hệ thống vừa là nền tảng số hóa toàn bộ quy trình tổ chức cuộc thi, vừa đóng vai trò thu thập dữ liệu phục vụ nghiên cứu khoa học về độ tin cậy liên đánh giá viên (Inter-rater reliability) trong kỹ thuật phần mềm.

---

## ⚡ Tech Stack & Framework

Hệ thống được phát triển theo tiêu chuẩn **Enterprise-ready**, đảm bảo tính bảo mật, khả năng mở rộng cao:

*   **Backend Framework:** NestJS (TypeScript) với kiến trúc Module-based Layered Architecture.
*   **Database:** PostgreSQL kết hợp TypeORM.
*   **Cache & Queue:** Redis (ioredis) hỗ trợ tối ưu hiệu năng và khả năng scale.
*   **Security:** 
    *   Xác thực bằng bộ đôi JWT (Access Token thời gian ngắn) + Refresh Token (Lưu trong bảo mật HttpOnly Cookie).
    *   Tích hợp Google OAuth2 dành cho sinh viên và Giám khảo.
    *   Bảo vệ API bằng Helmet, CORS và Cookie Parser.
*   **Logger:** Winston (nest-winston) phân tách log Console (Nest-like color) và File JSON (`logs/app.log`).
*   **Validation:** Đảm bảo toàn vẹn dữ liệu đầu vào thông qua `class-validator` và `class-transformer` toàn cục.
*   **API Documentation:** Swagger UI tích hợp sẵn tại `/api/docs`.
*   **Containerization:** Docker Compose cấu hình sẵn cho PostgreSQL giúp setup môi trường nhanh chóng.

---

## 🎯 Nghiệp vụ cốt lõi (Business Core)

Hệ thống giải quyết toàn bộ bài toán vận hành thủ công trước đây của SEAL Hackathon qua các luồng chính:

1.  **Quản lý Sự kiện & Vòng thi (Event & Round):** Cấu hình linh hoạt nhiều sự kiện theo học kỳ (Spring, Summer, Fall) với nhiều vòng đấu (Sơ loại, Chung kết), thời hạn nộp bài riêng biệt và tiêu chí thăng hạng tự động.
2.  **Quản lý Hạng mục & Phân quyền (Tracks & Roles):** Định nghĩa các bảng đấu (AI, Web, Mobile) kèm phân công Mentor và Giám khảo linh hoạt. Phân chia rõ ràng 5 nhóm đối tượng: *Team Member, Team Leader, Mentor, Judge, và Event Coordinator*.
3.  **Quản lý Đăng ký & Đội thi (Team & Registration):** Kiểm soát luồng đăng ký chặt chẽ dành riêng cho Sinh viên FPT và sinh viên ngoài trường (cần BTC phê duyệt) và cơ chế tự lập nhóm từ 3-5 thành viên.
4.  **Nộp bài & Chấm điểm chi tiết (Submission & Scoring):** Đội thi nộp liên kết sản phẩm trực tiếp. Giám khảo chấm điểm độc lập dựa trên bộ tiêu chí động được thừa kế và tùy biến theo từng sự kiện.

---

## 🚀 Điểm nổi bật của dự án (Project Highlights)

*   **Định hướng Nghiên cứu Khoa học (RBL - Research-based Learning):** Hệ thống không gộp chung điểm số của bài nộp mà **lưu vết chi tiết điểm của từng giám khảo theo từng tiêu chí**. Hỗ trợ xuất dữ liệu ẩn danh (CSV) để phân tích độ tin cậy (ICC, Krippendorff's $\alpha$) và dựng Dashboard trực quan hóa phương sai điểm số nhằm gia tăng tính minh bạch trong học thuật.
*   **Kiến trúc Lifecycle NestJS chuẩn chỉ:** Áp dụng nghiêm ngặt luồng xử lý `Middleware ➔ Guard ➔ Interceptor ➔ Pipe ➔ Handler` giúp phân tách rạch ròi các nhiệm vụ: Log request, xác thực RBAC, định dạng phản hồi chuẩn hóa, và validate dữ liệu đầu vào.
*   **Hệ thống xử lý lỗi tập trung:** Mọi ngoại lệ (Exceptions) đều được bắt lại ở tầng lọc toàn cục `AllExceptionsFilter`, tự động che giấu stack trace đối với client để bảo mật nhưng vẫn ghi log chi tiết (kèm Request ID độc bản) vào file hệ thống qua Winston.
*   **Bảo mật Cookie nâng cao:** Refresh Token lưu hoàn toàn ở phía máy chủ thông qua cookie được mã hóa bảo mật (`httpOnly`, `secure`, `sameSite`), triệt tiêu rủi ro bị tấn công XSS đánh cắp thông tin như các phương pháp lưu trữ ở localStorage thông thường.

---

## 🛠️ Hướng dẫn Cài đặt & Chạy dự án (Quick Start)

Hướng dẫn này giúp bạn thiết lập môi trường cơ sở dữ liệu (PostgreSQL, Redis) bằng Docker và khởi chạy dự án Backend NestJS một cách nhanh chóng nhất.

### 1. Khởi chạy Database & Cache (Docker)

Đảm bảo bạn đã cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop/) trên máy tính.

**Bước 1:** Mở terminal, di chuyển vào thư mục dự án `BE` và chạy lệnh sau để khởi động các container ở chế độ chạy ngầm (`-d`):
```bash
docker-compose up -d
```

**Bước 2:** Truy cập giao diện quản lý cơ sở dữ liệu **pgAdmin 4** bằng trình duyệt:
* **Đường dẫn:** [http://localhost:5050](http://localhost:5050)
* **Tài khoản đăng nhập:**
  * **Email:** `admin@admin.com`
  * **Mật khẩu:** `admin123`

**Bước 3:** Kết nối pgAdmin với PostgreSQL Container:
1. Tại màn hình chính của pgAdmin, nhấp chuột phải vào **Servers** ➔ **Register** ➔ **Server...**
2. Tại tab **General**:
   * **Name:** Điền tên bất kỳ (Ví dụ: `sealDB`).
3. Chuyển sang tab **Connection** và cấu hình như sau:
   * **Host name/address:** `seal_postgres` *(Đây là tên container của Postgres trong mạng Docker, giúp kết nối luôn ổn định mà không cần inspect lấy IP nội bộ).*
   * **Port:** `5432`
   * **Maintenance database:** `seal_db`
   * **Username:** `root`
   * **Password:** `root`
   * Tích chọn **Save Password?** thành **Yes/On**.
4. Nhấn **Save** để hoàn tất kết nối.

> [!TIP]
> **Cách dự phòng (Nếu dùng IP trực tiếp):** 
> Nếu không dùng tên `seal_postgres`, bạn có thể lấy IP bằng cách gõ:
> `docker inspect seal_postgres` (hoặc lấy Container ID qua `docker ps -a` rồi inspect)
> Tìm dòng `"IPAddress"` ở gần cuối (dạng `172.18.x.x`) và điền vào ô **Host name/address**. Tuy nhiên cách này sẽ bị reset IP khi restart docker.

**Bước 4 (Kiểm tra kết nối):**
* Sau khi kết nối thành công, bạn sẽ thấy cơ sở dữ liệu `seal_db`.
* Bạn có thể nhấp chuột phải vào `seal_db` ➔ Chọn **Query Tool** và chạy thử truy vấn:
  ```sql
  SELECT * FROM users;
  ```

---

### 2. Cấu hình Môi trường (Environment)

Trước khi chạy dự án NestJS, bạn cần thiết lập file cấu hình môi trường:

1. Copy file `.env.example` thành `.env.development`:
   ```bash
   cp .env.example .env.development
   ```
2. Mở file `.env.development` và kiểm tra lại cấu hình kết nối Database & Redis (mặc định đã được cấu hình khớp với Docker):
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=root
   DB_PASSWORD=root
   DB_NAME=seal_db
   
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

---

### 3. Khởi chạy Ứng dụng NestJS (Local)

Chạy các lệnh sau tại thư mục `BE` để cài đặt thư viện và chạy ứng dụng:

```bash
# 1. Cài đặt các dependencies
npm install

# 2. Khởi chạy ứng dụng ở chế độ Development (Hot-reload)
npm run start:dev
```

Sau khi chạy thành công:
* **API Server:** Chạy tại [http://localhost:3000/api](http://localhost:3000/api)
* **Tài liệu API (Swagger UI):** Truy cập tại [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---

### 4. Các công cụ hỗ trợ phát triển (Tích hợp sẵn)

Dự án đã tích hợp sẵn các giao diện quản lý giúp việc lập trình và kiểm thử cực kỳ dễ dàng:

| Công cụ | Địa chỉ truy cập | Chức năng | Thông tin đăng nhập |
| :--- | :--- | :--- | :--- |
| **pgAdmin 4** | [http://localhost:5050](http://localhost:5050) | Quản lý PostgreSQL DB | `admin@admin.com` / `admin123` |
| **Redis Insight** | [http://localhost:8001](http://localhost:8001) | Xem & Quản lý Key-Value Redis | Không yêu cầu đăng nhập |
| **Swagger UI** | [http://localhost:3000/api/docs](http://localhost:3000/api/docs) | Tài liệu hóa & Test trực tiếp API | Đang chạy local |

