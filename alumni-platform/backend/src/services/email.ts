import nodemailer from 'nodemailer';

// ── Transporter ────────────────────────────────────────────────────────────
function createTransporter() {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    // Dev fallback — prints emails as console logs instead of sending
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user, pass },
  });
}

const FROM = process.env.EMAIL_FROM || '"AlumniConnect" <no-reply@alumniconnect.app>';

// ── Shared HTML shell ───────────────────────────────────────────────────────
function wrapTemplate(accentColor: string, iconEmoji: string, title: string, body: string, ctaLabel: string, ctaUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.12);">

        <!-- Header band -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 40px 28px;text-align:center;">
            <div style="width:64px;height:64px;background:rgba(255,255,255,0.15);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:16px;">
              ${iconEmoji}
            </div>
            <div style="display:block;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.6);margin-bottom:8px;">AlumniConnect</div>
            <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;">${title}</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px 28px;">
            ${body}

            <!-- CTA -->
            <div style="text-align:center;margin-top:32px;">
              <a href="${ctaUrl}"
                style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;border-radius:14px;box-shadow:0 6px 20px rgba(79,70,229,0.35);">
                ${ctaLabel}
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              You're receiving this because you have email notifications enabled on <strong>AlumniConnect</strong>.<br/>
              To unsubscribe, update your preferences in your <a href="${ctaUrl}/profile" style="color:#6366f1;text-decoration:none;">Profile Settings</a>.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── sendNewMessageEmail ─────────────────────────────────────────────────────
export async function sendNewMessageEmail(
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  messagePreview: string,
): Promise<void> {
  const transporter = createTransporter();
  const appUrl = process.env.FRONTEND_URL || 'https://alumniconnect.app';

  const body = `
    <p style="font-size:16px;color:#374151;line-height:1.7;margin:0 0 20px;">
      Hi <strong>${recipientName}</strong>,
    </p>
    <p style="font-size:16px;color:#374151;line-height:1.7;margin:0 0 24px;">
      <strong>${senderName}</strong> sent you a new message on AlumniConnect.
    </p>
    <div style="background:linear-gradient(135deg,rgba(238,242,255,0.8),rgba(245,243,255,0.8));border:1.5px solid #c7d2fe;border-radius:16px;padding:20px 24px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <div style="width:32px;height:32px;background:linear-gradient(135deg,#6366f1,#7c3aed);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-size:15px;">
          💬
        </div>
        <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6366f1;">Message Preview</span>
      </div>
      <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.6;font-style:italic;">&ldquo;${messagePreview}&rdquo;</p>
    </div>
  `;

  const html = wrapTemplate('#6366f1', '💬', `New message from ${senderName}`, body, 'Reply Now →', `${appUrl}/chat`);

  if (!transporter) {
    console.log(`[Email Dev] To: ${recipientEmail} | Subject: New message from ${senderName} | Preview: ${messagePreview}`);
    return;
  }

  await transporter.sendMail({
    from: FROM,
    to: recipientEmail,
    subject: `💬 New message from ${senderName} — AlumniConnect`,
    html,
  });
}

// ── sendMentorshipAcceptedEmail ─────────────────────────────────────────────
export async function sendMentorshipAcceptedEmail(
  recipientEmail: string,
  recipientName: string,
  alumniName: string,
  alumniRole?: string,
  alumniCompany?: string,
): Promise<void> {
  const transporter = createTransporter();
  const appUrl = process.env.FRONTEND_URL || 'https://alumniconnect.app';

  const mentorMeta = [alumniRole, alumniCompany].filter(Boolean).join(' at ');

  const body = `
    <p style="font-size:16px;color:#374151;line-height:1.7;margin:0 0 20px;">
      Hi <strong>${recipientName}</strong>,
    </p>
    <p style="font-size:16px;color:#374151;line-height:1.7;margin:0 0 24px;">
      Great news! <strong>${alumniName}</strong> has <span style="color:#059669;font-weight:700;">accepted</span> your mentorship request. You can now start a conversation and schedule your first session.
    </p>

    <!-- Mentor card -->
    <div style="background:linear-gradient(135deg,rgba(236,253,245,0.9),rgba(209,250,229,0.5));border:1.5px solid #6ee7b7;border-radius:16px;padding:20px 24px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:52px;height:52px;background:linear-gradient(135deg,#10b981,#059669);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">
          🎓
        </div>
        <div>
          <p style="margin:0;font-size:17px;font-weight:800;color:#065f46;">${alumniName}</p>
          ${mentorMeta ? `<p style="margin:4px 0 0;font-size:13px;color:#059669;">${mentorMeta}</p>` : ''}
        </div>
      </div>
    </div>

    <div style="background:#f0fdf4;border-radius:12px;padding:16px 20px;margin-top:20px;border-left:4px solid #10b981;">
      <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">🚀 Next steps</p>
      <p style="margin:6px 0 0;font-size:14px;color:#15803d;line-height:1.6;">Send your mentor a message to introduce yourself and discuss your goals. Make it count!</p>
    </div>
  `;

  const html = wrapTemplate('#10b981', '🎉', 'Your mentorship request was accepted!', body, 'Message Your Mentor →', `${appUrl}/chat`);

  if (!transporter) {
    console.log(`[Email Dev] To: ${recipientEmail} | Subject: Mentorship Accepted by ${alumniName}`);
    return;
  }

  await transporter.sendMail({
    from: FROM,
    to: recipientEmail,
    subject: `🎉 ${alumniName} accepted your mentorship request — AlumniConnect`,
    html,
  });
}

// ── sendVideoCallEmail ──────────────────────────────────────────────────────
export async function sendVideoCallEmail(
  recipientEmail: string,
  recipientName: string,
  callerName: string,
  callLink: string,
): Promise<void> {
  const transporter = createTransporter();

  const body = `
    <p style="font-size:16px;color:#374151;line-height:1.7;margin:0 0 20px;">
      Hi <strong>${recipientName}</strong>,
    </p>
    <p style="font-size:16px;color:#374151;line-height:1.7;margin:0 0 24px;">
      <strong>${callerName}</strong> is calling you on AlumniConnect. Click the button below to join the video call now.
    </p>

    <!-- Call card -->
    <div style="background:linear-gradient(135deg,rgba(236,253,245,0.9),rgba(209,250,229,0.5));border:1.5px solid #6ee7b7;border-radius:16px;padding:20px 24px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="width:52px;height:52px;background:linear-gradient(135deg,#10b981,#059669);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;">
          📹
        </div>
        <div>
          <p style="margin:0;font-size:17px;font-weight:800;color:#065f46;">${callerName}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#059669;">is waiting for you in a video call</p>
        </div>
      </div>
    </div>

    <div style="background:#f0fdf4;border-radius:12px;padding:16px 20px;margin-top:20px;border-left:4px solid #10b981;">
      <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">⚡ Join quickly</p>
      <p style="margin:6px 0 0;font-size:14px;color:#15803d;line-height:1.6;">No download needed — the call opens directly in your browser using Jitsi Meet.</p>
    </div>
  `;

  const html = wrapTemplate('#10b981', '📹', `${callerName} is calling you!`, body, 'Join Video Call →', callLink);

  if (!transporter) {
    console.log(`[Email Dev] To: ${recipientEmail} | Subject: Video call from ${callerName} | Link: ${callLink}`);
    return;
  }

  await transporter.sendMail({
    from: FROM,
    to: recipientEmail,
    subject: `📹 ${callerName} is calling you on AlumniConnect`,
    html,
  });
}

