import { useId, useRef, useState, type ReactNode } from 'react';

interface Props {
  accept: string;
  label: string;
  onFile: (file: File) => void;
  children?: ReactNode;
  className?: string;
}

/** Drag & drop, click to choose, or paste an image while it has focus. */
export function Dropzone({ accept, label, onFile, children, className = '' }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (files: FileList | null | undefined) => {
    const file = files?.[0];
    if (file) onFile(file);
  };
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      onPaste={(e) => {
        const file = [...e.clipboardData.files].find((f) => f.type.startsWith('image/'));
        if (file) {
          e.preventDefault();
          onFile(file);
        }
      }}
      className={`rounded-[14px] border-2 border-dashed p-4 text-center ${over ? 'border-accent bg-surface-2' : 'border-border'} ${className}`}
    >
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        tabIndex={-1}
        className="visually-hidden"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = '';
        }}
      />
      <label
        htmlFor={id}
        className="btn btn-secondary cursor-pointer"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            input.current?.click();
          }
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
