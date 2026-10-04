"use client";

import { useState, type FormEvent } from "react";
import InputBorder from "@/components/ui/InputBorder";
import { ErrorMessage, SuccessMessage } from "@/components/ui/Messages";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/client-api";

export default function ResetPassword({ onCancel }: { onCancel?: () => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSuccess("");
    setError("");
    setIsLoading(true);

    try {
      await api.post("/api/user/reset-password", { email });
      setSuccess("Check your email inbox for a link to change your password.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to process the request.  Try again or contact support.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h3 className="my-2">Reset Password</h3>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      {isLoading && <Spinner />}
      {!isLoading && !success && (
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <InputBorder className="mx-auto block max-w-[260px]">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </InputBorder>
          </div>
          <div className="flex justify-center gap-4">
            {onCancel && (
              <button
                type="button"
                className="btn-red px-5 py-2 text-base"
                onClick={onCancel}
              >
                Cancel
              </button>
            )}
            <button type="submit" className="btn-green px-5 py-2 text-base">
              Confirm
            </button>
          </div>
        </form>
      )}
    </>
  );
}
