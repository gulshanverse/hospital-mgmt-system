export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL || "https://manus.im";
  const appId = import.meta.env.VITE_APP_ID || "TtabevBoN3F2YUrkXpbqCr";
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  // Ensure absolute URL
  let basePortalUrl = oauthPortalUrl;
  if (!basePortalUrl.startsWith("http://") && !basePortalUrl.startsWith("https://")) {
    basePortalUrl = `${window.location.origin}${basePortalUrl.startsWith("/") ? "" : "/"}${basePortalUrl}`;
  }

  const url = new URL(`${basePortalUrl.replace(/\/+$/, "")}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
