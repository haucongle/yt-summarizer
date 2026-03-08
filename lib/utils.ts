export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export function generateId() {
  return Math.random().toString(36).substring(2, 15)
}
