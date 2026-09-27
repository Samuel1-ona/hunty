import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PrivateHuntAccessGate } from "@/components/PrivateHuntAccessGate";
import type { StoredHunt } from "@/lib/types";

const invite = {
  token: "3b2da18f-8f95-4f7a-9a53-358d74617602",
  createdAt: Date.now() - 1_000,
  expiresAt: Date.now() + 60_000,
};

const privateHunt: StoredHunt = {
  id: 300,
  title: "Secret hunt",
  description: "Private",
  cluesCount: 1,
  status: "Active",
  rewardType: "XLM",
  is_private: true,
  invite,
};

describe("PrivateHuntAccessGate", () => {
  it("renders registration content for a valid private-hunt invite", () => {
    render(
      <PrivateHuntAccessGate hunt={privateHunt} inviteToken={invite.token}>
        <button>Join Hunt</button>
      </PrivateHuntAccessGate>
    );

    expect(screen.getByRole("button", { name: "Join Hunt" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("gates registration and explains that an invite is required", () => {
    render(
      <PrivateHuntAccessGate hunt={privateHunt} inviteToken={null}>
        <button>Join Hunt</button>
      </PrivateHuntAccessGate>
    );

    expect(screen.queryByRole("button", { name: "Join Hunt" })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Access denied");
    expect(screen.getByRole("alert")).toHaveTextContent(/requires a valid invite link/i);
  });

  it("shows an invalid-or-revoked message for a bad token", () => {
    render(
      <PrivateHuntAccessGate hunt={privateHunt} inviteToken="wrong-token">
        <button>Join Hunt</button>
      </PrivateHuntAccessGate>
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/invalid or has been revoked/i);
  });

  it("shows an expiration-specific access-denied message", () => {
    render(
      <PrivateHuntAccessGate
        hunt={{ ...privateHunt, invite: { ...invite, expiresAt: Date.now() - 1 } }}
        inviteToken={invite.token}
      >
        <button>Join Hunt</button>
      </PrivateHuntAccessGate>
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/expired/i);
  });

  it("does not gate public hunts", () => {
    render(
      <PrivateHuntAccessGate
        hunt={{ ...privateHunt, is_private: false, invite: undefined }}
        inviteToken={null}
      >
        <button>Join Hunt</button>
      </PrivateHuntAccessGate>
    );

    expect(screen.getByRole("button", { name: "Join Hunt" })).toBeInTheDocument();
  });
});
