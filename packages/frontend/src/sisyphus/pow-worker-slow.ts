function uint8ArrayToHexString(arr: Uint8Array<ArrayBuffer>) {
  return Array.from(arr)
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(text: string) {
  const encoded = new TextEncoder().encode(text);
  const result = await crypto.subtle.digest("SHA-256", encoded.buffer);

  return uint8ArrayToHexString(new Uint8Array(result));
}

addEventListener("message", async (event) => {
  const data = event.data.data;
  const difficulty = event.data.difficulty;

  let hash;
  let nonce = 0;
  do {
    if ((nonce & 1023) === 0) {
      postMessage(nonce);
    }
    hash = await sha256(data + nonce++);
  } while (
    hash.slice(0, Math.max(0, difficulty)) !==
    Array.from({ length: difficulty + 1 }).join("0")
  );

  nonce -= 1; // last nonce was post-incremented

  postMessage({
    hash,
    data,
    difficulty,
    nonce,
  });
});
