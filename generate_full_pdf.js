import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const sguLogoSvg = `
<svg width="86" height="92" viewBox="0 0 90 95" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="86" height="91" rx="6" fill="#c4161c" stroke="#8b0000" stroke-width="2"/>
  <rect x="5" y="5" width="80" height="18" fill="#8b0000" rx="3"/>
  <g fill="#ffffff" transform="translate(11, 8)">
    <polygon points="6,0 7.8,5.5 13.6,5.5 9,8.8 10.7,14.3 6,11 1.3,14.3 3,8.8 -1.6,5.5 4.2,5.5" transform="scale(0.8)"/>
    <polygon points="6,0 7.8,5.5 13.6,5.5 9,8.8 10.7,14.3 6,11 1.3,14.3 3,8.8 -1.6,5.5 4.2,5.5" transform="translate(16,0) scale(0.8)"/>
    <polygon points="6,0 7.8,5.5 13.6,5.5 9,8.8 10.7,14.3 6,11 1.3,14.3 3,8.8 -1.6,5.5 4.2,5.5" transform="translate(32,0) scale(0.8)"/>
    <polygon points="6,0 7.8,5.5 13.6,5.5 9,8.8 10.7,14.3 6,11 1.3,14.3 3,8.8 -1.6,5.5 4.2,5.5" transform="translate(48,0) scale(0.8)"/>
    <polygon points="6,0 7.8,5.5 13.6,5.5 9,8.8 10.7,14.3 6,11 1.3,14.3 3,8.8 -1.6,5.5 4.2,5.5" transform="translate(64,0) scale(0.8)"/>
  </g>
  <text x="45" y="47" font-family="'Times New Roman', serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="1">SGU</text>
  <g transform="translate(45, 68)" stroke="#ffffff" stroke-width="1.8" fill="none">
    <circle cx="0" cy="0" r="6" fill="#ffffff"/>
    <line x1="0" y1="-14" x2="0" y2="14"/>
    <line x1="-14" y1="0" x2="14" y2="0"/>
    <line x1="-10" y1="-10" x2="10" y2="10"/>
    <line x1="-10" y1="10" x2="10" y2="-10"/>
    <line x1="-5" y1="-13" x2="5" y2="13"/>
    <line x1="-13" y1="-5" x2="13" y2="5"/>
    <line x1="-13" y1="5" x2="13" y2="-5"/>
    <line x1="-5" y1="13" x2="5" y2="-13"/>
    <circle cx="0" cy="0" r="14" stroke-dasharray="2,3"/>
  </g>
</svg>
`;

// Helper for page templates
function renderPage(content, pageNumStr = "", runningHeader = "") {
  return `
  <div class="page">
    ${runningHeader ? `<div class="running-header"><span>CampusVenture: Field Project Report</span><span>${runningHeader}</span></div>` : ""}
    <div class="page-content">
      ${content}
    </div>
    ${pageNumStr ? `<div class="running-footer">${pageNumStr}</div>` : ""}
  </div>
  `;
}

// Let's create the full HTML
console.log("Compiling 26-page report...");
