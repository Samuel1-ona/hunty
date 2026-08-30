import { LockKeyhole } from 'lucide-react';
import type { ReactNode } from 'react';

import { validateHuntInvite } from '@/lib/huntStore';
import type { StoredHunt } from '@/lib/types';

interface PrivateHuntAccessGateProps {
  hunt: StoredHunt;
  inviteToken: string | null | undefined;
  children: ReactNode;
}

const ACCESS_DENIED_MESSAGES = {
  required: 'This private hunt requires a valid invite link. Ask the creator for access.',
  invalid: 'This invite link is invalid or has been revoked. Ask the creator for a new link.',
  expired: 'This invite link has expired. Ask the creator for a new link.',
} as const;

export function PrivateHuntAccessGate({ hunt, inviteToken, children }: PrivateHuntAccessGateProps) {
  const access = validateHuntInvite(hunt, inviteToken);

  if (access.isValid) return <>{children}</>;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex-1 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-5 text-rose-200"
    >
      <div className="flex items-start gap-3">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
        <div>
          <p className="font-semibold text-rose-300">Access denied</p>
          <p className="mt-1 text-sm text-rose-200/90">{ACCESS_DENIED_MESSAGES[access.reason]}</p>
        </div>
      </div>
    </div>
  );
}
