import Link from "next/link";

export default function FooterMenu({ toggleMenu }: { toggleMenu?: () => void }) {
  return (
    <ul className="z-[1] m-0 list-none p-0">
      <li className="mb-4 last:mb-0">
        <Link href="/about" onClick={toggleMenu}>
          About
        </Link>
      </li>
      <li className="mb-4 last:mb-0">
        <Link href="/help" onClick={toggleMenu}>
          Help
        </Link>
      </li>
      <li className="mb-4 last:mb-0">
        <Link href="/contribute" onClick={toggleMenu}>
          Contribute
        </Link>
      </li>
      <li className="mb-4 last:mb-0">
        <a
          href="https://www.jimfarrugia.com.au"
          target="_blank"
          rel="noreferrer"
          onClick={toggleMenu}
        >
          Jim Farrugia
        </a>
      </li>
      <li className="mb-4 last:mb-0">
        <a
          href="https://www.twitter.com/ejuicr"
          target="_blank"
          rel="noreferrer"
          onClick={toggleMenu}
        >
          @ejuicr
        </a>
      </li>
    </ul>
  );
}
