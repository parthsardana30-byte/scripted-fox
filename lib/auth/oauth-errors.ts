const oauthErrorMessages: Record<string, string> = {
  account_not_linked: "An account already exists for this email. Sign in with your password, then connect Google from Account settings.",
  oauth: "Google sign-in could not be started. Check the OAuth configuration and try again.",
};

export function oauthErrorMessage(code: string): string {
  return oauthErrorMessages[code] ?? "Google sign-in was not completed. Please try again.";
}
