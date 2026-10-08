/**
 * Sign-in methods on the login card. A method only renders when it can really sign someone in:
 *
 * - Email + password: always on.
 * - Google: on when NEXT_PUBLIC_GOOGLE_CLIENT_ID is in the build (same rule as everywhere else).
 * - Mobile OTP: the screens and the API calls are built, but arena-api has no SMS sender
 *   configured yet (MSG91 keys empty), so a code would never arrive. Set
 *   NEXT_PUBLIC_LOGIN_MOBILE_OTP=1 once SMS really sends; the Mobile tab then becomes the default.
 * - Apple and WhatsApp: no sign-in endpoint exists in arena-api, so there is no button.
 */
export const LOGIN_MOBILE_OTP = process.env.NEXT_PUBLIC_LOGIN_MOBILE_OTP === "1";
export const LOGIN_GOOGLE = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
export const LOGIN_HELP_HREF = "mailto:connect@vikisol.in?subject=Help%20signing%20in%20to%20Arena";
