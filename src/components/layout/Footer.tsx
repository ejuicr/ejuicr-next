import Image from "next/image";
import Link from "next/link";
import FooterMenu from "./FooterMenu";

export default function Footer() {
  return (
    <footer className="mt-8 bg-ink px-4 pt-8">
      <div className="mx-auto flex max-w-[800px] flex-wrap items-start justify-between gap-4">
        <FooterMenu />
        <Image
          src="/logo-gray.svg"
          alt="ejuicr logo"
          width={107}
          height={25}
          className="h-auto w-[150px] shrink-0"
        />
      </div>
      <p className="m-0 py-4 text-center text-secondary">
        <Link href="/terms-of-service" className="text-[0.9rem] text-secondary">
          Terms of Service
        </Link>{" "}
        |{" "}
        <Link href="/privacy-policy" className="text-[0.9rem] text-secondary">
          Privacy Policy
        </Link>
      </p>
    </footer>
  );
}
