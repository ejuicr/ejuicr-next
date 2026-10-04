"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

export default function Header({ toggleMenu }: { toggleMenu: () => void }) {
  const pathname = usePathname();

  const handleClick = () => {
    // Force a page refresh if the logo is clicked from the "/" route, the same
    // way the old front end did.
    if (pathname === "/") {
      window.location.reload();
    }
  };

  return (
    <header
      id="page-header"
      className="mb-4 bg-ink px-4 py-4"
    >
      <div className="mx-auto flex max-w-[800px] justify-between">
        <Link href="/" onClick={handleClick} aria-label="ejuicr home">
          <Image
            src="/logo.svg"
            alt="ejuicr logo"
            width={98}
            height={23}
            priority
            className="h-auto"
          />
        </Link>
        <button
          type="button"
          title="menu"
          aria-label="Open menu"
          onClick={toggleMenu}
          className="bg-transparent p-0 text-[1.35rem] text-brand-cyan hover:bg-transparent active:bg-transparent"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
      </div>
    </header>
  );
}
