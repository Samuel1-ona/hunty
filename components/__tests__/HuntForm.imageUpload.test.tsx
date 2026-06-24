import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { HuntForm } from "../HuntForm"
import type { HuntDraft } from "@/lib/types"

const { loggerError, toastError, uploadToIPFSMock } = vi.hoisted(() => ({
  loggerError: vi.fn(),
  toastError: vi.fn(),
  uploadToIPFSMock: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: { error: toastError, success: vi.fn() },
}))

vi.mock("@/lib/ipfs", () => ({
  COVER_IMAGE_UPLOAD_ERROR_MESSAGE: "Failed to upload cover image. Please try again.",
  uploadToIPFS: uploadToIPFSMock,
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: loggerError, warn: vi.fn(), info: vi.fn() },
}))

vi.mock("@/lib/contracts/hunt", () => ({
  addClue: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("@/lib/huntStore", () => ({
  saveClueLocally: vi.fn().mockReturnValue(1),
  updateClueAnswer: vi.fn(),
}))

vi.mock("@/lib/crypto", () => ({
  sha256Hex: vi.fn().mockResolvedValue("mockhash"),
}))

vi.mock("@/lib/txToast", () => ({
  withTransactionToast: vi.fn().mockImplementation(async (fn: (...args: unknown[]) => unknown) => fn(() => {})),
}))

vi.mock("@/components/HuntCards", () => ({
  HuntCards: () => <div data-testid="hunt-cards-preview" />,
}))

const baseHunt: HuntDraft = {
  id: 1,
  title: "Test Hunt",
  description: "A test description",
  link: "",
  code: "",
}

describe("HuntForm cover image uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows the expected toast and blocks the upload state until the user skips after a failed upload", async () => {
    uploadToIPFSMock.mockRejectedValueOnce(new Error("PINATA_JWT missing"))

    const user = userEvent.setup()
    const onUpdate = vi.fn()
    const onImageUploadStateChange = vi.fn()

    const { container } = render(
      <HuntForm
        hunt={baseHunt}
        onUpdate={onUpdate}
        onRemove={vi.fn()}
        onImageUploadStateChange={onImageUploadStateChange}
      />
    )

    const fileInput = container.querySelector('input[type="file"]')
    expect(fileInput).not.toBeNull()

    await user.upload(fileInput as HTMLInputElement, new File(["cover"], "cover.png", { type: "image/png" }))

    await waitFor(() => {
      expect(uploadToIPFSMock).toHaveBeenCalledTimes(1)
      expect(toastError).toHaveBeenCalledWith("Failed to upload cover image. Please try again.")
    })

    expect(loggerError).toHaveBeenCalled()
    expect(onUpdate).not.toHaveBeenCalledWith("image", expect.any(String))
    expect(onImageUploadStateChange).toHaveBeenNthCalledWith(1, "uploading")
    expect(onImageUploadStateChange).toHaveBeenNthCalledWith(2, "failed")

    await user.click(screen.getByRole("button", { name: /skip cover image/i }))

    expect(onUpdate).toHaveBeenCalledWith("image", "")
    expect(onImageUploadStateChange).toHaveBeenLastCalledWith("idle")
  })
})
