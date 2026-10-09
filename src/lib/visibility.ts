/** Decides whether a content entry is built. Pure so it can be unit tested. */
export interface VisibilityFlags {
  draft?: boolean;
  sample?: boolean;
}

export interface VisibilityOptions {
  /** Drafts are shown by the dev server so writers can preview them. */
  dev: boolean;
  /** `PUBLIC_HIDE_SAMPLES=true` removes the placeholder sample content (set it for launch). */
  hideSamples: boolean;
}

export function isPublished(data: VisibilityFlags, { dev, hideSamples }: VisibilityOptions) {
  if (data.draft && !dev) return false;
  if (data.sample && hideSamples) return false;
  return true;
}
