export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const formatSeconds = (seconds) => {
  const safe = Math.max(0, Math.round(seconds))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
