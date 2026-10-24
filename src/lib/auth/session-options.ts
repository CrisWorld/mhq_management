// Persist the refresh token in the SDK's browser localStorage (not sessionStorage).
// Keep the default storage key so existing logins survive this release.
export const sessionOptions = {
  persistSession: true,
  autoRefreshToken: true,
} as const;
