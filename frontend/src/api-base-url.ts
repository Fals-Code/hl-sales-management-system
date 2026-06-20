type BrowserLocation = Pick<Location, "hostname" | "origin">;

export function resolveApiBaseUrl(configuredBaseUrl: string | undefined, location: BrowserLocation) {
  const rawBaseUrl = configuredBaseUrl?.trim() || "http://localhost:3000";

  if (rawBaseUrl === "/" || rawBaseUrl === "." || rawBaseUrl === "./") {
    return location.origin.replace(/\/$/, "");
  }

  try {
    const apiUrl = new URL(rawBaseUrl, location.origin);
    const browserHost = location.hostname;

    if (
      apiUrl.hostname !== browserHost &&
      isLocalDevelopmentHost(apiUrl.hostname) &&
      isLocalDevelopmentHost(browserHost)
    ) {
      apiUrl.hostname = browserHost;
    }

    return apiUrl.toString().replace(/\/$/, "");
  } catch {
    return rawBaseUrl.replace(/\/$/, "");
  }
}

function isLocalDevelopmentHost(hostname: string) {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return true;
  }
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;

  const private172 = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  return private172 !== null && Number(private172[1]) >= 16 && Number(private172[1]) <= 31;
}
