// https://dev.to/ratmd/simple-proof-of-work-in-javascript-3kgm

export default function process(
  data: string,
  difficulty: number = 5,
  signal: AbortSignal | null = null,
  progressCallback: ((progress: number) => void) | null = null,
): Promise<{ hash: string; nonce: number; data: string; difficulty: number }> {
  console.debug("slow algo");
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("pow-worker-slow.ts", import.meta.url), {
      type: "module",
    });
    const terminate = () => {
      worker.terminate();
      if (signal != null) {
        // clean up listener to avoid memory leak
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
    });
  });
}
