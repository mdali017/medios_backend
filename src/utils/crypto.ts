import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

function getEncryptionKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest()
}

export function encryptSecret(plaintext: string, secret: string): string {
  const key = getEncryptionKey(secret)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`
}

export function decryptSecret(payload: string, secret: string): string {
  const [ivPart, tagPart, dataPart] = payload.split('.')
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error('Invalid encrypted payload')
  }

  const key = getEncryptionKey(secret)
  const iv = Buffer.from(ivPart, 'base64url')
  const authTag = Buffer.from(tagPart, 'base64url')
  const encrypted = Buffer.from(dataPart, 'base64url')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}
