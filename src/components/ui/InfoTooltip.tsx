"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleQuestion } from "@fortawesome/free-solid-svg-icons";

/** Small click-to-open help tooltip used on the settings page. */
export default function InfoTooltip({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <span ref={containerRef} className="relative inline-block align-middle">
      <button
        type="button"
        aria-label={content}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="bg-transparent p-0 text-slateblue hover:bg-transparent active:bg-transparent"
      >
        <FontAwesomeIcon icon={faCircleQuestion} />
      </button>
      {open && (
        <span
          role="tooltip"
          className="tooltip absolute left-1/2 top-[130%] z-20 -translate-x-1/2"
        >
          {content}
        </span>
      )}
    </span>
  );
}
