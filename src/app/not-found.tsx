import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <h1>Page Not Found</h1>
      <hr />
      <p>The page you&apos;re looking for could not be found.</p>
      <p>It may have been removed or the URL may have changed.</p>
      <p>
        If you came to this page directly, please double-check that you entered
        the address correctly.
      </p>
      <p>
        Please contact <Link href="/help">support</Link> if you&apos;re unable
        to find what you&apos;re looking for.
      </p>
    </div>
  );
}
