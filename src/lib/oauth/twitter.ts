import "server-only";

import { TwitterApi } from "twitter-api-v2";

export interface TwitterCredentials {
  appKey: string;
  appSecret: string;
}

export interface TwitterAuthLink {
  url: string;
  oauthToken: string;
  oauthTokenSecret: string;
}

export interface TwitterProfile {
  id: string;
  handle: string;
  displayName: string;
  email?: string;
  picture?: string;
}

export function getTwitterCredentials(): TwitterCredentials | null {
  const appKey = process.env.TWITTER_CONSUMER_KEY;
  const appSecret = process.env.TWITTER_CONSUMER_SECRET;
  if (!appKey || !appSecret) return null;
  return { appKey, appSecret };
}

export async function createTwitterAuthLink(
  credentials: TwitterCredentials,
  callbackUrl: string,
): Promise<TwitterAuthLink> {
  const client = new TwitterApi(credentials);
  const link = await client.generateAuthLink(callbackUrl, {
    linkMode: "authorize",
  });
  return {
    url: link.url,
    oauthToken: link.oauth_token,
    oauthTokenSecret: link.oauth_token_secret,
  };
}

/** Convert the profile image to a data URL the same way the old server did. */
async function toDataUrl(url: string): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const response = await fetch(url);
    if (!response.ok) return url;
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return url;
  }
}

export async function fetchTwitterProfile(
  credentials: TwitterCredentials,
  oauthToken: string,
  oauthTokenSecret: string,
  verifier: string,
): Promise<TwitterProfile> {
  const client = new TwitterApi({
    ...credentials,
    accessToken: oauthToken,
    accessSecret: oauthTokenSecret,
  });

  const { client: loggedClient } = await client.login(verifier);
  const profile = await loggedClient.v1.verifyCredentials({
    include_email: true,
  });

  const imageUrl = profile.profile_image_url_https?.replace(
    "_normal",
    "_200x200",
  );

  return {
    id: profile.id_str,
    handle: profile.screen_name,
    displayName: profile.name,
    email: profile.email,
    picture: imageUrl ? await toDataUrl(imageUrl) : undefined,
  };
}
