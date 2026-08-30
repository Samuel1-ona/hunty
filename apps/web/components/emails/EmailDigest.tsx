import React from 'react';

import type { EmailDigestContent } from '@/lib/email/types';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hunty.app';

export interface EmailDigestProps {
  content: EmailDigestContent;
}

export function EmailDigest({ content }: EmailDigestProps) {
  const unsubscribeUrl = `${baseUrl}/api/v1/email-digest/unsubscribe?token=${content.unsubscribeToken}`;

  return (
    <div style={main}>
      <div style={container}>
        {/* Header */}
        <div style={section}>
          <h1 style={heading}>Welcome back to Hunty! 🎯</h1>
          <p style={subheading}>
            We found {content.newHunts.length} new hunt
            {content.newHunts.length !== 1 ? 's' : ''} that match your interests
          </p>
        </div>

        {/* Divider */}
        <div style={hr} />

        {/* Hunt Cards */}
        <div style={section}>
          {content.newHunts.map((hunt, index) => (
            <div key={hunt.id} style={huntCard}>
              <h2 style={huntTitle}>{hunt.title}</h2>

              <p style={huntDescription}>{hunt.description}</p>

              <div style={huntMeta}>
                <span style={badge}>📍 {hunt.category}</span>
                {hunt.difficulty && <span style={badge}>⚡ {hunt.difficulty}</span>}
                {hunt.playerCount !== undefined && (
                  <span style={badge}>👥 {hunt.playerCount} players</span>
                )}
              </div>

              <a href={`${baseUrl}/hunts/${hunt.id}`} style={button}>
                Start Hunt
              </a>

              {index < content.newHunts.length - 1 && <div style={cardDivider} />}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={hr} />

        {/* Call to Action */}
        <div style={section}>
          <p style={cta}>
            Explore more hunts in the{' '}
            <a href={`${baseUrl}/arcade`} style={link}>
              Arcade
            </a>
          </p>
        </div>

        {/* Footer */}
        <div style={hr} />
        <div style={footer}>
          <p style={footerText}>
            Hunty brings scavenger hunts to life. Challenge yourself, discover new places, and earn
            rewards.
          </p>
          <p style={footerLinks}>
            <a href={`${baseUrl}`} style={link}>
              Home
            </a>
            {' | '}
            <a href={`${baseUrl}/arcade`} style={link}>
              Arcade
            </a>
            {' | '}
            <a href={unsubscribeUrl} style={link}>
              Unsubscribe
            </a>
          </p>
          <p style={footerSmall}>
            © 2024 Hunty. All rights reserved. | Sent to {content.playerEmail}
          </p>
        </div>
      </div>
    </div>
  );
}

// Styles

const main: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
};

const container: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  overflow: 'hidden',
};

const section: React.CSSProperties = {
  padding: '32px',
};

const heading: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0 0 8px 0',
  textAlign: 'center',
};

const subheading: React.CSSProperties = {
  fontSize: '16px',
  color: '#6b7280',
  margin: '0',
  textAlign: 'center',
  lineHeight: '1.5',
};

const hr: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '0',
};

const huntCard: React.CSSProperties = {
  paddingBottom: '24px',
};

const huntTitle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 8px 0',
};

const huntDescription: React.CSSProperties = {
  fontSize: '14px',
  color: '#4b5563',
  margin: '0 0 16px 0',
  lineHeight: '1.5',
};

const huntMeta: React.CSSProperties = {
  margin: '12px 0 16px 0',
};

const huntMetaItem: React.CSSProperties = {
  marginRight: '8px',
};

const badge: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#f0f4f8',
  color: '#374151',
  padding: '4px 12px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: '500',
  marginRight: '8px',
};

const button: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#0d9488',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: '500',
  fontSize: '14px',
  marginTop: '4px',
};

const cardDivider: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const cta: React.CSSProperties = {
  fontSize: '14px',
  color: '#4b5563',
  textAlign: 'center',
  margin: '0',
};

const link: React.CSSProperties = {
  color: '#0d9488',
  textDecoration: 'underline',
};

const footer: React.CSSProperties = {
  padding: '24px 32px',
  backgroundColor: '#f9fafb',
};

const footerText: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '0 0 12px 0',
  textAlign: 'center',
  lineHeight: '1.5',
};

const footerLinks: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '0 0 12px 0',
  textAlign: 'center',
};

const footerSmall: React.CSSProperties = {
  fontSize: '11px',
  color: '#9ca3af',
  margin: '0',
  textAlign: 'center',
};
