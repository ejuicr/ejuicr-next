"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import InputBorder from "@/components/ui/InputBorder";
import { ErrorMessage } from "@/components/ui/Messages";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/client-api";
import { validateEmail } from "@/lib/helpers";

interface LoginProps {
  onCancel?: () => void;
  onSignup?: () => void;
  onResetPassword?: () => void;
  onSuccess?: () => void;
  hideHeading?: boolean;
}

export default function Login({
  onCancel,
  onSignup,
  onResetPassword,
  onSuccess,
  hideHeading = false,
}: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { refresh } = useAuth();
  const router = useRouter();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill out all fields.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Email is invalid.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/api/user/login", { email, password });
      await refresh();
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/");
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to log in.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const linkClass =
    "bg-transparent p-0 font-normal text-brand-cyan hover:bg-transparent hover:text-brand-pink active:bg-transparent active:text-brand-pink";

  return (
    <>
      {!hideHeading && <h3 className="my-2">Login</h3>}
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
                Sign In
              </button>
            </div>
          </form>
          {onSignup && (
            <p className="text-[0.9rem]">
              Need an account?
              <br />
              <button type="button" className={linkClass} onClick={onSignup}>
                Sign up instead
              </button>
              .
            </p>
          )}
          {onResetPassword && (
            <p className="text-[0.9rem]">
              Forgot your password?
              <br />
              <button
                type="button"
                className={linkClass}
                onClick={onResetPassword}
              >
                Reset it here
              </button>
              .
            </p>
          )}
        </>
      )}
    </>
  );
}
