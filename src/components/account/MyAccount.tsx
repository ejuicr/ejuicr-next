"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { faGoogle, faTwitter } from "@fortawesome/free-brands-svg-icons";
import { useAuth } from "@/components/providers/AuthProvider";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import InputBorder from "@/components/ui/InputBorder";
import { ErrorMessage, SuccessMessage } from "@/components/ui/Messages";
import PageHeading from "@/components/ui/PageHeading";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/client-api";
import { capitalizeFirstLetter, validatePassword } from "@/lib/helpers";
import type { PublicUser } from "@/types";

type LinkedProvider = "google" | "twitter";

export default function MyAccount() {
  const { user, setUser, logout } = useAuth();
  const router = useRouter();
  const [recipes, setRecipes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [isLoadingChangePassword, setIsLoadingChangePassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDeleteDialogue, setShowDeleteDialogue] = useState(false);
  const [accountToUnlink, setAccountToUnlink] = useState<LinkedProvider | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.get<PublicUser>("/api/user/me"),
      api.get<{ count: number }>("/api/recipes?count=1"),
    ])
      .then(([me, countData]) => {
        if (cancelled) return;
        setUser(me);
        setRecipes(countData.count ?? 0);
      })
      .catch((caughtError) => {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Failed to load account data.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setUser]);

  if (!user) return null;

  const numberOfLinkedAccounts =
    (user.hasGoogleLinked ? 1 : 0) + (user.hasTwitterLinked ? 1 : 0);

  const authProvider = user.authProvider || null;
  const profilePic = user.googlePicture || user.twitterPicture || null;
  const profilePicAltText = user.googlePicture
    ? "Your Google profile picture"
    : user.twitterPicture
      ? "Your Twitter profile picture"
      : "Your profile picture";

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // Local state is already cleared; still leave the account UI.
      console.error(error);
    }
    router.push("/");
    router.refresh();
  };

  const onSubmitSetPassword = async (event: FormEvent) => {
    event.preventDefault();
    setSuccess("");
    setError("");

    const passwordError = validatePassword(newPassword);
    if (passwordError !== true) {
      setError(passwordError);
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoadingChangePassword(true);
    try {
      await api.post("/api/user/set-password", { password: newPassword });
      setUser({ ...user, hasPassword: true });
      setSuccess("Your password has been set.");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to set the password.  Try again or contact support.",
      );
    } finally {
      setIsLoadingChangePassword(false);
    }
  };

  const onSubmitChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setSuccess("");
    setError("");

    const passwordError = validatePassword(newPassword);
    if (passwordError !== true) {
      setError(passwordError);
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoadingChangePassword(true);
    try {
      await api.post("/api/user/change-password", { password, newPassword });
      setSuccess("Your password has been changed.");
      setPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to change the password.  Try again or contact support.",
      );
    } finally {
      setIsLoadingChangePassword(false);
    }
  };

  const handleConfirmRemoveLinkedAccount = async (
    provider: LinkedProvider,
  ) => {
    setError("");
    setSuccess("");
    try {
      await api.delete(`/api/user/${provider}`);
      const me = await api.get<PublicUser>("/api/user/me");
      setUser(me);
      setSuccess(`${capitalizeFirstLetter(provider)} account unlinked.`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to remove linked account.",
      );
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete("/api/user");
      setUser(null);
      router.push("/");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to delete account.",
      );
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeading>My Account</PageHeading>
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <div>
        <PageHeading>My Account</PageHeading>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}
        <div className="mt-8 text-center">
          {profilePic && (
            <div className="mx-auto my-6 w-fit rounded-full bg-gradient-to-br from-brand-purple to-brand-cyan p-[3px] leading-none">
              {/* eslint-disable-next-line @next/next/no-img-element -- profile pictures can be remote URLs or data URLs */}
              <img
                src={profilePic}
                alt={profilePicAltText}
                referrerPolicy="no-referrer"
                className="h-auto max-w-24 rounded-full"
              />
            </div>
          )}
          {(authProvider === "twitter" && (
            <p className="text-[1.15rem]">
              <FontAwesomeIcon icon={faTwitter} /> @{user.twitterHandle}
            </p>
          )) ||
            (authProvider === "google" && (
              <p className="text-[1.15rem]">
                <FontAwesomeIcon icon={faGoogle} /> {user.googleDisplayName}
              </p>
            ))}
          {user.email && (
            <p className="text-[1.15rem]">
              {!authProvider && <FontAwesomeIcon icon={faEnvelope} />}{" "}
              {user.email}
            </p>
          )}
          {recipes > 0 && (
            <p className="text-[1.15rem]">
              <Link href="/recipes">
                {`${recipes} Saved Recipe${recipes > 1 ? "s" : ""}`}
              </Link>
            </p>
          )}
          <p className="text-[1.15rem]">
            <Button variant="link" className="mt-2 text-base" onClick={handleLogout}>
              Sign Out
            </Button>
          </p>
        </div>

        {(user.hasTwitterLinked || user.hasGoogleLinked) && (
          <>
            <h2 className="section-heading">Linked Accounts</h2>
            <hr />
            <p>
              These accounts are linked to your ejuicr account so you can sign
              in without having to enter a password. You can see the data which
              has been shared with ejuicr below.
            </p>
            <div className="min-[500px]:flex">
              {user.hasGoogleLinked && (
                <LinkedAccount
                  logo={
                    <Image
                      src="/google-logo.svg"
                      alt="Google logo"
                      width={48}
                      height={48}
                    />
                  }
                  name="Google"
                  shared="Display name, email, profile picture."
                  onRemove={() => setAccountToUnlink("google")}
                />
              )}
              {user.hasTwitterLinked && (
                <LinkedAccount
                  logo={
                    <Image
                      src="/twitter-logo.svg"
                      alt="Twitter logo"
                      width={48}
                      height={48}
                    />
                  }
                  name="Twitter"
                  shared="Handle, display name, email, profile picture."
                  onRemove={() => setAccountToUnlink("twitter")}
                />
              )}
            </div>
          </>
        )}

        {!user.hasPassword && (
          <>
            <h2 className="section-heading">Set Password</h2>
            <hr />
            {(isLoadingChangePassword && <Spinner />) || (
              <form onSubmit={onSubmitSetPassword}>
                <div className="form-row">
                  <div>
                    <InputBorder className="block w-full">
                      <input
                        type="password"
                        autoComplete="off"
                        aria-label="New password"
                        placeholder="Password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                      />
                    </InputBorder>
                  </div>
                </div>
                <div className="form-row">
                  <div>
                    <InputBorder className="block w-full">
                      <input
                        type="password"
                        autoComplete="off"
                        aria-label="Confirm new password"
                        placeholder="Confirm Password"
                        value={newPasswordConfirm}
                        onChange={(event) =>
                          setNewPasswordConfirm(event.target.value)
                        }
                      />
                    </InputBorder>
                  </div>
                </div>
                <div className="form-row">
                  <button type="submit" className="text-base">
                    Set Password
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {user.hasPassword && (
          <>
            <h2 className="section-heading">Change Password</h2>
            <hr />
            {(isLoadingChangePassword && <Spinner />) || (
              <form onSubmit={onSubmitChangePassword}>
                <div className="form-row">
                  <div>
                    <InputBorder className="block w-full">
                      <input
                        type="password"
                        aria-label="Current password"
                        placeholder="Current Password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </InputBorder>
                  </div>
                </div>
                <div className="form-row">
                  <div>
                    <InputBorder className="block w-full">
                      <input
                        type="password"
                        autoComplete="off"
                        aria-label="New password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                      />
                    </InputBorder>
                  </div>
                </div>
                <div className="form-row">
                  <div>
                    <InputBorder className="block w-full">
                      <input
                        type="password"
                        autoComplete="off"
                        aria-label="Confirm new password"
                        placeholder="Confirm New Password"
                        value={newPasswordConfirm}
                        onChange={(event) =>
                          setNewPasswordConfirm(event.target.value)
                        }
                      />
                    </InputBorder>
                  </div>
                </div>
                <div className="form-row">
                  <button type="submit" className="text-base">
                    Change Password
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        <h2 className="section-heading">Delete Account</h2>
        <hr />
        <p>
          You can permanently delete your ejuicr account and personal data from
          the database as well as all of your saved recipes.{" "}
          <strong className="text-brand-red">This can not be undone.</strong>
        </p>
        <button
          type="button"
          className="btn-red text-base"
          onClick={() => setShowDeleteDialogue(true)}
        >
          Delete Account
        </button>
      </div>

      {accountToUnlink && (
        <ConfirmDialog
          label={`Unlink ${capitalizeFirstLetter(accountToUnlink)} account`}
          onCancel={() => setAccountToUnlink(null)}
        >
          {!user.hasPassword && numberOfLinkedAccounts < 2 ? (
            <>
              <p>
                You must set a password before you can unlink your{" "}
                {capitalizeFirstLetter(accountToUnlink)} account.
              </p>
              <p>You can set a password from the &quot;My Account&quot; page.</p>
              <button
                type="button"
                className="text-base"
                onClick={() => setAccountToUnlink(null)}
              >
                Close
              </button>
            </>
          ) : (
            <>
              <p>
                Are you sure you want to{" "}
                <strong>
                  unlink your {capitalizeFirstLetter(accountToUnlink)} account
                </strong>{" "}
                from your ejuicr account?
              </p>
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  className="text-base"
                  onClick={() => setAccountToUnlink(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-red text-base"
                  onClick={() => {
                    const provider = accountToUnlink;
                    setAccountToUnlink(null);
                    void handleConfirmRemoveLinkedAccount(provider);
                  }}
                >
                  Remove
                </button>
              </div>
            </>
          )}
        </ConfirmDialog>
      )}

      {showDeleteDialogue && (
        <ConfirmDialog
          label="Delete account"
          onCancel={() => setShowDeleteDialogue(false)}
        >
          <p>
            The following data will be <strong>permanently deleted</strong>:
          </p>
          <ul className="mx-2 my-2">
            <li className="mb-4 list-none">Your login credentials.</li>
            <li className="mb-4 list-none">Your profile information.</li>
            <li className="mb-4 list-none">Your saved recipes.</li>
            <li className="mb-4 list-none">Your saved settings.</li>
          </ul>
          <p>
            <strong>
              <em>This can not be undone.</em>
            </strong>
          </p>
          <p>Are you absolutely sure you want to delete your account?</p>
          <div className="flex justify-center gap-4">
            <button
              type="button"
              className="text-base"
              onClick={() => setShowDeleteDialogue(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-red text-base"
              onClick={() => {
                setShowDeleteDialogue(false);
                void handleConfirmDelete();
              }}
            >
              Delete
            </button>
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}

function LinkedAccount({
  logo,
  name,
  shared,
  onRemove,
}: {
  logo: ReactNode;
  name: string;
  shared: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex first:pb-6 min-[500px]:w-1/2 min-[500px]:first:pr-6 min-[500px]:first:pb-0">
      <div className="mr-5 mt-4 h-12 w-12 shrink-0">{logo}</div>
      <div>
        <p className="m-0 text-cream">{name}</p>
        <p className="m-0 text-[0.8rem]">Data Shared:</p>
        <p className="m-0 text-[0.8rem]">{shared}</p>
        <p className="m-0 text-[0.8rem]">
          <Button
            variant="link"
            className="pt-1 text-brand-red"
            onClick={onRemove}
          >
            Remove
          </Button>
        </p>
      </div>
    </div>
  );
}
