import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRegistrationInput } from "./registration-schema.mjs";

const validInput = {
  fullName: "Ariel Cliente",
  email: "cliente@example.com",
  password: "supersecreta",
  confirmPassword: "supersecreta",
};

test("accepts a valid registration payload", () => {
  const result = parseRegistrationInput(validInput);
  assert.equal(result.success, true);
  assert.equal(result.data.email, "cliente@example.com");
});

test("rejects a missing full name", () => {
  const result = parseRegistrationInput({ ...validInput, fullName: "" });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "fullName");
});

test("rejects an invalid email", () => {
  const result = parseRegistrationInput({ ...validInput, email: "not-an-email" });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "email");
});

test("rejects a short password", () => {
  const result = parseRegistrationInput({ ...validInput, password: "123", confirmPassword: "123" });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "password");
});

test("rejects mismatched passwords", () => {
  const result = parseRegistrationInput({ ...validInput, confirmPassword: "otra-clave" });
  assert.equal(result.success, false);
  assert.equal(result.error.field, "confirmPassword");
});
