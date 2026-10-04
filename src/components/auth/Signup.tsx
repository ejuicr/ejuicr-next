"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import InputBorder from "@/components/ui/InputBorder";
import { ErrorMessage } from "@/components/ui/Messages";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/client-api";
import { validateEmail, validatePassword } from "@/lib/helpers";

interface SignupProps {
  onCancel?: () => void;
  onLogin?: () => void;
  onSuccess?: () => void;
}

export default function Signup({ onCancel, onLogin, onSuccess }: SignupProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { refresh } = useAuth();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!validateEmail(email)) {
      setError("Email is invalid.");
      return;
    }
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
      await api.post("/api/user", { email, password });
      await refresh();
      onSuccess?.();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to register new account.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const linkClass =
    "bg-transparent p-0 font-normal text-brand-cyan hover:bg-transparent hover:text-brand-pink active:bg-transparent active:text-brand-pink";

  return (
    <>
      <h3 className="my-2">Signup</h3>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {isLoading ? (
        <Spinner />
      ) : (
        <>
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
            <div className="mb-6">
              <InputBorder className="mx-auto block max-w-[260px]">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </InputBorder>
            </div>
            <div className="mb-6">
              <InputBorder className="mx-auto block max-w-[260px]">
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
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
                Sign Up
              </button>
            </div>
          </form>
          {onLogin && (
            <p className="text-[0.9rem]">
              Already have an account?
              <br />
              <button type="button" className={linkClass} onClick={onLogin}>
                Sign in instead
              </button>
              .
            </p>
          )}
        </>
      )}
    </>
  );
}
