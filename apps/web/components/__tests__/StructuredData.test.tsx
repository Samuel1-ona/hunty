import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { huntStructuredData, StructuredData } from "@/components/StructuredData";
import type { StoredHunt } from "@/lib/types";

const maliciousTitle = "</script><script>alert(document.cookie)</script>";

function renderedJsonLd() {
  const script = document.querySelector<HTMLScriptElement>(
    'script[type="application/ld+json"]'
  );
  expect(script).not.toBeNull();
  return script as HTMLScriptElement;
}

describe("StructuredData", () => {
  it("renders the payload without breaking out of the script tag", () => {
    render(<StructuredData data={[{ "@type": "Game", name: maliciousTitle }]} />);

    const script = renderedJsonLd();
    expect(script.innerHTML).not.toContain("</script>");
    expect(script.innerHTML).toContain("\\u003c");
  });

  it("keeps the JSON-LD data intact", () => {
    render(<StructuredData data={[{ "@type": "Game", name: maliciousTitle }]} />);

    const parsed = JSON.parse(renderedJsonLd().textContent ?? "");
    expect(parsed[0].name).toBe(maliciousTitle);
  });

  it("escapes hostile hunt titles produced by huntStructuredData", () => {
    const hunt = {
      id: "1",
      title: maliciousTitle,
      description: "</script><script>alert('xss')</script>",
      status: "Active",
    } as unknown as StoredHunt;

    render(
      <StructuredData data={huntStructuredData(hunt, "https://hunty.app")} />
    );

    expect(renderedJsonLd().innerHTML).not.toContain("</script>");
  });
});
