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
