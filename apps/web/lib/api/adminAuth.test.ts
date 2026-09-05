import { assertAdminAuth } from "./adminAuth"
import { getToken } from "next-auth/jwt"
import { ApiError } from "./errors"
import { auditLog } from "@/lib/audit"

jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }))

jest.mock("@/lib/audit", () => ({ auditLog: jest.fn() }))

describe("assertAdminAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("throws 401 and logs when no token", async () => {
    (getToken as jest.Mock).mockResolved(null)
    const req = new Request("http://localhost/api/admin/anti-cheat")
    await expect(assertAdminAuth(req)).rejects.toThrow("Unauthorized")
    expect(auditLog).toHaveBeenCalledWith("unauthorized", expect.anyObject(), "anonymous")
  })

  it("throws 403 and logs when token role is not admin", async () => {
    (getToken as jest.Mock).mockResolved({ sub: "user-id", role: "user", email: "user@example.com" })
    const req = new Request("http://localhost/api/admin/anti-cheat")
    await expect(assertAdminAuth(req)).rejects.toThrow("Forbidden")
    expect(auditLog).toHaveBeenCalledWith("unauthorized", expect.anyObject(), "user-id")
  })

  it("returns admin user when token is admin", async () => {
    (getToken as jest.Mock).mockResolved({ sub: "admin-id", role: "admin", email: "admin@example.com" })
    const req = new Request("http://localhost/api/admin/anti-cheat")
    const admin = await assertAdminAuth(req)
    expect(admin).toEqual({ id: "admin-id", email: "admin@example.com", role: "admin" })
  })
});