import * as React from 'react';

interface HuntCompletionEmailProps {
  huntName: string;
  completionTime: string;
  creatorName?: string;
}

export const HuntCompletionEmail: React.FC<Readonly<HuntCompletionEmailProps>> = ({
  huntName,
  completionTime,
  creatorName,
}) => (
  <div style={{
    fontFamily: 'sans-serif',
    backgroundColor: '#f9fafb',
    padding: '40px 20px',
    color: '#111827'
  }}>
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{
        backgroundColor: '#0C0C4F',
        padding: '32px',
        textAlign: 'center'
      }}>
        <h1 style={{ color: '#ffffff', margin: 0, fontSize: '24px' }}>
          Hunt Completed! 🎉
        </h1>
      </div>
      
      <div style={{ padding: '32px' }}>
        <p style={{ fontSize: '18px', lineHeight: '28px', marginBottom: '24px' }}>
          Hello {creatorName || 'Hunter'},
        </p>
        
        <p style={{ fontSize: '16px', lineHeight: '24px', color: '#4b5563', marginBottom: '32px' }}>
          Great news! A user has just successfully completed your scavenge hunt <strong>{huntName}</strong>.
        </p>
        
        <div style={{
          backgroundColor: '#f3f4f6',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ color: '#6b7280', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hunt Name</span>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{huntName}</div>
          </div>
          <div>
            <span style={{ color: '#6b7280', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completion Time</span>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{completionTime}</div>
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <a href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://hunty.app'}/dashboard`} style={{
            display: 'inline-block',
            backgroundColor: '#0C0C4F',
            color: '#ffffff',
            padding: '16px 32px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '16px'
          }}>
            View Hunt Analytics
          </a>
        </div>
      </div>
      
      <div style={{
        padding: '24px',
        textAlign: 'center',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
          &copy; {new Date().getFullYear()} Hunty. All rights reserved.
        </p>
      </div>
    </div>
  </div>
);
