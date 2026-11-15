import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

process.env.VERCEL = "1";
process.env.MONGODB_URI = "";

const originalMkdirSync = fs.mkdirSync;
const localAadhaarDir = path.resolve("private_uploads/aadhaar");
fs.mkdirSync = function (directory, ...args) {
  if (directory === localAadhaarDir) {
    throw new Error("Vercel deployment files are read-only");
  }
  return originalMkdirSync.call(this, directory, ...args);
};

let app;
try {
  ({ default: app } = await import("./src/index.js"));
} finally {
  fs.mkdirSync = originalMkdirSync;
}

const server = http.createServer(app);

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

try {
  const { port } = server.address();
  const healthResponse = await fetch(`http://127.0.0.1:${port}/api/health`);
  const healthBody = await healthResponse.json();
  assert.equal(healthResponse.status, 200);
  assert.equal(healthBody.status, "ok");

  const apiResponse = await fetch(`http://127.0.0.1:${port}/api/auth/login`);
  const apiBody = await apiResponse.json();
  assert.equal(apiResponse.status, 503);
  assert.match(apiBody.message, /temporarily unavailable/i);

  console.log("Vercel handler checks passed.");
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
