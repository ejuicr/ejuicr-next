import { DONATION_LINK, FEEDBACK_EMAIL } from "@/lib/config";

export const metadata = { title: "Contribute" };

export default function ContributePage() {
  return (
    <>
      <h1>Contribute</h1>
      <hr />
      <h2 className="mt-10 text-[1.75rem]">Send Feedback</h2>
      <hr />
      <p>
        The easiest way to contribute is to send us your feedback by{" "}
        {FEEDBACK_EMAIL && (
          <>
            email (
            <a href={`mailto:${FEEDBACK_EMAIL}`}>{FEEDBACK_EMAIL}</a>) or{" "}
          </>
        )}
        twitter (
        <a href="https://twitter.com/ejuicr" target="_blank" rel="noreferrer">
          @ejuicr
        </a>
        ).
      </p>
      <p>We appreciate any feedback you&apos;d like to share.</p>
      <p>
        If you don&apos;t really have anything to say about ejuicr right now
        maybe you could answer one or more of the questions below for us:
      </p>
      <ul>
        <li>How did you find ejuicr?</li>
        <li>How long have you been using ejuicr?</li>
        <li>When and how do you typically use ejuicr?</li>
        <li>
          Do you find ejuicr easy to use or did you have trouble at first?
        </li>
        <li>What&apos;s your favorite or least favorite thing about ejuicr?</li>
        <li>Is there a feature you wish that ejuicr had?</li>
        <li>Ever had a problem with ejuicr? If so, what was it?</li>
        <li>Does ejuicr fail on any devices you&apos;ve tried?</li>
        <li>How likely are you to recommend ejuicr to a friend?</li>
      </ul>
      <h2 className="mt-10 text-[1.75rem]">Github</h2>
      <hr />
      <p>
        The source code for ejuicr is available on{" "}
        <a
          href="https://github.com/ejuicr/ejuicr-next"
          target="_blank"
          rel="noreferrer"
        >
          Github
        </a>
        .
      </p>
      <p>
        If you&apos;d like to report a bug or formally suggest a new feature,
        please create a new issue on the{" "}
        <a
          href="https://github.com/ejuicr/ejuicr-next/issues"
          target="_blank"
          rel="noreferrer"
        >
          issues page
        </a>
        .
      </p>
      <p>
        Feel free to submit pull request if you&apos;d like to contribute to the
        codebase. We kindly ask that you clearly document the changes you have
        made.
      </p>
      {DONATION_LINK && (
        <>
          <h2 className="mt-10 text-[1.75rem]">Donate</h2>
          <hr />
          <p>
            If you&apos;d like to throw a couple bucks our way to help with
            server costs you can send your donation{" "}
            <a href={DONATION_LINK}>here</a>.
          </p>
        </>
      )}
    </>
  );
}
