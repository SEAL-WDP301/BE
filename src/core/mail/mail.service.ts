import { Injectable, Logger } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendNotificationEmail(
    to: string,
    recipientName: string,
    subject: string,
    message: string,
  ) {
    return this.mailerService.sendMail({
      to,
      subject,
      text: `Hello ${recipientName},\n\n${message}\n\nSEAL Team`,
    });
  }

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

  async sendTeamInvitationEmail(
    to: string,
    teamName: string,
    eventName: string,
    trackName: string,
    leaderName: string,
  ) {
    try {
      const response = await this.mailerService.sendMail({
        to,
        subject: `SEAL - Lời mời tham gia đội thi ${teamName}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Bạn nhận được một lời mời tham gia đội thi!</h2>
            <p><strong>${leaderName}</strong> vừa mời bạn gia nhập đội <strong>${teamName}</strong> để cùng tham gia cuộc thi <strong>${eventName}</strong> (Track: <strong>${trackName}</strong>).</p>
            <p>Vui lòng đăng nhập vào hệ thống SEAL, đi tới mục Thông báo hoặc trang Chi tiết cuộc thi để <strong>Chấp nhận</strong> hoặc <strong>Từ chối</strong> lời mời này.</p>
            <br/>
            <p>Trân trọng,<br/>Đội ngũ SEAL</p>
          </div>
        `,
      });

      this.logger.log(
        `Team invitation email sent to ${to}, MessageID: ${response?.messageId}`,
      );
      return response;
    } catch (error) {
      this.logger.error(`Failed to send team invitation email to ${to}`, error);
      throw error;
    }
  }

  async sendRoundResultEmail(
    to: string,
    teamName: string,
    roundName: string,
    trackName: string,
    isAdvanced: boolean,
    isAwarded: boolean,
    resultContext: string,
  ) {
    const subject = isAwarded
      ? `🏆 SEAL - THÔNG BÁO KẾT QUẢ ĐẶC BIỆT: ${teamName} - ${roundName}`
      : isAdvanced
        ? `🎉 SEAL - CHÚC MỪNG: ${teamName} vượt qua ${roundName}`
        : `📋 SEAL - THÔNG BÁO KẾT QUẢ: ${roundName}`;

    const themeColor = isAwarded ? "#f59e0b" : isAdvanced ? "#10b981" : "#6b7280";
    const headerTitle = isAwarded
      ? "OUTSTANDING ACHIEVEMENT"
      : isAdvanced
        ? "CONGRATULATIONS"
        : "ROUND RESULTS";

    let bodyContent = "";
    if (isAwarded) {
      bodyContent = `
        <p>Thành tích xuất sắc của đội bạn đã giúp các bạn ghi danh vào danh sách những đội xuất sắc nhất. Ban tổ chức xin chính thức ghi nhận những nỗ lực phi thường này.</p>
        <p>Vui lòng theo dõi email tiếp theo để nhận thư mời tham dự Lễ Trao Giải (Award Ceremony).</p>
      `;
    } else if (isAdvanced) {
      bodyContent = `
        <p>Thật tuyệt vời khi thấy đội của bạn tiếp tục tiến bước. Thành tích này là minh chứng cho sự hợp tác và năng lực kỹ thuật xuất sắc của toàn đội.</p>
        <p>Hãy chuẩn bị thật kỹ lưỡng cho những thử thách sắp tới, vì hành trình phía trước sẽ đòi hỏi nhiều sự đổi mới và kiên cường hơn nữa.</p>
      `;
    } else {
      bodyContent = `
        <p>Mặc dù đội của bạn không đi tiếp trong vòng này, Ban tổ chức đánh giá rất cao sự nỗ lực, sáng tạo và kiên trì mà các bạn đã thể hiện.</p>
        <p>Hy vọng những kinh nghiệm và phản hồi thu được từ cuộc thi sẽ là nền tảng vững chắc cho những thành công trong tương lai của các bạn. Đừng ngừng cố gắng nhé!</p>
      `;
    }

    try {
      const response = await this.mailerService.sendMail({
        to,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background-color: ${themeColor}; color: white; padding: 20px; text-align: center;">
              <h2 style="margin: 0; font-size: 24px; letter-spacing: 1px;">${headerTitle}</h2>
            </div>
            
            <div style="padding: 30px;">
              <p style="font-size: 16px; margin-top: 0;">Xin chào thành viên đội <strong>${teamName}</strong>,</p>
              
              <p>Hội đồng Đánh giá đã chính thức công bố kết quả cho <strong>${roundName}</strong> (Bảng thi: <strong>${trackName}</strong>).</p>
              
              <div style="background-color: #f9fafb; border-left: 4px solid ${themeColor}; padding: 15px; margin: 25px 0;">
                <p style="margin: 0; font-size: 16px;"><strong>Kết quả:</strong> ${resultContext}</p>
              </div>

              ${bodyContent}

              <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 14px; color: #6b7280;">
                <p style="margin: 0;">Nếu bạn có bất kỳ câu hỏi nào về kết quả đánh giá, vui lòng liên hệ:</p>
                <p style="margin: 5px 0 0 0;"><strong>Email:</strong> support@seal.edu.vn</p>
              </div>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
              <p style="margin: 0;">Đây là email tự động từ hệ thống SEAL. Vui lòng không trả lời trực tiếp email này.</p>
            </div>
          </div>
        `,
      });

      this.logger.log(
        `Round Result Email sent to ${to}, MessageID: ${response?.messageId}`,
      );
      return response;
    } catch (error) {
      this.logger.error(`Failed to send round result email to ${to}`, error);
    }
  }
}
