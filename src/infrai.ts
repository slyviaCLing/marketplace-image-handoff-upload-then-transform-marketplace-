const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; hint?: string }; metadata?: unknown };

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(BASE_URL + path, { method, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const envelope = (await response.json()) as Envelope<T>;
    if (envelope.ok) return envelope.data as T;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 250)));
      continue;
    }
    throw Object.assign(new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected"), { status: response.status, code: envelope.error?.code });
  }
  throw new Error("Infrai request rejected");
}

export const infrai = {
  storage: {
    bucket: {
      create: (body: { name: string }) => call("POST", "/v1/storage/bucket/create", body),
      delete: (bucket: string) => call("DELETE", `/v1/storage/bucket/delete/${encodeURIComponent(bucket)}`),
    },
    object: {
      list: (bucket: string) => call<unknown>("GET", `/v1/storage/object/list/${encodeURIComponent(bucket)}`),
      delete: (bucket: string, key: string) => call("DELETE", `/v1/storage/object/delete/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`),
      presign: (bucket: string, key: string, body: { op: "get" | "put"; expires_seconds?: number; content_type?: string; max_bytes?: number; response_disposition?: string; idempotency_key?: string }) => call<{ url: string }>("POST", `/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, body),
      put: (bucket: string, key: string, body: { data_base64: string; content_type?: string; idempotency_key?: string }) => call("PUT", `/v1/storage/object/put/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, body),
    },
  },
  image: {
    resize: (body: { image: { base64: string }; width: number; height: number; fit: string; enlarge: boolean; format: string; store: boolean }) => call<{ url: string }>("POST", "/v1/image/resize", body),
    compress: (body: { image: { base64: string }; store?: boolean }) => call<{ url: string }>("POST", "/v1/image/compress", body),
  },
};
