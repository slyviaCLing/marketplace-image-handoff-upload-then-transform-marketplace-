import { handoffRequest, prepareCourseAsset } from "./marketplace_service.ts";

const valid = { sellerId: "teacher-17", filename: "lesson-cover.jpg", imageBase64: "aGVsbG8=", width: 800, height: 450 };
if (handoffRequest.parse(valid).width !== 800) throw new Error("valid course asset should retain dimensions");
let rejected = false;
try { handoffRequest.parse({ ...valid, width: 0 }); } catch { rejected = true; }
if (!rejected) throw new Error("zero width must be rejected");
console.log("handoff request validation passed");

const original = globalThis.fetch;
let listings = 0;
globalThis.fetch = async (input) => {
  const path = String(input);
  let data: unknown = {};
  if (path.includes("/object/list/")) {
    listings += 1;
    if (listings === 3) return new Response(JSON.stringify({ ok: false, error: { message: "Bucket not found" } }), { status: 404 });
    data = [];
  } else if (path.includes("/image/")) {
    data = { url: "data:image/webp;base64,aGVsbG8=" };
  }
  return new Response(JSON.stringify({ ok: true, data }));
};
const previousKey = process.env.INFRAI_API_KEY;
process.env.INFRAI_API_KEY = "local-test";
try {
  const result = await prepareCourseAsset(valid);
  if (result.handoff !== "ready-for-order" || listings !== 3) throw new Error("handoff must survive a transient successful bucket listing and verify 404");
} finally {
  globalThis.fetch = original;
  if (previousKey === undefined) delete process.env.INFRAI_API_KEY;
  else process.env.INFRAI_API_KEY = previousKey;
}
console.log("eventual bucket deletion verification passed");
