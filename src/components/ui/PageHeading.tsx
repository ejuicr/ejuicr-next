import type { ReactNode } from "react";

/** Page title with the dotted rule used across the app. */
export default function PageHeading({ children }: { children: ReactNode }) {
  return (
    <>
      <h3>{children}</h3>
      <hr />
    </>
  );
}
