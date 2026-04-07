export function isValidSpanishPhone(phone: string): boolean {
  if (!phone) return true
  const stripped = phone.replace(/[\s\-().]/g, '')
  return /^(\+34|0034|34)?[6-9]\d{8}$/.test(stripped)
}
