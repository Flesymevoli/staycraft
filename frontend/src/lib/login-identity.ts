const USERNAME_DOMAIN = "accounts.staycraft.invalid";

export function normalizeUsername(value: string): string | null {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/.test(username) || username.includes("..")) return null;
  return username;
}

export function usernameEmail(username: string): string {
  const normalized = normalizeUsername(username);
  if (!normalized) throw new Error("invalid_username");
  return `${normalized}@${USERNAME_DOMAIN}`;
}

export function loginEmail(value: string): string | null {
  const identity = value.trim().toLowerCase();
  if (identity.includes("@")) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity) ? identity : null;
  }
  const username = normalizeUsername(identity);
  return username ? usernameEmail(username) : null;
}

export function displayLoginIdentity(email: string): string {
  const suffix = `@${USERNAME_DOMAIN}`;
  if (!email.toLowerCase().endsWith(suffix)) return email;
  const username = normalizeUsername(email.slice(0, -suffix.length));
  return username ?? email;
}
