import { describe, expect, it } from "vitest";

import { getDisplayHuntStatus, isHuntEnded, normalizeHuntStatus } from "@/lib/huntStatus";

describe("normalizeHuntStatus", () => {
  it("capitalizes lowercase scheduling states", () => {
    expect(normalizeHuntStatus("active")).toBe("Active");
    expect(normalizeHuntStatus("ended")).toBe("Ended");
    expect(normalizeHuntStatus("scheduled")).toBe("Scheduled");
  });

  it("passes through already-canonical values", () => {
    expect(normalizeHuntStatus("Completed")).toBe("Completed");
    expect(normalizeHuntStatus("Cancelled")).toBe("Cancelled");
  });

  it("defaults to Draft when status is missing", () => {
    expect(normalizeHuntStatus(undefined)).toBe("Draft");
  });
});

describe("getDisplayHuntStatus", () => {
  it("delegates to normalizeHuntStatus", () => {
    expect(getDisplayHuntStatus("active")).toBe("Active");
  });
});

describe("isHuntEnded", () => {
  it("is true for hunts marked Completed", () => {
    expect(isHuntEnded("Completed")).toBe(true);
  });

  it("is true for hunts the scheduler transitioned to Ended", () => {
    expect(isHuntEnded("ended")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isHuntEnded("COMPLETED")).toBe(true);
    expect(isHuntEnded("Ended")).toBe(true);
  });

  it("is false for hunts still in progress or not started", () => {
    expect(isHuntEnded("Active")).toBe(false);
    expect(isHuntEnded("active")).toBe(false);
    expect(isHuntEnded("Draft")).toBe(false);
    expect(isHuntEnded("Scheduled")).toBe(false);
    expect(isHuntEnded("Cancelled")).toBe(false);
  });

  it("is false when status is missing", () => {
    expect(isHuntEnded(undefined)).toBe(false);
  });
});
