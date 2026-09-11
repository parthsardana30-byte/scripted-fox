type AccountIdentifier = {
  email?: string | null;
  phone?: string | null;
};

export function maskEmailAddress(email: string) {
  const normalized = email.trim();
  const separator = normalized.lastIndexOf("@");
  if (separator <= 0 || separator === normalized.length - 1) return null;

  const local = normalized.slice(0, separator);
  const domain = normalized.slice(separator + 1);
  const prefix = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  const suffix = local.length > 2 ? local.slice(-1) : "";
  return `${prefix}••••••${suffix}@${domain}`;
}

export function maskPhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return null;
  return `${digits.slice(0, 2)} •••••• ${digits.slice(-2)}`;
}

export function maskedAccountHint(identifier: AccountIdentifier) {
  if (identifier.email) {
    const maskedEmail = maskEmailAddress(identifier.email);
    if (maskedEmail) return maskedEmail;
  }
  if (identifier.phone) {
    const maskedPhone = maskPhoneNumber(identifier.phone);
    if (maskedPhone) return maskedPhone;
  }
  return "another Scripted Fox account";
}
