self.addEventListener("message", async (event) => {
  const { imageUrl, maxDim } = event.data || {};
  if (!imageUrl) {
    self.postMessage({ error: "Missing imageUrl" });
    return;
  }

  try {
    const resp = await fetch(imageUrl, { mode: "cors" });
    if (!resp.ok) throw new Error(`Failed to fetch image (${resp.status})`);
    const buffer = await resp.arrayBuffer();

    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (!maxDim) {
      self.postMessage({ hash });
      return;
    }

    const blob = new Blob([buffer]);
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(maxDim / Math.max(bitmap.width, bitmap.height), 1);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const resizedBlob = await canvas.convertToBlob({ type: "image/png" });
    const resizedUrl = URL.createObjectURL(resizedBlob);

    self.postMessage({ hash, resizedUrl, width, height });
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : "Worker failed" });
  }
});
