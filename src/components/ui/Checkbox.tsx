'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

const Checkbox = forwardRef<HTMLInputElement, Props>(function Checkbox(
  { className = '', ...props },
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      type="checkbox"
      className={[
        'op-checkbox',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      ].join(' ')}
    />
  );
});

export default Checkbox;