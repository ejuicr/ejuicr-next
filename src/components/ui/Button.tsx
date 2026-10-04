import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "red" | "green";

export default function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={clsx(variant !== "primary" && `btn-${variant}`, className)}
      {...props}
    />
  );
}
