"use client";

import type { ReactNode } from "react";

/**
 * Modal dialog with a red accent border. Clicking the backdrop cancels,
 * matching the old `ConfirmDelete` component.
 */
export default function ConfirmDialog({
  children,
  onCancel,
}: {
  children: ReactNode;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[99] min-h-full bg-black/75"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[3px] bg-brand-red p-[0.125em]">
        <div className="w-[75vw] max-w-[550px] rounded-[3px] bg-ink px-4 py-6 text-center">
          {children}
        </div>
      </div>
    </div>
  );
}
