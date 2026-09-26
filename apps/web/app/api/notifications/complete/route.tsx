import { NextResponse } from 'next/server';
import { withValidation } from '@/lib/api/withValidation';
import { Resend } from 'resend';

import { HuntCompletionEmail } from '@/components/emails/HuntCompletionEmail';
import { notificationsCompleteBodySchema } from '@hunty/types/api-schemas';

export const POST = withValidation(
  { body: notificationsCompleteBodySchema },
  async (_request, _context, { body }) => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { huntName, creatorEmail, completionTime } = body;

    const data = await resend.emails.send({
      from: 'Hunty <onboarding@resend.dev>', // Replace with your verified domain in production
      to: [creatorEmail],
      subject: 'Your hunt was just completed 🎉',
      react: <HuntCompletionEmail
        huntName={huntName}
        completionTime={completionTime}
      />,
    });

    return NextResponse.json(data);
  }
);
