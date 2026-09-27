"use client";

import { useSession as useSessionContext } from "@/lib/context/SessionContext";

export { type Session, type UserPreferences } from "@/lib/session";

export const useSession = useSessionContext;
