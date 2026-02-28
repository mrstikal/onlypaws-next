'use client';

import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function SecondaryButton({
                                          type = 'button',
                                          className = '',
                                          disabled,
                                          children,
                                          ...props
                                        }: Props) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      className={[
        'inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-700 shadow-none transition duration-150 ease-in-out leading-none',
        'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-25',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}