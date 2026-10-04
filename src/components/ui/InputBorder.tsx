import clsx from "clsx";
import type { ReactNode } from "react";

/** Gradient-bordered input wrapper, matching the old `.input-border` style. */
export default function InputBorder({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={clsx("input-border", className)}>{children}</div>;
}
