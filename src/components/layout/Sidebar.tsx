"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faClose,
  faEnvelope,
} from "@fortawesome/free-solid-svg-icons";
import { faTwitter } from "@fortawesome/free-brands-svg-icons";
import clsx from "clsx";
import Login from "@/components/auth/Login";
import Signup from "@/components/auth/Signup";
import ResetPassword from "@/components/auth/ResetPassword";
import UserProfile from "@/components/account/UserProfile";
import Button from "@/components/ui/Button";
import { useFocusTrap } from "@/components/ui/useFocusTrap";
import { useAuth } from "@/components/providers/AuthProvider";
import FooterMenu from "./FooterMenu";

type View = "main" | "loginMenu" | "login" | "signup" | "reset";

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>("main");
  const { user, providers, logout } = useAuth();
  const router = useRouter();
  const navRef = useRef<HTMLElement>(null);

  const handleClose = useCallback(() => {
    setView("main");
    onClose();
  }, [onClose]);

  useFocusTrap(navRef, open);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // Local state is already cleared; still leave the account UI.
      console.error(error);
    }
    handleClose();
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <div
        aria-hidden="true"
        onClick={handleClose}
        className={clsx(
          "sidebar-backdrop fixed inset-0 z-40 bg-black/60",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <nav
        ref={navRef}
        aria-label="Main menu"
        aria-hidden={!open}
        inert={!open}
        tabIndex={-1}
        className={clsx(
          "sidebar-panel fixed top-0 right-0 z-50 h-full w-[250px] overflow-y-auto bg-ink p-4 text-center",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex justify-between text-right">
          {view !== "main" && !user ? (
            <Button
              variant="ghost"
              aria-label="Back"
              onClick={() => setView("main")}
              className="text-[1.35rem] text-brand-cyan hover:text-brand-pink"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </Button>
          ) : (
            <div />
          )}
          <Button
            variant="ghost"
            aria-label="Close menu"
            onClick={handleClose}
            className="text-[1.35rem] text-brand-cyan hover:text-brand-pink"
          >
            <FontAwesomeIcon icon={faClose} />
          </Button>
        </div>

        {user ? (
          <>
            <Link
              href="/"
              onClick={handleClose}
              className="mx-auto my-4 mb-8 block w-fit"
              aria-label="ejuicr home"
            >
              <Image
                src="/logo.svg"
                alt="ejuicr logo"
                width={98}
                height={23}
                className="h-auto"
              />
            </Link>
            <UserProfile user={user} />
            <p className="mb-6">
              <Link href="/recipes" onClick={handleClose}>
                Saved Recipes
              </Link>
            </p>
            <p className="mb-6">
              <Link href="/settings" onClick={handleClose}>
                Settings
              </Link>
            </p>
            <p className="mb-6">
              <Link href="/myaccount" onClick={handleClose}>
                My Account
              </Link>
            </p>
            <p className="mb-6">
              <Button variant="link" onClick={handleLogout}>
                Logout
              </Button>
            </p>
          </>
        ) : view === "loginMenu" ? (
          <>
            <h2 className="mx-auto my-2 text-[2.25rem]">Login</h2>
            <ul className="m-0 list-none p-0">
              {providers.google && (
                <li className="mb-6">
                  <a
                    href="/api/auth/google"
                    className="inline-block"
                    aria-label="Sign in with Google"
                  >
                    <Image
                      src="/google-signin-btn.png"
                      alt="Sign in with Google"
                      width={185}
                      height={40}
                    />
                  </a>
                </li>
              )}
              {providers.twitter && (
                <li className="mb-6">
                  <a
                    href="/api/auth/twitter"
                    className="btn w-[184px] text-[0.9rem]"
                  >
                    <FontAwesomeIcon icon={faTwitter} className="mr-2" />
                    Sign in with Twitter
                  </a>
                </li>
              )}
              <li className="mb-6">
                <button
                  type="button"
                  className="w-[184px] text-[0.9rem]"
                  onClick={() => setView("login")}
                >
                  <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                  Sign in with Email
                </button>
              </li>
              <li className="mb-6">
                <button
                  type="button"
                  className="w-[184px] text-[0.9rem]"
                  onClick={() => setView("signup")}
                >
                  <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                  Sign up with Email
                </button>
              </li>
            </ul>
          </>
        ) : view === "login" ? (
          <Login
            onCancel={() => setView("loginMenu")}
            onSignup={() => setView("signup")}
            onResetPassword={() => setView("reset")}
            onSuccess={handleClose}
          />
        ) : view === "signup" ? (
          <Signup
            onCancel={() => setView("loginMenu")}
            onLogin={() => setView("login")}
            onSuccess={handleClose}
          />
        ) : view === "reset" ? (
          <ResetPassword onCancel={() => setView("loginMenu")} />
        ) : (
          <>
            <Link
              href="/"
              onClick={handleClose}
              className="mx-auto my-4 mb-8 block w-fit"
              aria-label="ejuicr home"
            >
              <Image
                src="/logo.svg"
                alt="ejuicr logo"
                width={98}
                height={23}
                className="h-auto"
              />
            </Link>
            <Link href="#" onClick={() => setView("loginMenu")}>
              Login/Signup
            </Link>
          </>
        )}

        <hr className="my-8" />
        <FooterMenu toggleMenu={handleClose} />
      </nav>
    </>
  );
}
