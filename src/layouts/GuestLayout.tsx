import React from 'react';

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900">
      <main className="op-container py-10">{children}</main>
    </div>
  );
}