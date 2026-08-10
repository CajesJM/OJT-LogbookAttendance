import type { LocalCredentials } from "../types";

const ITERATIONS = 210_000;

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function normalizeUsername(username: string) {
  return username.trim().toLocaleLowerCase("en");
}

async function derivePasswordHash(password: string, salt: Uint8Array) {
  const saltBuffer = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuffer).set(salt);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBuffer,
      iterations: ITERATIONS,
    },
    keyMaterial,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

export async function createCredentials(
  username: string,
  password: string,
): Promise<LocalCredentials> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    username: normalizeUsername(username),
    salt: bytesToBase64(salt),
    passwordHash: await derivePasswordHash(password, salt),
  };
}

export async function verifyCredentials(
  credentials: LocalCredentials,
  username: string,
  password: string,
) {
  if (credentials.username !== normalizeUsername(username)) return false;
  const actualHash = await derivePasswordHash(
    password,
    base64ToBytes(credentials.salt),
  );
  return actualHash === credentials.passwordHash;
}
