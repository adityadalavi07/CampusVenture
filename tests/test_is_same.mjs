import { isSameUniversity } from "../src/lib/university-matcher.ts";

console.log("COEP vs SGU startup:", isSameUniversity(
  { org: "College of Engineering, Pune", email: "innovation@coep.ac.in" },
  { university: "Sanjay Ghodawat University (SGU), Kolhapur", email: "252921389@sguk.ac.in" }
));

console.log("COEP vs Northbridge Seed:", isSameUniversity(
  { org: "College of Engineering, Pune", email: "innovation@coep.ac.in" },
  { university: "Northbridge Seed", email: "krishthekrasher@gmail.com" }
));

console.log("COEP vs NIAT:", isSameUniversity(
  { org: "College of Engineering, Pune", email: "innovation@coep.ac.in" },
  { university: "NIAT", email: "252921378@sguk.ac.in" }
));
