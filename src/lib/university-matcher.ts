import { UGC_UNIVERSITIES, type University } from "./universities";

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
 * Extracts normalized email domain from email address.
 */
export function getEmailDomain(email?: string): string {
  if (!email || !email.includes("@")) return "";
  return email.split("@")[1]?.toLowerCase().trim() || "";
}

/**
 * Checks whether two university identifiers, profiles, or users belong to the SAME university.
 * Uses a 3-tier matching cascade:
 * 1. Email domain identity (e.g. both @sguk.ac.in, @coep.ac.in)
 * 2. Exact or normalized institution name match
 * 3. UGC Universities alias and abbreviation lookup
 */
export function isSameUniversity(
  source: string | { org?: string | undefined; email?: string | undefined; university?: string | undefined },
  target: string | { org?: string | undefined; email?: string | undefined; university?: string | undefined }
): boolean {
  const srcObj = typeof source === "string" ? { org: source, university: source } : source;
  const tgtObj = typeof target === "string" ? { org: target, university: target } : target;

  const emailA = getEmailDomain(srcObj.email);
  const emailB = getEmailDomain(tgtObj.email);

  // 1. If both have institutional email domains, match them directly
  if (emailA && emailB && emailA === emailB) {
    return true;
  }

  const nameA = (srcObj.org || srcObj.university || "").trim();
  const nameB = (tgtObj.org || tgtObj.university || "").trim();

  if (!nameA || !nameB) {
    return false;
  }

  // 2. Exact match (case insensitive)
  if (nameA.toLowerCase() === nameB.toLowerCase()) {
    return true;
  }

  // 3. Normalized string match
  const normA = normalizeUniversityName(nameA);
  const normB = normalizeUniversityName(nameB);
  if (normA && normB && (normA === normB || normA.includes(normB) || normB.includes(normA))) {
    return true;
  }

  // 4. Match via UGC_UNIVERSITIES aliases
  for (const ugc of UGC_UNIVERSITIES) {
    const ugcNorm = normalizeUniversityName(ugc.name);
    const shortNorm = ugc.shortName ? normalizeUniversityName(ugc.shortName) : "";
    const aliasesNorm = (ugc.aliases || []).map(normalizeUniversityName);

    const matchesA =
      normA === ugcNorm ||
      (shortNorm && normA.includes(shortNorm)) ||
      aliasesNorm.some((a) => a && normA.includes(a));

    const matchesB =
      normB === ugcNorm ||
      (shortNorm && normB.includes(shortNorm)) ||
      aliasesNorm.some((a) => a && normB.includes(a));

    if (matchesA && matchesB) {
      return true;
    }
  }

  return false;
}
