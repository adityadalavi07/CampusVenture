import test from "node:test";
import assert from "node:assert/strict";

// Email & password validation functions from auth
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const pwOk = (p) => p.length >= 8 && /\d/.test(p) && /[A-Za-z]/.test(p);
const mask = (e) => {
  if (!e || !e.includes("@")) return e;
  const [a, b] = e.split("@");
  if (!a || !b) return e;
  return a[0] + "•••" + (a.length > 1 ? a.slice(-1) : "") + "@" + b;
};

const UNIVERSITY_DOMAINS = ["sguk.ac.in", "coep.ac.in", "ac.in", "edu", "edu.in"];
function isUniversityEmail(email) {
  if (!email || !email.includes("@")) return false;
  const domain = email.toLowerCase().split("@")[1]?.trim();
  if (!domain) return false;
  return UNIVERSITY_DOMAINS.some((d) => domain === d || domain.endsWith("." + d));
}

test("emailOk validates real email addresses", () => {
  assert.equal(emailOk("user@example.com"), true);
  assert.equal(emailOk("student@sguk.ac.in"), true);
  assert.equal(emailOk("notanemail"), false);
  assert.equal(emailOk("@domain.com"), false);
  assert.equal(emailOk("user@"), false);
});

test("pwOk enforces strong password rules", () => {
  assert.equal(pwOk("ValidPass123"), true);
  assert.equal(pwOk("D@lavi2026"), true);
  assert.equal(pwOk("short1"), false); // under 8 characters
  assert.equal(pwOk("alllettersonly"), false); // no number
  assert.equal(pwOk("12345678"), false); // no letter
});

test("isUniversityEmail correctly verifies institutional domains", () => {
  assert.equal(isUniversityEmail("252921389@sguk.ac.in"), true);
  assert.equal(isUniversityEmail("dean@coep.ac.in"), true);
  assert.equal(isUniversityEmail("student@mit.edu"), true);
  assert.equal(isUniversityEmail("investor@gmail.com"), false);
  assert.equal(isUniversityEmail("founder@yahoo.com"), false);
  assert.equal(isUniversityEmail("alex@outlook.com"), false);
});

test("maskEmail correctly masks email for privacy", () => {
  assert.equal(mask("alex@example.com"), "a•••x@example.com");
  assert.equal(mask("a@example.com"), "a•••@example.com");
});

test("checkRateLimit allows within limit and blocks on excess", () => {
  const limits = new Map();
  function checkLimit(key, limit, windowMs) {
    const now = Date.now();
    const record = limits.get(key);
    if (!record || now > record.resetAt) {
      limits.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true };
    }
    if (record.count >= limit) {
      return { allowed: false };
    }
    record.count++;
    return { allowed: true };
  }

  const key = "test-ip";
  assert.equal(checkLimit(key, 3, 1000).allowed, true);
  assert.equal(checkLimit(key, 3, 1000).allowed, true);
  assert.equal(checkLimit(key, 3, 1000).allowed, true);
  assert.equal(checkLimit(key, 3, 1000).allowed, false); // 4th request blocked
});
