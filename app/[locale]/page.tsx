// Re-export the existing GameArcade page for locale routing
// The underlying page component uses client-side hooks so it does not need
// direct access to the locale param — it can use useLocale() from next-intl
// when it needs the locale.
export { default } from "@/app/page"
