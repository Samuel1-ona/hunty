import { describe, it, expect, vi, beforeEach } from "vitest"
import html2canvas from "html2canvas"
import { downloadElementAsImage } from "@/lib/downloadAsImage"

vi.mock("html2canvas", () => ({
  default: vi.fn(),
}))

describe("downloadElementAsImage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders element and triggers download", async () => {
    const click = vi.fn()
    const toDataURL = vi.fn().mockReturnValue("data:image/png;base64,mock")
    const anchor = { href: "", download: "", click } as unknown as HTMLAnchorElement
    vi.spyOn(document, "createElement").mockReturnValue(anchor)

    ;(html2canvas as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      toDataURL,
    })

    const element = document.createElement("div")
    await downloadElementAsImage(element, { filename: "hunt.png" })

    expect(html2canvas).toHaveBeenCalledWith(
      element,
      expect.objectContaining({
        useCORS: true,
        scale: 2,
        backgroundColor: "#ffffff",
      }),
    )
    expect(toDataURL).toHaveBeenCalledWith("image/png")
    expect(anchor.download).toBe("hunt.png")
    expect(click).toHaveBeenCalled()
  })
})
