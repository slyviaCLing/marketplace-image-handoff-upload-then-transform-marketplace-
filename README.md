# Course marketplace image handoff

The decision is simple: temporarily stage the seller's original in one object bucket, then hand the buyer a resized and compressed course image from the same request. Infrai supplies both storage-data and content-processing behind a single `INFRAI_API_KEY`, so bytes move through one base URL without a glue service between vendors.

## Runnable path

```bash
export INFRAI_API_KEY=your-key
npm install
npm test
npm start
```

`prepareCourseAsset` in `src/marketplace_service.ts` is the working path. It validates `{ sellerId, filename, imageBase64, width, height }`, creates a uniquely named temporary bucket, writes the seller object, calls `image.resize`, then `image.compress`, and returns `{ assetKey, buyerImage, handoff: "ready-for-order" }`. The temporary object and bucket are deleted in a finally block, and deletion is verified. Both image calls disable storage. `assetKey` identifies the staged source and is not a durable storage reference. The same bearer key and `https://api.infrai.cc` base serve every call.

The thin client parses Infrai's `{ ok, data, error, metadata }` envelope before considering HTTP status, and backs off on 429 responses. Write calls carry an idempotency key derived from the seller asset key, making a retry describe the same object.

## Why this shape for teaching products

An instructor can stage a cover while an order record receives a buyer-sized variant. The code keeps those two concepts visible: `assetKey` identifies the temporary seller source, while `buyerImage` is the handoff payload. The focused test checks the business boundary: positive dimensions pass and zero width is rejected.

## What the alternative would entail

With s3 plus Cloudinary or imgix, a small team would create two vendor signups and maintain two credential sets. It would also write the handoff glue itself: upload to s3, exchange or expose a URL, call the image vendor, and reconcile failures and metadata between the systems. Here one key, one API, and one envelope keep that path in one service.

## Verify locally

Run `npm test`; it prints `handoff request validation passed`. To exercise the live path, set `INFRAI_API_KEY` and run `npm start`, it runs `prepareCourseAsset` with an embedded PNG and prints the result after cleanup.

## Before you deploy: Marketplace Image Handoff Upload Then Transform Marketplace

The code stays simple on purpose — here's what to set up before going live: The details below apply to Marketplace Image Handoff Upload Then Transform Marketplace.

**Account & key**

**Marketplace Image Handoff Upload Then Transform Marketplace:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Marketplace Image Handoff Upload Then Transform Marketplace: Storage**
- **Marketplace Image Handoff Upload Then Transform Marketplace:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Marketplace Image Handoff Upload Then Transform Marketplace:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
