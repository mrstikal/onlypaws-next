'use client';

import {
  forwardRef,
  type InputHTMLAttributes,
  useEffect,
  useRef,
} from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  isFocused?: boolean;
};

const TextInput = forwardRef<HTMLInputElement, Props>(function TextInput(
  { type = 'text', className = '', isFocused = false, ...props },
  ref,
) {
  const localRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFocused) localRef.current?.focus();
  }, [isFocused]);

  return (
    <input
      {...props}
      type={type}
      ref={(node) => {
        localRef.current = node;

        if (!ref) return;
        if (typeof ref === 'function') ref(node);
        else ref.current = node;
      }}
      className={[
        'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm',
        'placeholder:text-gray-400',
        'focus:border-indigo-500 focus:ring-rose-500',
        className,
      ].join(' ')}
    />
  );
});

export default TextInput;