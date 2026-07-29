import { render, screen } from "@testing-library/react";
import { describe, expect,it } from "vitest";

import { Footer } from "@/components/Footer";

describe("Footer", () => {
  // ─── Render Tests ───────────────────────────────────────────────
  describe("render", () => {
    it("renders the footer element", () => {
      render(<Footer />);
      expect(document.querySelector("footer")).toBeInTheDocument();
    });

    it("renders the Hunty brand name", () => {
      render(<Footer />);
      expect(screen.getByText("Hunty")).toBeInTheDocument();
    });

    it("renders copyright text with current year", () => {
      render(<Footer />);
      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument();
      expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
    });

    it("renders Help & Troubleshooting link", () => {
      render(<Footer />);
      expect(screen.getByRole("link", { name: /help & troubleshooting/i })).toBeInTheDocument();
    });

    it("renders HelpCircle icon inside the link", () => {
      render(<Footer />);
      const link = screen.getByRole("link", { name: /help & troubleshooting/i });
      expect(link.querySelector("svg")).toBeInTheDocument();
    });
  });

  // ─── Interaction Tests ──────────────────────────────────────────
  describe("interaction", () => {
    it("has correct href on Help link", () => {
      render(<Footer />);
      expect(screen.getByRole("link", { name: /help & troubleshooting/i })).toHaveAttribute("href", "/help");
    });

    it("Help link has hover transition classes", () => {
      render(<Footer />);
      const link = screen.getByRole("link", { name: /help & troubleshooting/i });
      expect(link.className).toContain("hover:text-");
      expect(link.className).toContain("transition-colors");
    });
  });

  // ─── Accessibility Tests ────────────────────────────────────────
  describe("accessibility", () => {
    it("footer uses semantic footer element", () => {
      render(<Footer />);
      const footer = document.querySelector("footer");
      expect(footer?.tagName.toLowerCase()).toBe("footer");
    });

    it("Help link has visible text (not icon-only)", () => {
      render(<Footer />);
      const link = screen.getByRole("link", { name: /help & troubleshooting/i });
      expect(link.textContent).toMatch(/help/i);
    });

    it("uses responsive layout classes", () => {
      render(<Footer />);
      // The responsive layout is on the inner content row, not the outer
      // padding wrapper (`mx-auto max-w-[1600px] ...`). The inner row
      // switches to `sm:flex-row` from `flex-col` at the sm breakpoint.
      const innerRow = document.querySelector("footer .flex.flex-col");
      expect(innerRow?.className).toContain("sm:flex-row");
      expect(innerRow?.className).toContain("flex-col");
    });

    it("has dark mode support classes", () => {
      render(<Footer />);
      const footer = document.querySelector("footer");
      expect(footer?.className).toContain("dark:");
    });

    it("copyright text is readable", () => {
      render(<Footer />);
      const copyright = screen.getByText(/all rights reserved/i);
      expect(copyright.tagName.toLowerCase()).toBe("p");
    });
  });
});