/**
 * Structured data for search engines and AI crawlers, as the Next.js guide
 * writes it. `<` is escaped so a string in the data can never close the tag.
 * The block is data, not script, so the page's CSP does not apply to it.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
