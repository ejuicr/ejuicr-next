import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { faGoogle, faTwitter } from "@fortawesome/free-brands-svg-icons";
import type { PublicUser } from "@/types";

export default function UserProfile({ user }: { user: PublicUser }) {
  const authProvider = user.authProvider || null;
  const profilePicAltText = `your ${authProvider} profile picture`;
  const profilePicSrc =
    (authProvider === "google" && user.googlePicture) ||
    (authProvider === "twitter" && user.twitterPicture) ||
    "#";

  return (
    <div className="mb-6 text-slateblue">
      <p className="mb-2 text-[0.9rem]">You are signed in as:</p>
      {(user.googlePicture || user.twitterPicture) && (
        <div className="mx-auto mb-2 w-fit rounded-full bg-gradient-to-br from-brand-purple to-brand-cyan p-[3px] leading-none">
          {/* eslint-disable-next-line @next/next/no-img-element -- profile pictures can be remote URLs or data URLs */}
          <img
            src={profilePicSrc}
            alt={profilePicAltText}
            referrerPolicy="no-referrer"
            className="h-auto max-w-16 rounded-full"
          />
        </div>
      )}
      {(authProvider === "google" && (
        <p className="text-[0.9rem]">
          <FontAwesomeIcon icon={faGoogle} className="mr-1 mb-[-2px]" />
          {user.googleDisplayName}
        </p>
      )) ||
        (authProvider === "twitter" && (
          <p className="text-[0.9rem]">
            <FontAwesomeIcon icon={faTwitter} className="mr-1 mb-[-2px]" />@
            {user.twitterHandle}
          </p>
        )) || (
          <p className="text-[0.9rem]">
            <FontAwesomeIcon icon={faEnvelope} className="mr-1 mb-[-2px]" />
            {user.email}
          </p>
        )}
    </div>
  );
}
