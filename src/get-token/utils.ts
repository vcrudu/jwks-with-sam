export function toBase64Url(content: string | Uint8Array) {
    return Buffer.from(content)
      .toString("base64")
      .replace("+", "-")
      .replace("/", "_")
      .replace(/=+$/, "");
  }