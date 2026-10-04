"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useFocusTrap } from "./useFocusTrap";

/**
 * Modal confirmation dialog with a red accent border. The dialog traps focus,
 * closes on Escape or a backdrop click, and restores focus when it closes.
 */
export default function ConfirmDialog({
  label,
  children,
  onCancel,
}: {
  label: string;
  children: ReactNode;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[99] min-h-full bg-black/75"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[3px] bg-brand-red p-[0.125em] outline-none"
      >
        <div className="w-[75vw] max-w-[550px] rounded-[3px] bg-ink px-4 py-6 text-center">
          {children}
        </div>
      </div>
    </div>
  );
}
