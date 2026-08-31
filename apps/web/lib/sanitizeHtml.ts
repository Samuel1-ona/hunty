import DOMPurify from "isomorphic-dompurify";

export function sanitizeHtml(html: string) {
  if (!html) return "";
  return DOMPurify.sanitize(html);
}

export default sanitizeHtml;
