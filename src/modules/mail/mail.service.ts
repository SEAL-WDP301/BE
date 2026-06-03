import { Injectable, Logger } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendOtpEmail(to: string, otp: string) {
    try {
      const response = await this.mailerService.sendMail({
        to,
        subject: "SEAL - Xác thực địa chỉ Email",
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Chào mừng bạn đến với SEAL!</h2>
            <p>Để hoàn tất quá trình đăng ký, vui lòng nhập mã OTP dưới đây:</p>
            <h1 style="color: #ff7629; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
            <p>Mã này sẽ hết hạn sau 5 phút.</p>
            <br/>
            <p>Trân trọng,<br/>Đội ngũ SEAL</p>
          </div>
        `,
      });

      this.logger.log(
        `OTP Email sent to ${to}, MessageID: ${response?.messageId}`,
      );
      return response;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  async sendResetPasswordEmail(to: string, resetLink: string) {
    try {
      const response = await this.mailerService.sendMail({
        to,
        subject: "SEAL - Khôi phục mật khẩu",
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Yêu cầu khôi phục mật khẩu</h2>
            <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn trên SEAL.</p>
            <p>Vui lòng click vào nút bên dưới để tạo mật khẩu mới:</p>
            <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #ff7629; color: #000; text-decoration: none; font-weight: bold; border-radius: 4px; margin: 20px 0;">
              KHÔI PHỤC MẬT KHẨU
            </a>
            <p>Link này sẽ hết hạn sau 5 phút.</p>
            <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
            <br/>
            <p>Trân trọng,<br/>Đội ngũ SEAL</p>
          </div>
        `,
      });

      this.logger.log(
        `Reset Password Email sent to ${to}, MessageID: ${response?.messageId}`,
      );
      return response;
    } catch (error) {
      this.logger.error(`Failed to send reset password email to ${to}`, error);
      throw error;
    }
  }
}
