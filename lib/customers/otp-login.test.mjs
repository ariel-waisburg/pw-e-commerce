import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOtpCode } from "./otp-login.mjs";

test("normalizes a six digit OTP code", () => {
  assert.equal(normalizeOtpCode(" 123 456 "), "123456");
});

test("rejects codes that are not exactly six digits", () => {
  assert.equal(normalizeOtpCode("12345"), "");
  assert.equal(normalizeOtpCode("1234567"), "");
  assert.equal(normalizeOtpCode("abc123"), "");
});
