import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { infrai } from "./infrai.ts";

export const handoffRequest = z.object({ sellerId: z.string().min(1), filename: z.string().min(1), imageBase64: z.string().min(1), width: z.number().int().positive().max(2400), height: z.number().int().positive().max(2400) });
export type HandoffRequest = z.infer<typeof handoffRequest>;

export async function prepareCourseAsset(input: unknown) {
  const request = handoffRequest.parse(input);
  const bucket = `course-${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const key = `${request.sellerId}/${request.filename}`;
  await infrai.storage.bucket.create({ name: bucket });
  try {
    await infrai.storage.object.put(bucket, key, { data_base64: request.imageBase64, content_type: "image/png", idempotency_key: `${bucket}/${key}` });
    const resized = await infrai.image.resize({ image: { base64: request.imageBase64 }, width: request.width, height: request.height, fit: "cover", enlarge: false, format: "webp", store: false });
    const compressed = await infrai.image.compress({ image: { base64: resized.url.split(",")[1] }, store: false });
    return { sellerId: request.sellerId, assetKey: key, buyerImage: compressed.url, handoff: "ready-for-order" as const };
  } finally {
    try {
      await infrai.storage.object.delete(bucket, key);
    } catch (error) {
      if ((error as { status?: number }).status !== 404) throw error;
    }
    const remaining = await infrai.storage.object.list(bucket);
    if (JSON.stringify(remaining).includes(key)) throw new Error(`Object cleanup failed: ${bucket}/${key}`);
    await infrai.storage.bucket.delete(bucket);
    let bucketDeleted = false;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
      try {
        await infrai.storage.object.list(bucket);
      } catch (error) {
        if ((error as { status?: number }).status !== 404) throw error;
        bucketDeleted = true;
        break;
      }
    }
    if (!bucketDeleted) throw new Error(`Bucket cleanup failed: ${bucket}`);
    console.log(`Deleted and verified temporary bucket: ${bucket}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await prepareCourseAsset({
    sellerId: "demo", filename: "cover.png",
    imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=",
    width: 800, height: 450,
  });
  console.log(JSON.stringify(result));
}
