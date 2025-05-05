export default function process(
  data: string,
  difficulty: number = 5,
  signal: AbortSignal | null = null,
  progressCallback: ((progress: number) => void) | null = null,
  threads: number = navigator.hardwareConcurrency || 1,
): Promise<{ hash: string; nonce: number; data: string; difficulty: number }> {
  console.debug("fast algo");
  return new Promise((resolve, reject) => {
    const workers: Worker[] = [];
    const terminate = () => {
      for (const w of workers) w.terminate();
      if (signal != null) {
        (signal as AbortSignal).removeEventListener("abort", terminate);
        if ((signal as AbortSignal).aborted) {
          console.log("PoW aborted");
          reject(false);
        }
      }
    };
    if (signal != null) {
      (signal as AbortSignal).addEventListener("abort", terminate, {
        once: true,
      });
    }

    for (let i = 0; i < threads; i++) {
      const worker = new Worker(new URL("pow-worker.ts", import.meta.url), {
        type: "module",
      });

      worker.addEventListener("message", (event) => {
        if (typeof event.data === "number") {
          progressCallback?.(event.data);
        } else {
          terminate();
          resolve(event.data);
        }
      });

      worker.addEventListener("error", (event) => {
        terminate();
        reject(event);
      });

      worker.postMessage({
        data,
        difficulty,
        nonce: i,
        threads,
      });

      workers.push(worker);
    }
  });
}
