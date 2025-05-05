import processFast from "./proof-of-work";
import processSlow from "./proof-of-work-slow";

const defaultDifficulty = 4;
const algorithms = {
  fast: processFast,
  slow: processSlow,
};

const status = document.querySelector("#status") as HTMLElement;
const difficultyInput = document.querySelector(
  "#difficulty-input",
) as HTMLInputElement;
const algorithmSelect = document.querySelector(
  "#algorithm-select",
) as HTMLSelectElement;
const compareSelect = document.querySelector(
  "#compare-select",
) as HTMLSelectElement;
const header = document.querySelector("#table-header") as HTMLElement;
const headerCompare = document.querySelector(
  "#table-header-compare",
) as HTMLElement;
const results = document.querySelector("#results") as HTMLElement;

const setupControls = () => {
  difficultyInput.value = defaultDifficulty.toString();
  for (const alg of Object.keys(algorithms)) {
    const option1 = document.createElement("option");
    algorithmSelect.append(option1);
    const option2 = document.createElement("option");
    compareSelect.append(option2);
    option1.value =
      option1.textContent =
      option2.value =
      option2.textContent =
        alg;
  }
};

const benchmarkTrial = async (
  stats: { time: number; iters: number },
  difficulty: number,
  algorithm: keyof typeof algorithms,
  signal: AbortSignal,
) => {
  if (!(difficulty >= 1)) {
    throw new Error(`Invalid difficulty: ${difficulty}`);
  }
  const process = algorithms[algorithm];
  if (process == null) {
    throw new Error(`Unknown algorithm: ${algorithm}`);
  }

  const rawChallenge = new Uint8Array(32);
  crypto.getRandomValues(rawChallenge);
  const challenge = Array.from(rawChallenge)
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("");

  const t0 = performance.now();
  const { hash, nonce } = (await process(challenge, difficulty, signal)) as {
    hash: string;
    nonce: number;
  };
  const t1 = performance.now();
  console.log({ hash, nonce });

  stats.time += t1 - t0;
  stats.iters += nonce;

  return { time: t1 - t0, nonce };
};

const stats = { time: 0, iters: 0 };
const comparison = { time: 0, iters: 0 };
const updateStatus = () => {
  const mainRate = stats.iters / stats.time;
  const compareRate = comparison.iters / comparison.time;
  if (Number.isFinite(mainRate)) {
    status.textContent = `Average hashrate: ${mainRate.toFixed(3)}kH/s`;
    if (Number.isFinite(compareRate)) {
      const change = ((mainRate - compareRate) / mainRate) * 100;
      status.textContent += ` vs ${compareRate.toFixed(3)}kH/s (${change.toFixed(
        2,
      )}% change)`;
    }
  } else {
    status.textContent = "Benchmarking...";
  }
};

const tableCell = (text: string) => {
  const td = document.createElement("td");
  td.textContent = text;
  td.style.padding = "0 0.25rem";
  return td;
};

const benchmarkLoop = async (controller: AbortController) => {
  const difficulty = Number(difficultyInput.value);
  const algorithm = algorithmSelect.value as keyof typeof algorithms;
  const compareAlgorithm = compareSelect.value as
    | "NONE"
    | keyof typeof algorithms;
  updateStatus();

  try {
    const { time, nonce } = await benchmarkTrial(
      stats,
      difficulty,
      algorithm,
      controller.signal,
    );

    const tr = document.createElement("tr");
    tr.style.display = "contents";
    tr.append(tableCell(`${time}ms`), tableCell(String(nonce)));

    // auto-scroll to new rows
    const atBottom =
      results.scrollHeight - results.clientHeight <= results.scrollTop;
    results.append(tr);
    if (atBottom) {
      results.scrollTop = results.scrollHeight - results.clientHeight;
    }
    updateStatus();

    if (compareAlgorithm !== "NONE") {
      const { time, nonce } = await benchmarkTrial(
        comparison,
        difficulty,
        compareAlgorithm as keyof typeof algorithms,
        controller.signal,
      );
      tr.append(tableCell(`${time}ms`), tableCell(String(nonce)));
    }
  } catch (error: any) {
    if (error !== false) {
      status.textContent = error?.message ?? String(error);
    }
    return;
  }

  benchmarkLoop(controller);
};

let controller: AbortController | null = null;
const reset = () => {
  stats.time = stats.iters = 0;
  comparison.time = comparison.iters = 0;
  results.innerHTML = status.textContent = "";

  const table: HTMLElement = results.parentElement!;
  if (compareSelect.value === "NONE") {
    table.style.gridTemplateColumns = "repeat(2,auto)";
    header.style.display = "contents";
    headerCompare.style.display = "none";
  } else {
    table.style.gridTemplateColumns = "repeat(4,auto)";
    header.style.display = "none";
    headerCompare.style.display = "contents";
  }

  if (controller != null) {
    controller.abort();
  }
  controller = new AbortController();
  benchmarkLoop(controller);
};

setupControls();
difficultyInput.addEventListener("change", reset);
algorithmSelect.addEventListener("change", reset);
compareSelect.addEventListener("change", reset);
reset();
