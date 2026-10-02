/**
 * Serialize a value for embedding in a `<script type="application/ld+json">`
 * tag. `JSON.stringify` does not escape `<`, so a value containing
 * `</script>` could break out of the tag and enable stored XSS. Escaping
 * every `<` as `\u003c` keeps the output valid JSON-LD while making it
 * impossible to terminate the surrounding script element.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default safeJsonLd;
