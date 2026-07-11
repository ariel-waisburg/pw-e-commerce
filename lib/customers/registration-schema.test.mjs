import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRegistrationInput } from "./registration-schema.mjs";

const validInput = {
  fullName: "Ariel Cliente",
  email: "cliente@example.com",
};

test("accepts a valid registration payload", () => {
  const result = parseRegistrationInput(validInput);
  assert.equal(result.success, true);
  assert.equal(result.data.email, "cliente@example.com");
  assert.equal("password" in result.data, false);
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

test("ignores password fields from legacy clients", () => {
  const result = parseRegistrationInput({
    ...validInput,
    password: "supersecreta",
    confirmPassword: "otra-clave",
  });
  assert.equal(result.success, true);
  assert.equal("password" in result.data, false);
  assert.equal("confirmPassword" in result.data, false);
});
