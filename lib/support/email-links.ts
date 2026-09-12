export type EmailEscalation = {
  type: "email_support";
  email: string;
  subject: string;
  body: string;
};

export function gmailComposeUrl(escalation: EmailEscalation) {
  const query = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: escalation.email,
    su: escalation.subject,
    body: escalation.body,
  });
  return `https://mail.google.com/mail/?${query.toString()}`;
}

export function mailtoUrl(escalation: EmailEscalation) {
  return `mailto:${encodeURIComponent(escalation.email)}?${new URLSearchParams({ subject: escalation.subject, body: escalation.body }).toString()}`;
}
