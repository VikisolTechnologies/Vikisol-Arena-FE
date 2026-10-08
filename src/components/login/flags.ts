/**
 * Sign-in methods on the login card. The card follows the approved mockup exactly, so every method
 * is shown (founder decision, 9 Oct 2026); what each one does today:
 *
 * - Email + password: works.
 * - Google: works when NEXT_PUBLIC_GOOGLE_CLIENT_ID is in the build; otherwise the icon explains
 *   it isn't connected.
 * - Mobile OTP: the default tab. It calls arena-api's real phone OTP endpoints, but arena-api has
 *   no SMS sender configured yet (MSG91 keys empty), so no code arrives until that is set up.
 *   NEXT_PUBLIC_LOGIN_MOBILE_OTP=0 hides the tab and opens on Email instead.
 * - Apple and WhatsApp: no sign-in endpoint exists in arena-api. The icons say so when tapped.
 */
export const LOGIN_MOBILE_OTP = process.env.NEXT_PUBLIC_LOGIN_MOBILE_OTP !== "0";
export const LOGIN_GOOGLE = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
export const LOGIN_HELP_HREF = "mailto:connect@vikisol.in?subject=Help%20signing%20in%20to%20Arena";
