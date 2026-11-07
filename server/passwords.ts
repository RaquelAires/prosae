import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$32768$8$3$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const pieces = encoded.split("$");
  if (
    pieces.length !== 6 ||
    pieces.slice(0, 4).join("$") !== "scrypt$32768$8$3" ||
    !/^[a-f0-9]{32}$/.test(pieces[4]) ||
    !/^[a-f0-9]{128}$/.test(pieces[5])
  )
    return false;
  return timingSafeEqual(
    await derive(password, pieces[4]),
    Buffer.from(pieces[5], "hex"),
  );
}
// A missing account still performs the same password derivation as a real account.
export const dummyHash =
  "scrypt$32768$8$3$" + "0".repeat(32) + "$" + "0".repeat(128);
