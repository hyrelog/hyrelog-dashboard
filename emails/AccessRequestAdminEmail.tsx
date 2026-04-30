import * as React from 'react';

type AccessRequestAdminEmailProps = {
  requesterName: string;
  requesterEmail: string;
  reviewUrl: string;
  productName?: string;
};

export function AccessRequestAdminEmail({
  requesterName,
  requesterEmail,
  reviewUrl,
  productName = 'HyreLog'
}: AccessRequestAdminEmailProps) {
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
          New access request
        </h2>
        <p style={{ margin: '0 0 8px', fontSize: '14px', lineHeight: '22px', color: '#374151' }}>
          A new user has signed up and is waiting for approval in {productName}.
        </p>
        <p style={{ margin: '0 0 18px', fontSize: '14px', lineHeight: '22px', color: '#374151' }}>
          <strong>Name:</strong> {requesterName}
          <br />
          <strong>Email:</strong> {requesterEmail}
        </p>
        <a
          href={reviewUrl}
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
          Review pending users
        </a>
      </div>
    </div>
  );
}
