import { NextResponse } from 'next/server';

import { getAnswerDisputeAuditLog, getAnswerDisputeById } from '@/lib/answerDisputes';
import { ValidationError } from '@/lib/api/errors';
import { withErrorHandling } from '@/lib/api/withErrorHandling';

export const GET = withErrorHandling(async (req: Request) => {
  const disputeId = new URL(req.url).pathname.split('/').filter(Boolean).at(-2);

  if (!disputeId) {
    throw new ValidationError('Dispute ID is required');
  }

  const dispute = getAnswerDisputeById(disputeId);
  if (!dispute) {
    return NextResponse.json({ auditLog: [] }, { status: 404 });
  }

  return NextResponse.json({ disputeId, auditLog: getAnswerDisputeAuditLog(disputeId) });
});
