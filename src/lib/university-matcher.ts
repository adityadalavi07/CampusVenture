import { UGC_UNIVERSITIES, type University } from "./universities";

/**
 * Public consumer email domains that should NOT be treated as institutional campus identifiers.
 */
export const PUBLIC_CONSUMER_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "yahoo.co.uk",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "zoho.com",
  "mail.com",
  "yandex.com",
  "gmx.com",
  "fastmail.com",
]);

/**
 * Extracts normalized email domain from an email address.
 */
export function getEmailDomain(email?: string): string {
  if (!email || !email.includes("@")) return "";
  return email.split("@")[1]?.toLowerCase().trim() || "";
}

/**
 * Determines whether a domain is an authentic institutional university domain
 * (e.g. sguk.ac.in, coep.ac.in, mit.edu, stanford.edu, ox.ac.uk, iitb.ac.in).
 */
export function isInstitutionalDomain(domain?: string): boolean {
  if (!domain) return false;
  const d = domain.toLowerCase().trim();
  if (d.length < 4 || !d.includes(".")) return false;
  return !PUBLIC_CONSUMER_DOMAINS.has(d);
}

/**
 * Extracts the "institution base" from an email domain by stripping
 * known academic suffixes (.ac.in, .edu.in, .edu, .res.in, .ac.uk, etc.)
 * and common prefixes (mail., webmail., students., etc.).
 * e.g. "sguk.ac.in" → "sguk", "ritindia.edu" → "ritindia", "cs.mit.edu" → "mit"
 */
export function getInstitutionBase(domain?: string): string {
  if (!domain) return "";
  let d = domain.toLowerCase().trim();
  // Strip academic suffixes
  const suffixes = [".ac.in", ".edu.in", ".res.in", ".ernet.in", ".ac.uk", ".ac.nz", ".edu.au", ".edu"];
  for (const suf of suffixes) {
    if (d.endsWith(suf)) {
      d = d.slice(0, -suf.length);
      break;
    }
  }
  // Strip common subdomains
  const prefixes = ["mail.", "webmail.", "students.", "student.", "stu.", "cs.", "ee.", "mech.", "it.", "admin."];
  for (const pre of prefixes) {
    if (d.startsWith(pre)) {
      d = d.slice(pre.length);
      break;
    }
  }
  return d;
}

/**
 * Checks whether two domains belong to the exact same institution,
 * including department/campus subdomains (e.g. cs.stanford.edu and stanford.edu)
 * and cross-suffix matches (e.g. ritindia.ac.in and ritindia.edu).
 */
export function areMatchingDomains(domainA?: string, domainB?: string): boolean {
  if (!domainA || !domainB) return false;
  const a = domainA.toLowerCase().trim();
  const b = domainB.toLowerCase().trim();
  if (!isInstitutionalDomain(a) || !isInstitutionalDomain(b)) return false;
  // Exact or subdomain match
  if (a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`)) return true;
  // Base institution match (strips .ac.in, .edu, etc.)
  const baseA = getInstitutionBase(a);
  const baseB = getInstitutionBase(b);
  if (baseA && baseB && baseA.length >= 3 && baseA === baseB) return true;
  return false;
}

/**
 * Normalizes university names by stripping punctuation, common suffixes, and whitespace.
 */
export function normalizeUniversityName(name?: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[(),.\-–—/]/g, " ")
    .replace(/\b(university|college|institute|autonomous|deemed|technological|technology|of|and|in)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks whether two university identifiers, profiles, or users belong to the SAME university.
 * Uses a strict, globally scalable multi-tenant evaluation:
 *
 * 1. INSTITUTIONAL EMAIL DOMAIN RULE (Gold Standard for global security):
 *    - If both parties have institutional domains (e.g. @mit.edu vs @stanford.edu, or @coep.ac.in vs @sguk.ac.in),
 *      they match IF AND ONLY IF their domains match.
 *    - If both have institutional domains and they do NOT match, they are STRICTLY DIFFERENT UNIVERSITIES.
 *
 * 2. EXACT NAME MATCH:
 *    - Case-insensitive exact match of full institution title.
 *
 * 3. TOKEN-LEVEL NORMALIZED MATCH:
 *    - Compares token sets with word boundaries (minimum 80% overlap).
 *    - Never uses loose substring matching, preventing city/generic collisions (e.g. "Pune", "Engineering").
 *
 * 4. CATALOG UGC / GLOBAL REGISTRY MATCH:
 *    - Token-level exact alias / abbreviation matching with boundary protection.
 */
export function isSameUniversity(
  source: string | { org?: string | undefined; email?: string | undefined; university?: string | undefined },
  target: string | { org?: string | undefined; email?: string | undefined; university?: string | undefined }
): boolean {
  const srcObj = typeof source === "string" ? { org: source, university: source } : source;
  const tgtObj = typeof target === "string" ? { org: target, university: target } : target;

  const emailA = getEmailDomain(srcObj.email);
  const emailB = getEmailDomain(tgtObj.email);

  const instA = isInstitutionalDomain(emailA);
  const instB = isInstitutionalDomain(emailB);

  // 1. Institutional Domain Evaluation:
  if (instA && instB) {
    // Both have official domains: exact or subdomain match is REQUIRED.
    return areMatchingDomains(emailA, emailB);
  }

  const nameA = (srcObj.org || srcObj.university || "").trim();
  const nameB = (tgtObj.org || tgtObj.university || "").trim();

  if (!nameA || !nameB) {
    // If one has an institutional domain and the other has a matching domain, match; otherwise false
    if (instA && instB) return areMatchingDomains(emailA, emailB);
    return false;
  }

  // 2. Exact match (case insensitive)
  if (nameA.toLowerCase() === nameB.toLowerCase()) {
    return true;
  }

  // 3. Normalized string match
  const normA = normalizeUniversityName(nameA);
  const normB = normalizeUniversityName(nameB);

  if (!normA || !normB) {
    return false;
  }

  if (normA === normB) {
    return true;
  }

  // Token-level comparison (require word-boundary token set match)
  const tokensA = normA.split(/\s+/).filter((t) => t.length >= 3);
  const tokensB = normB.split(/\s+/).filter((t) => t.length >= 3);

  if (tokensA.length >= 2 && tokensB.length >= 2) {
    const setB = new Set(tokensB);
    const matches = tokensA.filter((t) => setB.has(t)).length;
    const maxTokens = Math.max(tokensA.length, tokensB.length);
    if (matches / maxTokens >= 0.8) {
      return true;
    }
  }

  // 4. Match via UGC_UNIVERSITIES catalog with strict whole-word / token boundaries
  for (const ugc of UGC_UNIVERSITIES) {
    const ugcNorm = normalizeUniversityName(ugc.name);
    const shortNorm = ugc.shortName ? normalizeUniversityName(ugc.shortName) : "";
    const aliasesNorm = (ugc.aliases || []).map(normalizeUniversityName).filter((a) => a.length >= 4);

    const tokensUgc = ugcNorm.split(/\s+/).filter((t) => t.length >= 3);

    const matchesA =
      normA === ugcNorm ||
      (shortNorm && shortNorm.length >= 3 && tokensA.includes(shortNorm)) ||
      aliasesNorm.some((a) => normA === a || normA.split(/\s+/).includes(a));

    const matchesB =
      normB === ugcNorm ||
      (shortNorm && shortNorm.length >= 3 && tokensB.includes(shortNorm)) ||
      aliasesNorm.some((a) => normB === a || normB.split(/\s+/).includes(a));

    if (matchesA && matchesB) {
      return true;
    }
  }

  return false;
}
