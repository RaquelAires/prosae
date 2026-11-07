export function getRequestUser(req: Request) {
  const userId = req.headers.get("oai-authenticated-user-id"),
    email = req.headers.get("oai-authenticated-user-email");
  if (!userId || !email) return null;
  let fullName = req.headers.get("oai-authenticated-user-full-name");
  if (
    fullName &&
    req.headers.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
  ) {
    try {
      fullName = decodeURIComponent(fullName);
    } catch {
      fullName = null;
    }
  }
  return { userId, email, displayName: fullName || email };
}
