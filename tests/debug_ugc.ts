import { UGC_UNIVERSITIES } from "../src/lib/universities.ts";
import { normalizeUniversityName } from "../src/lib/university-matcher.ts";

const normA = normalizeUniversityName("College of Engineering, Pune");
const normB = normalizeUniversityName("Sanjay Ghodawat University (SGU), Kolhapur");

console.log("normA:", normA);
console.log("normB:", normB);

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
    console.log("MATCHED:", ugc.name);
    console.log("  shortNorm:", shortNorm);
    console.log("  aliasesNorm:", aliasesNorm);
    break;
  }
}
