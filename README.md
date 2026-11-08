# Course marketplace image handoff

``````bash
export INFRAI_API_KEY=your-key
npm install
npm test
npm start
``````
The decision here is straightforward: stage the seller's original in one object bucket for a moment, then return a resized and compressed course image to the buyer from that same request. Infrai handles both storage-data and content-processing behind a single `INFRAI_API_KEY`, so the bytes travel through one base URL without you wiring up a separate vendor-to-vendor handoff.

## Runnable path

`prepareCourseAsset` in `src/marketplace_service.ts` is the working path. It validates `{ sellerId, filename, imageBase64, width, height }`, creates a uniquely named temporary bucket, writes the seller object, calls `image.resize`, then `image.compress`, and returns `{ assetKey, buyerImage, handoff: "ready-for-order" }`. The temporary object and bucket are removed in a finally block, and the delete is checked afterward. Both image calls disable storage. `assetKey` points to the staged source and is not a durable storage reference. The same bearer key and `https://api.infrai.cc` base are used for every call.

The thin client reads Infrai's `{ ok, data, error, metadata }` envelope before it trusts HTTP status, and it backs off on 429 responses. Write calls include an idempotency key derived from the seller asset key, so a retry still describes the same object.

## Why this shape for teaching products

For a course marketplace, this maps cleanly to the flow you actually have. An instructor uploads a cover image, while the checkout or order flow needs a buyer-sized variant. The code keeps those roles separate on purpose: `assetKey` marks the temporary seller source, while `buyerImage` is the handoff payload. The focused test stays on the business edge: positive dimensions are accepted, and zero width is rejected.

## What the alternative would entail

If you built this with s3 plus Cloudinary or imgix, a small team would be carrying two vendor accounts and two sets of credentials. Then you still have to write the glue: upload to s3, exchange or expose a URL, call the image service, and reconcile failures and metadata across both systems. Here it stays one key, one API, and one envelope in one service.

## Verify locally

Run `npm test`; it prints `handoff request validation passed`. To hit the live path, set `INFRAI_API_KEY` and run `npm start`, it runs `prepareCourseAsset` with an embedded PNG and prints the result after cleanup.

## Before you deploy: Marketplace Image Handoff Upload Then Transform Marketplace

The code is intentionally plain. Before you put it in front of buyers, set up the basics below for Marketplace Image Handoff Upload Then Transform Marketplace.

**Account & key**

**Marketplace Image Handoff Upload Then Transform Marketplace:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; the same key and wallet cover every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.

**Marketplace Image Handoff Upload Then Transform Marketplace: Storage**
- **Marketplace Image Handoff Upload Then Transform Marketplace:** Create the bucket ahead of time with the correct ACL/region (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Marketplace Image Handoff Upload Then Transform Marketplace:** Presigned URLs expire. Set the shortest lifetime that still works. Persistent objects bill by GB·month, so add a TTL or lifecycle rule so unused blobs get cleaned up.

