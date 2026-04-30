import * as React from 'react';

type ResetPasswordEmailProps = {
  firstName?: string;
  resetUrl: string;
  productName?: string;
};

export function ResetPasswordEmail({
  firstName,
  resetUrl,
  productName = 'HyreLog'
}: ResetPasswordEmailProps) {
  return (
    <div
      style={{
        fontFamily: 'Inter, Arial, sans-serif',
        backgroundColor: '#f8fafc',
        padding: '24px',
        color: '#111827'
      }}
    >
      <div
        style={{
          maxWidth: '560px',
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '24px'
        }}
      >
        <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: 700 }}>
          Reset your password
        </h2>
        <p style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: '22px', color: '#374151' }}>
          Hi {firstName || 'there'},
        </p>
        <p style={{ margin: '0 0 18px', fontSize: '14px', lineHeight: '22px', color: '#374151' }}>
          We received a request to reset your {productName} password.
        </p>
        <a
          href={resetUrl}
          style={{
            display: 'inline-block',
            background: '#111827',
            color: '#ffffff',
            textDecoration: 'none',
            padding: '10px 16px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '14px'
          }}
        >
          Reset password
        </a>
        <p style={{ margin: '16px 0 0', fontSize: '12px', lineHeight: '20px', color: '#6b7280' }}>
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    </div>
  );
}
