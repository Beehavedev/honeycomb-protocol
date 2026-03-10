import crypto from "crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

function getEncryptionKey(): Buffer {
  const secret = process.env.CUSTODIAL_WALLET_KEY || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("CUSTODIAL_WALLET_KEY or SESSION_SECRET must be set for wallet encryption");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function generateCustodialWallet(): { address: string; encryptedPrivateKey: string; iv: string; authTag: string } {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return {
    address: account.address.toLowerCase(),
    encryptedPrivateKey: encrypted,
    iv: iv.toString("hex"),
    authTag,
  };
}

export function decryptPrivateKey(encryptedPrivateKey: string, iv: string, authTag: string): `0x${string}` {
  const key = getEncryptionKey();
  const ivBuf = Buffer.from(iv, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, ivBuf);
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  let decrypted = decipher.update(encryptedPrivateKey, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted as `0x${string}`;
}
