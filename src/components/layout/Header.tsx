"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import Button from "@/components/ui/Button";

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
        <Button
          variant="ghost"
          title="menu"
          aria-label="Open menu"
          onClick={toggleMenu}
          className="text-[1.35rem] text-brand-cyan"
        >
          <FontAwesomeIcon icon={faBars} />
        </Button>
      </div>
    </header>
  );
}
