import { Resend } from 'resend';
import { HuntCompletionEmail } from '@/components/emails/HuntCompletionEmail';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { huntName, creatorEmail, completionTime } = await request.json();

    if (!creatorEmail) {
      return NextResponse.json({ error: 'Missing creator email' }, { status: 400 });
    }

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
  } catch (error) {
    logger.error('Email notification error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
