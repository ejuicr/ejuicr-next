"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import Button from "@/components/ui/Button";

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
    <Button
      variant="red"
      data-testid={testId}
      title={label}
      aria-label={label}
      onClick={() => handler(index)}
      className="h-[35px] w-[35px] p-0"
    >
      <FontAwesomeIcon icon={faTrash} className="text-[18px]" />
    </Button>
  );
}
