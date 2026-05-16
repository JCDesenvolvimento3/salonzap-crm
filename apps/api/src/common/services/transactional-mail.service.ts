import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TransactionalMailService {
  private readonly logger = new Logger(TransactionalMailService.name);

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  private getResendApiKey() {
    return this.configService.get<string>('RESEND_API_KEY')?.trim() || '';
  }

  private getFromEmail() {
    return (
      this.configService.get<string>('MAIL_FROM_EMAIL')?.trim() ||
      this.configService.get<string>('NEXT_PUBLIC_SUPPORT_EMAIL')?.trim() ||
      ''
    );
  }

  async sendPasswordResetEmail({
    to,
    userName,
    salonName,
    resetUrl,
  }: {
    to: string;
    userName: string;
    salonName: string;
    resetUrl: string;
  }) {
    const apiKey = this.getResendApiKey();
    const from = this.getFromEmail();

    if (!apiKey || !from) {
      throw new ServiceUnavailableException(
        'Recuperacao por e-mail ainda nao esta configurada em producao.',
      );
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: 'Redefina sua senha do SalonZap',
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;background:#0b0f17;color:#f7f8fb;padding:32px;">
            <div style="max-width:560px;margin:0 auto;background:#111826;border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:32px;">
              <p style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#7fe8ff;margin:0 0 16px;">SalonZap CRM</p>
              <h1 style="font-size:28px;line-height:1.2;margin:0 0 16px;">Redefina sua senha</h1>
              <p style="font-size:16px;line-height:1.8;color:#c6cede;margin:0 0 12px;">
                Oi, ${escapeHtml(userName)}. Recebemos um pedido para redefinir a senha do workspace
                <strong style="color:#ffffff;"> ${escapeHtml(salonName)}</strong>.
              </p>
              <p style="font-size:16px;line-height:1.8;color:#c6cede;margin:0 0 24px;">
                Clique no botao abaixo para criar uma nova senha. O link expira em 60 minutos.
              </p>
              <p style="margin:0 0 24px;">
                <a href="${resetUrl}" style="display:inline-block;padding:14px 22px;border-radius:16px;background:linear-gradient(135deg,#33d4ff,#7f6bff);color:#081018;text-decoration:none;font-weight:700;">
                  Redefinir senha
                </a>
              </p>
              <p style="font-size:14px;line-height:1.7;color:#8b94a8;margin:0;">
                Se voce nao solicitou esta alteracao, ignore este e-mail.
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const payload = await response.text();
      this.logger.error(`Resend failed: ${payload}`);
      throw new ServiceUnavailableException(
        'Nao foi possivel enviar o e-mail de recuperacao agora.',
      );
    }
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
