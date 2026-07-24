import { describe, it, expect, vi, beforeEach } from "vitest";
import DOMPurify from "isomorphic-dompurify";
import { sanitizeHtml } from "../sanitizeHtml";

vi.mock("isomorphic-dompurify", () => ({
  default: {
    sanitize: vi.fn((html: string) => html),
  },
}));

describe("sanitizeHtml", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("");
    expect(DOMPurify.sanitize).not.toHaveBeenCalled();
  });

  it("returns empty string for null input", () => {
    expect(sanitizeHtml(null as unknown as string)).toBe("");
    expect(DOMPurify.sanitize).not.toHaveBeenCalled();
  });

  it("returns empty string for undefined input", () => {
    expect(sanitizeHtml(undefined as unknown as string)).toBe("");
    expect(DOMPurify.sanitize).not.toHaveBeenCalled();
  });

  it("calls DOMPurify.sanitize with the provided HTML", () => {
    sanitizeHtml("<p>hello</p>");
    expect(DOMPurify.sanitize).toHaveBeenCalledWith("<p>hello</p>");
  });

  it("calls DOMPurify.sanitize exactly once", () => {
    sanitizeHtml("<b>bold</b>");
    expect(DOMPurify.sanitize).toHaveBeenCalledTimes(1);
  });

  it("returns the sanitized result from DOMPurify", () => {
    const mockSanitized = "<p>cleaned</p>";
    vi.mocked(DOMPurify.sanitize).mockReturnValueOnce(mockSanitized);
    expect(sanitizeHtml("<script>alert('xss')</script>")).toBe(mockSanitized);
  });

  it("passes plain text unchanged through DOMPurify", () => {
    sanitizeHtml("just some text");
    expect(DOMPurify.sanitize).toHaveBeenCalledWith("just some text");
  });

  it("handles HTML with special characters", () => {
    sanitizeHtml("<div>&amp;&lt;&gt;</div>");
    expect(DOMPurify.sanitize).toHaveBeenCalledWith("<div>&amp;&lt;&gt;</div>");
  });
});
