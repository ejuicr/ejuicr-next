import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "red" | "green" | "ghost" | "link";

const variantClasses: Record<Variant, string> = {
  primary: "btn",
  red: "btn btn-red",
  green: "btn btn-green",
  ghost: "btn-ghost",
  link: "btn-link",
};

export default function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={clsx(variantClasses[variant], className)}
      {...props}
    />
  );
}
