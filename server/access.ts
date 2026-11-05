/** Explicit, time-limited public judging access. Expired or invalid dates fail closed. */
export function publicAiEnabled(now = Date.now()) {
  const until = process.env.AI_PUBLIC_UNTIL;
  if (!until || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(until)) return false;
  const expires = Date.parse(until);
  return Number.isFinite(expires) && now < expires;
}
