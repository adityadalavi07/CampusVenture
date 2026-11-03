import fs from "fs";
import path from "path";

const routesDir = "src/routes";
const files = fs.readdirSync(routesDir).filter((f) => f.endsWith(".tsx"));

const inventory = [];

for (const f of files) {
  const filePath = path.join(routesDir, f);
  const content = fs.readFileSync(filePath, "utf8");

  // Analyze features and buttons
  const buttons = (content.match(/<Button[^>]*>/g) || []).length;
  const forms = (content.match(/<form[^>]*>/g) || []).length;
  const inputs = (content.match(/<Input[^>]*>/g) || []).length;
  const modals = (content.match(/<Dialog[^>]*>|<AlertDialog[^>]*>/g) || []).length;
  const tabs = (content.match(/<Tabs[^>]*>/g) || []).length;

  // Services used
  const services = [];
  if (content.includes("ventureService")) services.push("ventureService");
  if (content.includes("requestService")) services.push("requestService");
  if (content.includes("messageService")) services.push("messageService");
  if (content.includes("investorService")) services.push("investorService");
  if (content.includes("notificationService")) services.push("notificationService");
  if (content.includes("cofounderService")) services.push("cofounderService");
  if (content.includes("supabase.")) services.push("directSupabase");
  if (content.includes("localStorage")) services.push("localStorage");
  if (content.includes("sessionStorage")) services.push("sessionStorage");

  // Title and Description
  const titleMatch = content.match(/const TITLE = "(.*?)";/);
  const descMatch = content.match(/const DESCRIPTION =\s*"(.*?)";/s);

  inventory.push({
    file: f,
    title: titleMatch ? titleMatch[1] : f,
    description: descMatch ? descMatch[1].replace(/\s+/g, " ").trim() : "",
    buttons,
    forms,
    inputs,
    modals,
    tabs,
    services,
  });
}

console.log(JSON.stringify(inventory, null, 2));
