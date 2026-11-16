import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { getPreliminaryPages } from "./generate_pages_prelim.js";
import { getChapter1To5Pages } from "./generate_pages_ch1_to_5.js";
import { getChapter6To11Pages } from "./generate_pages_ch6_to_11.js";

console.log("Compiling CampusVenture 26-Page Academic Field Project Report...");

const prelimPages = getPreliminaryPages();
const ch1to5Pages = getChapter1To5Pages();
const ch6to11Pages = getChapter6To11Pages();

const allPages = [...prelimPages, ...ch1to5Pages, ...ch6to11Pages];

console.log(`Total Pages Assembled: ${allPages.length} pages (6 Preliminary + 20 Chapter Pages).`);

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CampusVenture - Field Project Report (UCSFP301)</title>
  <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: 'Times New Roman', Times, serif;
      -webkit-font-smoothing: antialiased;
    }
    .page {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      min-height: 297mm;
      padding: 14mm 18mm 14mm 22mm;
      position: relative;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      background: #ffffff;
    }
    .page-header {
      font-size: 8.5pt;
      font-style: italic;
      color: #64748b;
      border-bottom: 0.6px solid #cbd5e1;
      padding-bottom: 1.5mm;
      margin-bottom: 3mm;
      display: flex;
      justify-content: space-between;
      width: 100%;
    }
    .page-footer {
      font-size: 8.5pt;
      color: #64748b;
      border-top: 0.6px solid #cbd5e1;
      padding-top: 1.5mm;
      position: absolute;
      bottom: 10mm;
      left: 22mm;
      right: 18mm;
      display: flex;
      justify-content: space-between;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      vertical-align: top;
    }
    p {
      margin-top: 0;
    }
    ul, ol {
      margin-top: 0;
      padding-left: 5mm;
    }
    h1, h2, h3, h4 {
      margin-top: 0;
    }
  </style>
</head>
<body>
  ${allPages.join("\n")}
</body>
</html>
`;

const htmlFilePath = path.resolve("report.html");
const pdfFilePath = path.resolve("CampusVenture_Field_Project_Report.pdf");

fs.writeFileSync(htmlFilePath, htmlContent, "utf-8");
console.log(`Wrote comprehensive report HTML to ${htmlFilePath} (${(fs.statSync(htmlFilePath).size / 1024).toFixed(1)} KB)`);

// Render to PDF using Chrome Headless
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

if (!fs.existsSync(chromePath)) {
  console.error(`Chrome executable not found at ${chromePath}`);
  process.exit(1);
}

console.log("Invoking headless Chrome to generate vector PDF...");
const command = `"${chromePath}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfFilePath}" "file:///${htmlFilePath.replace(/\\\\/g, "/")}"`;

try {
  execSync(command, { stdio: "inherit" });
  if (fs.existsSync(pdfFilePath)) {
    const stats = fs.statSync(pdfFilePath);
    console.log(`SUCCESS: Generated PDF at ${pdfFilePath}`);
    console.log(`File Size: ${(stats.size / 1024).toFixed(1)} KB`);
  } else {
    console.error("PDF generation failed: File does not exist after Chrome execution.");
    process.exit(1);
  }
} catch (error) {
  console.error("Error executing Chrome command:", error);
  process.exit(1);
}
