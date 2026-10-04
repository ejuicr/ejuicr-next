"use client";

import { useState, type FormEvent } from "react";
import InputBorder from "@/components/ui/InputBorder";
import { ErrorMessage, SuccessMessage } from "@/components/ui/Messages";
import PageHeading from "@/components/ui/PageHeading";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/client-api";
import { validatePassword } from "@/lib/helpers";

export default function UpdatePasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSuccess("");
    setError("");

    const passwordError = validatePassword(password);
    if (passwordError !== true) {
      setError(passwordError);
      return;
    }
    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post(`/api/user/reset-password/${token}`, { password });
      setSuccess(
        "Your password has been changed. You can now log in with the new password.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to set new password.  Try again or contact support.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <PageHeading>Change Password</PageHeading>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      {isLoading && <Spinner />}
      {!isLoading && !success && (
        <form onSubmit={handleSubmit}>
          <div className="mx-auto my-8 w-fit">
            <InputBorder>
              <input
                type="password"
                autoComplete="new-password"
                aria-label="New password"
                placeholder="New Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </InputBorder>
          </div>
          <div className="mx-auto my-8 w-fit">
            <InputBorder>
              <input
                type="password"
                aria-label="Confirm new password"
                placeholder="Confirm Password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
              />
            </InputBorder>
          </div>
          <div className="mx-auto w-fit">
            <button type="submit" className="text-base">
              Submit
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
