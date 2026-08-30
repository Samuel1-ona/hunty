/\*\*

- Email digest feature - Quick reference for developers
  \*/

// ────────────────────────────────────────────────────────────────────────────
// SUBSCRIBE A PLAYER
// ────────────────────────────────────────────────────────────────────────────

import { upsertEmailPreference } from "@/lib/email"

// Subscribe player to email digest
const preference = await upsertEmailPreference(
"GPLAYER123XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
"player@example.com",
true, // digestSubscribed
)

console.log(preference.digestSubscribed) // true

// ────────────────────────────────────────────────────────────────────────────
// GET PLAYER PREFERENCES
// ────────────────────────────────────────────────────────────────────────────

import { getEmailPreference } from "@/lib/email"

const prefs = await getEmailPreference("GPLAYER123...")
if (prefs) {
console.log(`${prefs.email} subscribed: ${prefs.digestSubscribed}`)
}

// ────────────────────────────────────────────────────────────────────────────
// GENERATE DIGEST CONTENT
// ────────────────────────────────────────────────────────────────────────────

import { generateDigestContent, createUnsubscribeToken } from "@/lib/email"

const token = await createUnsubscribeToken("player-id-uuid")

const digestContent = await generateDigestContent(
"player@example.com",
"GPLAYER123...",
token.token,
)

if (digestContent) {
console.log(`Found ${digestContent.newHunts.length} new hunts`)
digestContent.newHunts.forEach((hunt) => {
console.log(`- ${hunt.title} (${hunt.category})`)
})
}

// ────────────────────────────────────────────────────────────────────────────
// SEND DIGEST TO SINGLE PLAYER
// ────────────────────────────────────────────────────────────────────────────

import { sendDigestToPlayer, getAllSubscribedPlayers } from "@/lib/email"

const players = await getAllSubscribedPlayers()
const player = players[0]

if (player) {
const success = await sendDigestToPlayer(player)
console.log(success ? "Email sent!" : "Failed to send")
}

// ────────────────────────────────────────────────────────────────────────────
// SEND DIGESTS TO ALL SUBSCRIBED PLAYERS
// ────────────────────────────────────────────────────────────────────────────

import { sendDigestBatch } from "@/lib/email"

// Send to all players who haven't received one in 24 hours
const result = await sendDigestBatch({
minHoursSinceLast: 24,
dryRun: false, // Set to true to simulate without sending
})

console.log(`Sent to ${result.sent} players`)
console.log(`Skipped ${result.skipped} players`)
console.log(`Failed for ${result.failed} players`)

// ────────────────────────────────────────────────────────────────────────────
// HANDLE UNSUBSCRIBE
// ────────────────────────────────────────────────────────────────────────────

import { validateAndUseUnsubscribeToken } from "@/lib/email"

// Process unsubscribe from email link
const unsubscribeResult = await validateAndUseUnsubscribeToken(
"token-from-email-link",
)

if (unsubscribeResult) {
console.log(`Unsubscribed: ${unsubscribeResult.email}`)
} else {
console.log("Invalid or expired token")
}

// ────────────────────────────────────────────────────────────────────────────
// CLEANUP EXPIRED TOKENS
// ────────────────────────────────────────────────────────────────────────────

import { deleteExpiredUnsubscribeTokens } from "@/lib/email"

const deletedCount = await deleteExpiredUnsubscribeTokens()
console.log(`Deleted ${deletedCount} expired tokens`)

// ────────────────────────────────────────────────────────────────────────────
// API ENDPOINT TESTING
// ────────────────────────────────────────────────────────────────────────────

// Subscribe via API
const subscribeRes = await fetch("/api/v1/email-preferences", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
walletAddress: "GPLAYER123...",
email: "player@example.com",
digestSubscribed: true,
}),
})

// Get preferences via API
const getRes = await fetch("/api/v1/email-preferences?wallet=GPLAYER123...")

// Send digests via admin API
const adminToken = process.env.ADMIN_API_TOKEN
const sendRes = await fetch("/api/v1/email-digest/send?dryRun=true", {
method: "POST",
headers: { "X-Admin-Token": adminToken },
})

// Unsubscribe via email link
const unsubRes = await fetch("/api/v1/email-digest/unsubscribe?token=abc123")
