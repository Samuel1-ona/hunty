import * as React from "react"

interface HuntModerationEmailProps {
  huntName: string
  action: "approved" | "rejected"
  reason?: string
}

export const HuntModerationEmail: React.FC<Readonly<HuntModerationEmailProps>> = ({
  huntName,
  action,
  reason,
}) => {
  const approved = action === "approved"
  return (
    <div
      style={{
        fontFamily: "sans-serif",
        backgroundColor: "#f9fafb",
        padding: "40px 20px",
        color: "#111827",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          style={{
            backgroundColor: approved ? "#059669" : "#b45309",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <h1 style={{ color: "#ffffff", margin: 0, fontSize: "24px" }}>
            {approved ? "Hunt approved" : "Hunt not approved"}
          </h1>
        </div>
        <div style={{ padding: "32px" }}>
          <p style={{ fontSize: "16px", lineHeight: "24px", color: "#4b5563" }}>
            {approved ? (
              <>
                Your hunt <strong>{huntName}</strong> passed moderation and is ready to go live in the
                Game Arcade.
              </>
            ) : (
              <>
                Your hunt <strong>{huntName}</strong> was not approved. Please review the feedback below
                and submit again after making changes.
              </>
            )}
          </p>
          {!approved && reason && (
            <div
              style={{
                backgroundColor: "#fef3c7",
                borderRadius: "12px",
                padding: "16px",
                marginTop: "24px",
                fontSize: "14px",
                color: "#92400e",
              }}
            >
              <strong>Moderator note:</strong> {reason}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
