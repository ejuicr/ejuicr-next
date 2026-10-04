import type { ReactNode } from "react";

export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="error-message">
      {children}
    </div>
  );
}

export function SuccessMessage({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="success-message">
      {children}
    </div>
  );
}
