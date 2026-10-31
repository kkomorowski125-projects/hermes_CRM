// Wysyłka maili: SMTP z SMTP_URL (dowolny dostawca: Postmark, Mailgun, SES, własny serwer).
// Bez SMTP_URL wiadomość trafia do logu, a w testach do skrzynki w pamięci.
import nodemailer from 'nodemailer';
import type { Config } from './config.js';

export interface Mail { to: string; subject: string; text: string; html?: string; attachments?: { filename: string; content: string; contentType: string }[] }
export interface Mailer { enabled: boolean; send(m: Mail): Promise<boolean>; outbox?: Mail[] }

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Prosty, czytelny mail w kolorach Hermesa: akapity i jeden przycisk. */
export function layout(paragraphs: string[], button?: { label: string; url: string }, foot = 'Wiadomość wysłana automatycznie przez Hermes CRM.') {
  const text = [...paragraphs, button ? `${button.label}: ${button.url}` : '', '', foot].filter((x, i, a) => x !== '' || i === a.length - 2).join('\n\n');
  const html = `<!doctype html><html lang="pl"><body style="margin:0;padding:24px;background:#F4F4F7;font-family:Arial,Helvetica,sans-serif;color:#3D3F4C">
<div style="max-width:520px;margin:0 auto;padding:28px;background:#ffffff;border:1px solid #E2E3EA;border-radius:16px">
<p style="margin:0 0 20px;font-size:18px;font-weight:bold;color:#17181F">Hermes</p>
${paragraphs.map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55">${esc(p)}</p>`).join('\n')}
${button ? `<p style="margin:22px 0"><a href="${esc(button.url)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#5B61B8;color:#ffffff;text-decoration:none;font-weight:bold">${esc(button.label)}</a></p>
<p style="margin:0 0 14px;font-size:12px;color:#696C7B">Jeśli przycisk nie działa, skopiuj adres: ${esc(button.url)}</p>` : ''}
<p style="margin:20px 0 0;font-size:12px;color:#8A8D9B">${esc(foot)}</p></div></body></html>`;
  return { text, html };
}

export function createMailer(cfg: Config, log: { info: (o: object, m: string) => void; error: (o: object, m: string) => void }): Mailer {
  if (!cfg.smtpUrl) {
    return { enabled: false, async send(m) { log.info({ to: m.to, subject: m.subject }, 'Mail niewysłany: brak SMTP_URL'); return false; } };
  }
  const t = nodemailer.createTransport(cfg.smtpUrl);
  return {
    enabled: true,
    async send(m) {
      try { await t.sendMail({ from: cfg.mailFrom, to: m.to, subject: m.subject, text: m.text, html: m.html, attachments: m.attachments }); return true; }
      catch (e: any) { log.error({ to: m.to, err: e?.message }, 'Błąd wysyłki maila'); return false; }
    }
  };
}
/** Skrzynka w pamięci do testów: zapisuje wysłane maile. */
export function memoryMailer(): Mailer & { outbox: Mail[] } {
  const outbox: Mail[] = [];
  return { enabled: true, outbox, async send(m) { outbox.push(m); return true; } };
}
