const oauthErrorMessages: Record<string, string> = {
  account_not_linked: "An account already exists for this email. Sign in with your password, then connect Google from Account settings.",
  access_denied: "Google sign-in was cancelled. Please choose an account and allow the basic profile permissions to continue.",
  email_not_verified: "Google did not confirm this email address as verified. Please use another Google account.",
  invalid_state: "The Google sign-in session expired. Please start the sign-in again.",
  state_mismatch: "The Google sign-in session expired. Please start the sign-in again.",
  unable_to_create_user: "Google verified the account, but Scripted Fox could not create the profile. Please try again shortly.",
  unable_to_link_account: "This Google account could not be linked safely. Sign in with the original method and connect Google from Account settings.",
  oauth: "Google sign-in could not be started. Check the OAuth configuration and try again.",
};

export function oauthErrorMessage(code: string): string {
  return oauthErrorMessages[code] ?? "Google sign-in was not completed. Please try again.";
}
