"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

export default function DeleteButton({
  testId,
  index,
  handler,
  label = "Delete",
}: {
  testId?: string;
  index: number;
  handler: (index: number) => void;
  label?: string;
}) {
  return (
    <button
      data-testid={testId}
      type="button"
      title={label}
      aria-label={label}
      onClick={() => handler(index)}
      className="h-[35px] w-[35px] bg-brand-red bg-none p-0 hover:bg-brand-red active:bg-brand-red"
    >
      <FontAwesomeIcon icon={faTrash} className="text-[18px]" />
    </button>
  );
}
