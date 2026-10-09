/**
 * Article templates add sections with fixed ids (verdict, specs, quick-list …). A body heading
 * with the same slug would duplicate the id and break jump links, so templates call this to
 * stop the build with a message the writer can act on.
 */
export function assertNoHeadingClash(
  article: string,
  headings: readonly { slug: string }[],
  templateIds: readonly string[],
): void {
  const reserved = new Set(templateIds.flatMap((id) => [id, `${id}-title`]));
  const clash = [...new Set(headings.map((h) => h.slug).filter((slug) => reserved.has(slug)))];
  if (clash.length) {
    throw new Error(
      `${article}: body headings ${clash.map((id) => `"${id}"`).join(', ')} clash with sections the template adds. Remove or rename them (see CONTENT-GUIDE.md).`,
    );
  }
}
