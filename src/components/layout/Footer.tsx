import Image from "next/image";
import Link from "next/link";
import FooterMenu from "./FooterMenu";

export default function Footer() {
  return (
    <footer className="mt-8 bg-ink px-4 pt-8">
      <div className="mx-auto flex max-w-[800px] justify-between">
        <FooterMenu />
        <div className="relative">
          <Image
            src="/logo-gray.svg"
            alt="ejuicr logo"
            width={107}
            height={25}
            className="absolute right-0 bottom-0 h-auto w-[150px]"
          />
        </div>
      </div>
      <p className="m-0 py-4 text-center text-muted">
        <Link href="/terms-of-service" className="text-[0.9rem] text-muted">
          Terms of Service
        </Link>{" "}
        |{" "}
        <Link href="/privacy-policy" className="text-[0.9rem] text-muted">
          Privacy Policy
        </Link>
      </p>
    </footer>
  );
}
