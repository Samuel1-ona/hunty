import { describe, expect, it } from "vitest";

import { safeJsonLd } from "@/lib/safeJsonLd";

describe("safeJsonLd", () => {
  it("serializes plain objects as JSON", () => {
    expect(safeJsonLd({ "@type": "Game", name: "Sunny Hunt" })).toBe(
      '{"@type":"Game","name":"Sunny Hunt"}'
    );
  });

  it("escapes every `<` as `\\u003c`", () => {
    const output = safeJsonLd({ name: "a < b" });
    expect(output).toContain("\\u003c");
    expect(output).not.toContain("<");
  });

  it("neutralises a malicious `</script>` title", () => {
    const title = "</script><script>alert(document.cookie)</script>";
    const output = safeJsonLd({ "@type": "Game", name: title });

    // The closing tag must not survive verbatim, or the payload breaks out.
    expect(output).not.toContain("</script>");
    expect(output).not.toContain("<script>");
    expect(output).toContain("\\u003c/script>");

    // Escaping must not corrupt the data: it still round-trips.
    expect(JSON.parse(output).name).toBe(title);
  });

  it("handles arrays, like StructuredData's multiple-item payload", () => {
    const items = [
      { name: "First <b>hunt</b>" },
      { name: "</script><script>alert(1)</script>" },
    ];
    const output = safeJsonLd(items);

    expect(output).not.toContain("</script>");
    expect(JSON.parse(output)).toEqual(items);
  });

  it("serializes non-string values without throwing", () => {
    expect(safeJsonLd([1, true, null, { nested: undefined }])).toBe(
      '[1,true,null,{}]'
    );
  });
});
