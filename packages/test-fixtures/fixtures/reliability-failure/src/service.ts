export async function loadFeed() {
  try { return await fetch('https://example.invalid/feed'); } catch {}
}
