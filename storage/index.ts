let filesBinding: R2Bucket | undefined;

export function setFilesBinding(binding: R2Bucket | undefined) {
  filesBinding = binding;
}

export function getFilesBinding() {
  if (!filesBinding) {
    throw new Error("Cloudflare R2 binding `FILES` is unavailable. Set the `r2` field in .openai/hosting.json to `FILES` or let the hosting control plane inject it.");
  }
  return filesBinding;
}
