const PREFIX = "RSE1:";
const KEY_HEX = "617a65726f74682d7375727669766f72732f736176652f76312f9c4e27d16af013b85de2710ca936c48f";
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const keyBytes = Uint8Array.from(KEY_HEX.match(/../g), hex => parseInt(hex, 16));
let keyPromise;

function getKey() {
  keyPromise ||= crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  return keyPromise;
}

function concat(...parts) {
  const result = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

async function sign(data) {
  return new Uint8Array(await crypto.subtle.sign("HMAC", await getKey(), data));
}

function fromBase64(value) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error("Некорректный Base64 в строке сохранения.");
  }
  try {
    return Uint8Array.from(atob(value), char => char.charCodeAt(0));
  } catch {
    throw new Error("Не удалось прочитать Base64.");
  }
}

function toBase64(bytes) {
  let value = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    value += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(value);
}

async function xorStream(nonce, input) {
  const output = new Uint8Array(input.length);
  const message = concat(encoder.encode("ks"), nonce, new Uint8Array(8));
  // A bounded batch keeps large saves responsive without flooding WebCrypto.
  for (let block = 0; block * 20 < input.length; block += 64) {
    const end = Math.min(block + 64, Math.ceil(input.length / 20));
    const hashes = await Promise.all(Array.from({ length: end - block }, (_, index) => {
      const counter = block + index;
      const data = message.slice();
      new DataView(data.buffer).setBigUint64(data.length - 8, BigInt(counter), true);
      return sign(data);
    }));
    for (let index = 0; index < hashes.length; index++) {
      const offset = (block + index) * 20;
      const length = Math.min(20, input.length - offset);
      for (let byte = 0; byte < length; byte++) output[offset + byte] = input[offset + byte] ^ hashes[index][byte];
    }
  }
  return output;
}

export async function decodeSave(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith(PREFIX)) {
    if (/^[A-Za-z][A-Za-z0-9_]*\|/.test(trimmed)) return value;
    throw new Error("Ожидалась строка RSE1: или открытый текст сохранения.");
  }
  const bytes = fromBase64(trimmed.slice(PREFIX.length));
  if (bytes.length < 36) throw new Error("Сохранение слишком короткое.");
  const nonce = bytes.subarray(0, 16);
  const cipher = bytes.subarray(16, -20);
  const tag = bytes.subarray(-20);
  const actual = await sign(concat(encoder.encode("tag"), nonce, cipher));
  let difference = 0;
  for (let i = 0; i < 20; i++) difference |= tag[i] ^ actual[i];
  if (difference) throw new Error("Подпись не совпадает: файл повреждён или создан другой версией игры.");
  try {
    return decoder.decode(await xorStream(nonce, cipher));
  } catch {
    throw new Error("Подпись верна, но текст сохранения не является UTF-8.");
  }
}

export async function encodeSave(plaintext) {
  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const cipher = await xorStream(nonce, encoder.encode(plaintext));
  const tag = await sign(concat(encoder.encode("tag"), nonce, cipher));
  return PREFIX + toBase64(concat(nonce, cipher, tag));
}

export function isSealed(value) {
  return value.trim().startsWith(PREFIX);
}
