import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import Breadcrumb from "@/components/Breadcrumb";

vi.mock("next/navigation", () => ({
  usePathname: () => "/hunts/malicious",
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const maliciousLabel = "</script><script>alert(document.cookie)</script>";

describe("Breadcrumb JSON-LD", () => {
  it("escapes hostile breadcrumb labels", () => {
    render(
      <Breadcrumb customLabels={{ "/hunts/malicious": maliciousLabel }} />
    );

    const script = document.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"]'
    );
    expect(script).not.toBeNull();

    const html = (script as HTMLScriptElement).innerHTML;
    expect(html).not.toContain("</script>");
    expect(html).toContain("\\u003c");

    const parsed = JSON.parse((script as HTMLScriptElement).textContent ?? "");
    const names = parsed.itemListElement.map((i: { name: string }) => i.name);
    expect(names).toContain(maliciousLabel);
  });
});
