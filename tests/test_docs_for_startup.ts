import fs from "fs";

global.window = {
  dispatchEvent: () => {},
  localStorage: {
    getItem: () => null,
    setItem: () => {},
  },
} as any;
global.localStorage = (global.window as any).localStorage;

async function testDocs() {
  const { requestService } = await import("../src/services/requestService.ts");
  const startupId = "s-mvktiqwp";
  console.log("Calling getDataRoomDocsForStartup for:", startupId);
  const docs = await requestService.getDataRoomDocsForStartup(startupId);
  console.log("Docs returned count:", docs.length);
  console.log("Docs:", docs);
}

testDocs();
