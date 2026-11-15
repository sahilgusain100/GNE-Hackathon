import assert from "node:assert/strict";
import http from "node:http";

process.env.VERCEL = "1";
process.env.MONGODB_URI = "";

const { default: app } = await import("./src/index.js");
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
