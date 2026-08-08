interface Fetcher { fetch(request: Request): Promise<Response>; }
interface D1Database { readonly __d1Brand?: "D1Database"; }
interface R2ObjectBody {
  body: ReadableStream<Uint8Array>;
}
interface R2Bucket {
  readonly __r2Brand?: "R2Bucket";
  put(key: string, value: ArrayBuffer | ReadableStream, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
}
declare module "cloudflare:workers" {
  export const env: { DB: D1Database; FILES: R2Bucket; [key: string]: unknown };
}
