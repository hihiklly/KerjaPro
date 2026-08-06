interface Fetcher { fetch(request: Request): Promise<Response>; }
interface D1Database { readonly __d1Brand?: "D1Database"; }
interface R2Bucket { readonly __r2Brand?: "R2Bucket"; }
declare module "cloudflare:workers" {
  export const env: { DB: D1Database; FILES: R2Bucket; [key: string]: unknown };
}
