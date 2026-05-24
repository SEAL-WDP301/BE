import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY is not configured. Emails will not be sent.');
    }
  }

  async sendOtpEmail(to: string, otp: string) {
    if (!this.resend) {
      this.logger.warn(`Simulating email to ${to} with OTP: ${otp}`);
      return;
    }

    try {
      const response = await this.resend.emails.send({
        from: 'SEAL Hackathon <onboarding@resend.dev>', // You should verify a domain in Resend and use it here
        to,
        subject: 'SEAL - Xác thực địa chỉ Email',
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

      if (response.error) {
        this.logger.error(`Resend API Error: ${response.error.message}`, response.error);
        throw new Error(response.error.message);
      }

      this.logger.log(`OTP Email sent to ${to}, ID: ${response.data?.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      throw error;
    }
  }

  async sendResetPasswordEmail(to: string, resetLink: string) {
    if (!this.resend) {
      this.logger.warn(`Simulating reset password email to ${to} with Link: ${resetLink}`);
      return;
    }

    try {
      const response = await this.resend.emails.send({
        from: 'SEAL Hackathon <onboarding@resend.dev>',
        to,
        subject: 'SEAL - Khôi phục mật khẩu',
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

      if (response.error) {
        this.logger.error(`Resend API Error: ${response.error.message}`, response.error);
        throw new Error(response.error.message);
      }

      this.logger.log(`Reset Password Email sent to ${to}, ID: ${response.data?.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send reset password email to ${to}`, error);
      throw error;
    }
  }
}
