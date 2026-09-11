type AuthErrorDetails = {
  code?: string;
  status?: number;
};

const signupMessages: Record<string, string> = {
  email_address_invalid: "Use a real email address that can receive your verification link.",
  email_address_not_authorized: "This address cannot receive verification mail until custom SMTP is configured.",
  email_exists: "An account already exists for this email. Sign in instead.",
  user_already_exists: "An account already exists for this email. Sign in instead.",
  over_email_send_rate_limit: "Too many verification emails were requested. Wait a few minutes, then try again.",
  over_request_rate_limit: "Too many signup attempts were made. Wait a few minutes, then try again.",
  email_provider_disabled: "Email signup is currently unavailable.",
  weak_password: "Choose a stronger password and try again.",
};

export function signupErrorMessage(error: AuthErrorDetails): string {
  if (error.code && signupMessages[error.code]) return signupMessages[error.code];
  if (error.status === 429) return "Too many signup attempts were made. Wait a few minutes, then try again.";
  return "We could not create your account right now. Please try again shortly.";
}
