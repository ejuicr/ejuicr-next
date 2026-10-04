import Link from "next/link";

export const metadata = { title: "About ejuicr" };

export default function AboutPage() {
  return (
    <>
      <h1>About ejuicr</h1>
      <hr />
      <p className="px-8 text-center">
        The goal of ejuicr is to a vaper&apos;s fist choice for a convenient and
        easy-to-use ejuice calculator.
      </p>
      <h2 className="section-heading">Use it Anywhere</h2>
      <hr />
      <p>If it can load a web page, it can run ejuicr.</p>
      <p>
        We try to keep the UI simple and unobtrusive so that you can use eJuicr
        easily whether you&apos;re reaching past a bunch of bottles for your
        keyboard or pecking at your phone with one hand and mixing juice with
        the other.
      </p>
      <p>
        Install the web app to your desktop or home screen so you can even use
        ejuicr offline! <strong>(coming soon...)</strong>
      </p>
      <h2 className="section-heading">Little to No Setup Time</h2>
      <hr />
      <p>
        The faster you can start mixing, the better. So we try to remove as many
        speed bumps as possible.
      </p>
      <p>
        If you sign in, you can save your defaults (nicotine strength, PG/VG
        ratio, etc) to make mixing your ejuice even faster.
      </p>
      <h2 className="section-heading">No Ads or Trackers - Ever</h2>
      <hr />
      <p>ejuicr is a labour of love.</p>
      <p>We don&apos;t want your money or your data.</p>
      <p>
        If there&apos;s anything we want from you, it&apos;s your{" "}
        <Link href="/contribute">feedback</Link>.
      </p>
      <h2 className="section-heading">No Unnecessary Emails - Ever.</h2>
      <hr />
      <p>
        We <em>hate</em> spam.
      </p>
      <p>
        You will never receive emails from us unless you email us for support or
        request a password reset.
      </p>
    </>
  );
}
