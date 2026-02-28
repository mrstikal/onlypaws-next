'use client';

export default function InputError(
  { message, className, ...props }: { message?: string; className?: string },
) {
  if (!message) return null;

  return (

    <div {...props} className={['text-sm text-red-600', className ?? ''].join(' ')}>
      {message}
    </div>
  );
}