import nodemailer from 'nodemailer';
import { emailConfig } from '../config/email';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: emailConfig.smtp.host,
      port: emailConfig.smtp.port,
      secure: emailConfig.smtp.secure,
      auth: {
        user: emailConfig.smtp.auth.user,
        pass: emailConfig.smtp.auth.pass,
      },
    });
  }

  async sendOtpEmail(to: string, otpCode: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: `${emailConfig.fromName} <${emailConfig.from}>`,
        to,
        subject: 'Código de Verificação - MEGA File Manager',
        html: `
          <!DOCTYPE html>
          <html lang="pt">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Código de Verificação</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #D9272E; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .otp-code { font-size: 32px; font-weight: bold; color: #D9272E; text-align: center; margin: 20px 0; letter-spacing: 3px; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
              .button { background-color: #D9272E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔒 MEGA File Manager</h1>
                <p>Código de Verificação</p>
              </div>
              <div class="content">
                <h2>Olá!</h2>
                <p>Foi solicitado um código de verificação para criar a sua conta no MEGA File Manager.</p>
                
                <p>O seu código de verificação é:</p>
                <div class="otp-code">${otpCode}</div>
                
                <p><strong>Este código expira em 5 minutos.</strong></p>
                
                <p>Se não solicitou este código, pode ignorar este email com segurança.</p>
                
                <div class="footer">
                  <p>© 2025 MEGA File Manager. Todos os direitos reservados.</p>
                  <p>Este é um email automático, não responda a esta mensagem.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          MEGA File Manager - Código de Verificação
          
          Olá!
          
          Foi solicitado um código de verificação para criar a sua conta no MEGA File Manager.
          
          O seu código de verificação é: ${otpCode}
          
          Este código expira em 5 minutos.
          
          Se não solicitou este código, pode ignorar este email com segurança.
          
          © 2025 MEGA File Manager. Todos os direitos reservados.
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();