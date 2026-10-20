import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

const SCRYPT_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

const HASH_VERSION = "scrypt";
const HASH_SEPARATOR = "$";

function deriveKey(
  password: string,
  salt: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      KEY_LENGTH,
      SCRYPT_OPTIONS,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey as Buffer);
      },
    );
  });
}

function validatePassword(password: string): void {
  if (typeof password !== "string") {
    throw new Error("Password must be a string.");
  }

  if (password.length < 7) {
    throw new Error(
      "Password must contain at least 7 characters.",
    );
  }

  if (Buffer.byteLength(password, "utf8") > 1024) {
    throw new Error(
      "Password cannot exceed 1024 bytes.",
    );
  }
}

export async function hashPassword(
  password: string,
): Promise<string> {
  validatePassword(password);

  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const derivedKey = await deriveKey(password, salt);

  return [
    HASH_VERSION,
    salt,
    derivedKey.toString("hex"),
  ].join(HASH_SEPARATOR);
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  if (
    typeof password !== "string" ||
    typeof storedHash !== "string" ||
    Buffer.byteLength(password, "utf8") > 1024
  ) {
    return false;
  }

  const parts = storedHash.split(HASH_SEPARATOR);

  if (parts.length !== 3 || parts[0] !== HASH_VERSION) {
    return false;
  }

  const [, salt, storedKeyHex] = parts;

  if (
    !/^[a-f0-9]{32}$/i.test(salt) ||
    !/^[a-f0-9]{128}$/i.test(storedKeyHex)
  ) {
    return false;
  }

  try {
    const derivedKey = await deriveKey(password, salt);
    const storedKey = Buffer.from(storedKeyHex, "hex");

    return (
      storedKey.length === derivedKey.length &&
      timingSafeEqual(storedKey, derivedKey)
    );
  } catch {
    return false;
  }
}
