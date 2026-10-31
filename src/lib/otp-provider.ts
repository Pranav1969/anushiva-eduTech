// src/lib/otp-provider.ts
// One switch for how OTP SMS is sent/checked.
//   OTP_PROVIDER=textbee  -> temporary dev gateway (your Android phone)
//   OTP_PROVIDER=twilio   -> Twilio Verify (production)
// Routes call sendOtp / checkOtp and never care which one is active.

import { sendTwilioOtp, checkTwilioOtp } from "./twilio-verify";
import { sendTextbeeOtp, checkTextbeeOtp } from "./textbee-otp";

const useTextbee = () => (process.env.OTP_PROVIDER || "twilio").toLowerCase() === "textbee";

export function sendOtp(e164Phone: string) {
  return useTextbee() ? sendTextbeeOtp(e164Phone) : sendTwilioOtp(e164Phone);
}

export function checkOtp(e164Phone: string, code: string) {
  return useTextbee() ? checkTextbeeOtp(e164Phone, code) : checkTwilioOtp(e164Phone, code);
}