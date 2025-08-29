// SHA-256 hash function for Node.js environment
import * as crypto from 'crypto'

export function sha256(str: string): string {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex')
}

export function truncate(q: string): string {
  const len = q.length
  if (len <= 20) return q
  return q.substring(0, 10) + len + q.substring(len - 10, len)
}

export function hmacSha256(key: string | Buffer, str: string): Buffer {
  return crypto.createHmac('sha256', key).update(str, 'utf8').digest()
}

export function sha256Hex(str: string): string {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex')
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toISOString().substr(0, 10)
}
