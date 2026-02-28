'use client';

import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function PrimaryButton({className = '', disabled, children, ...props}: Props) {
  return (
    <button
      disabled={disabled}
      {...props}
      className={[
        'shadow-none inline-flex items-center rounded-md border border-transparent bg-rose-800 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition duration-150 ease-in-out hover:bg-rose-700 focus:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 active:bg-rose-700 leading-none',
        disabled ? 'opacity-25' : '',
        className ?? '',
      ].join(' ')}
    >
      {children}
    </button>

  );
}