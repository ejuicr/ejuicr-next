import { FEEDBACK_EMAIL, SUPPORT_EMAIL } from "@/lib/config";

export const metadata = { title: "Help" };

export default function HelpPage() {
  return (
    <>
      <h1>Help</h1>
      <hr />
      <h2 className="section-heading">Contact Support</h2>
      <hr />
      {SUPPORT_EMAIL && (
        <p>
          If you&apos;re having trouble with ejuicr and would like to reach out
          you can send an email to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and someone
          will get back to you.
        </p>
      )}
      <p>
        {SUPPORT_EMAIL ? "You can also" : "You can"} send a tweet or a direct
        message on Twitter to{" "}
        <a href="https://twitter.com/ejuicr" target="_blank" rel="noreferrer">
          @ejuicr
        </a>{" "}
        but you may have to wait a bit longer for a reply.
      </p>
      <h2 className="section-heading">Send Feedback</h2>
      <hr />
      <p>
        We appreciate any feedback you&apos;d like to share! Please{" "}
        {FEEDBACK_EMAIL && (
          <>
            email{" "}
            <a href={`mailto:${FEEDBACK_EMAIL}`}>{FEEDBACK_EMAIL}</a> or{" "}
          </>
        )}
        tweet{" "}
        <a href="https://twitter.com/ejuicr" target="_blank" rel="noreferrer">
          @ejuicr
        </a>
        .
      </p>
    </>
  );
}
