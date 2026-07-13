import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.from = config.getOrThrow<string>("SMTP_FROM");
    this.transporter = nodemailer.createTransport({
      host: config.getOrThrow<string>("SMTP_HOST"),
      port: Number(config.getOrThrow<string>("SMTP_PORT")),
      secure: Number(config.getOrThrow<string>("SMTP_PORT")) === 465,
      auth: {
        user: config.getOrThrow<string>("SMTP_USER"),
        pass: config.getOrThrow<string>("SMTP_PASS"),
      },
    });
  }

  async sendPasswordResetCode(to: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: "Your Orbit password reset code",
      text: `Your password reset code is ${code}. It expires in 15 minutes. If you didn't request this, you can ignore this email.`,
    });
  }
}
