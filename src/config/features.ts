//src\config\features.ts
// Central place to toggle rollout of new auth methods.
// Flip MOBILE_OTP_ENABLED to true only once Supabase phone auth (Twilio/MSG91) is configured & billed.
export const FEATURES = {
  MOBILE_OTP_ENABLED: process.env.NEXT_PUBLIC_MOBILE_OTP_ENABLED === "true",
  GOOGLE_LOGIN_ENABLED: true, // free on Supabase, safe to enable now
};