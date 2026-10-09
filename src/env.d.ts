interface ImportMetaEnv {
  /** "true" leaves sample content out of the build (see CONTENT-GUIDE.md). */
  readonly PUBLIC_HIDE_SAMPLES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
