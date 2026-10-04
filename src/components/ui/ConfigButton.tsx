"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";

export default function ConfigButton({
  testId,
  toggle,
  label = "Configure",
}: {
  testId?: string;
  toggle: () => void;
  label?: string;
}) {
  return (
    <button
      data-testid={testId}
      type="button"
      title={label}
      aria-label={label}
      onClick={toggle}
      className="mr-[7px] h-[35px] w-[35px] p-0"
    >
      <FontAwesomeIcon icon={faGear} className="text-[21px]" />
    </button>
  );
}
