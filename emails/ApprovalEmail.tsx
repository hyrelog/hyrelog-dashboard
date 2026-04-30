import * as React from 'react';

type ApprovalEmailProps = {
  firstName?: string;
  productName?: string;
  loginUrl: string;
};

export function ApprovalEmail({
  firstName,
  productName = 'HyreLog',
  loginUrl
}: ApprovalEmailProps) {
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
          Your account has been approved
        </h2>
        <p style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: '22px', color: '#374151' }}>
          Hi {firstName || 'there'},
        </p>
        <p style={{ margin: '0 0 18px', fontSize: '14px', lineHeight: '22px', color: '#374151' }}>
          Great news - your {productName} account is now active and ready to use.
        </p>
        <a
          href={loginUrl}
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
          Sign in to {productName}
        </a>
      </div>
    </div>
  );
}

