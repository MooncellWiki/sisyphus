import "virtual:uno.css";
import "./styles/main.css";
import "./styles/prose.css";

import processFast from "./sisyphus/proof-of-work";
import processSlow from "./sisyphus/proof-of-work-slow";
// import { testVideo } from "./video";

const algorithms = {
  fast: processFast,
  slow: processSlow,
};

interface OhNoesParams {
  titleMsg: string;
  statusMsg: string;
}

interface sisyphusChallenge {
  challenge: string;
  rules: {
    algorithm: keyof typeof algorithms;
    difficulty: number;
    report_as: number;
  };
}

const dependencies = [
  {
    name: "WebCrypto",
    msg: "Your browser doesn't have a functioning web.crypto element. Are you viewing this over a secure context?",
    value: window.crypto,
  },
  {
    name: "Web Workers",
    msg: "Your browser doesn't support web workers (sisyphus uses this to avoid freezing your browser). Do you have a plugin like JShelter installed?",
    value: window.Worker,
  },
];

// function showContinueBar(hash: any, nonce: any, t0: number, t1: number) {
//   const barContainer = document.createElement("div");
//   barContainer.style.marginTop = "1rem";
//   barContainer.style.width = "100%";
//   barContainer.style.maxWidth = "32rem";
//   barContainer.style.background = "#3c3836";
//   barContainer.style.borderRadius = "4px";
//   barContainer.style.overflow = "hidden";
//   barContainer.style.cursor = "pointer";
//   barContainer.style.height = "2rem";
//   barContainer.style.marginLeft = "auto";
//   barContainer.style.marginRight = "auto";
//   barContainer.title = "Click to continue";

//   const barInner = document.createElement("div");
//   barInner.className = "bar-inner";
//   barInner.style.display = "flex";
//   barInner.style.alignItems = "center";
//   barInner.style.justifyContent = "center";
//   barInner.style.color = "white";
//   barInner.style.fontWeight = "bold";
//   barInner.style.height = "100%";
//   barInner.style.width = "0";
//   barInner.textContent = "I've finished reading, continue →";

//   barContainer.append(barInner);
//   document.body.append(barContainer);

//   requestAnimationFrame(() => {
//     barInner.style.width = "100%";
//   });

//   barContainer.addEventListener("click", () => {
//     const redir = window.location.href;
//     window.location.replace(
//       u("/.within.website/x/cmd/sisyphus/api/pass-challenge", {
//         response: hash,
//         nonce,
//         redir,
//         elapsedTime: t1 - t0,
//       }),
//     );
//   });
// }

(async () => {
  const status = document.querySelector("#status")!;
  const title = document.querySelector("#title")!;
  const progress: HTMLDivElement = document.querySelector("#progress")!;
  const details = document.querySelector("details");
  let userReadDetails = false;

  if (details) {
    details.addEventListener("toggle", () => {
      if (details.open) {
        userReadDetails = true;
      }
    });
  }

  const ohNoes = ({ titleMsg, statusMsg }: OhNoesParams) => {
    title.innerHTML = titleMsg;
    status.innerHTML = statusMsg;
    progress.style.display = "none";
  };

  if (!window.isSecureContext) {
    ohNoes({
      titleMsg: "Your context is not secure!",
      statusMsg: `Try connecting over HTTPS or let the admin know to set up HTTPS. For more information, see <a href="https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts#when_is_a_context_considered_secure">MDN</a>.`,
    });
    return;
  }

  // const testarea = document.getElementById('testarea');

  // const videoWorks = await testVideo(testarea);
  // console.log(`videoWorks: ${videoWorks}`);

  // if (!videoWorks) {
  //   title.innerHTML = "Oh no!";
  //   status.innerHTML = "Checks failed. Please check your browser's settings and try again.";
  //   image.src = imageURL("reject");
  //   progress.style.display = "none";
  //   return;
  // }

  status.innerHTML = "Calculating...";

  for (const { value, name, msg } of dependencies) {
    if (!value) {
      ohNoes({
        titleMsg: `Missing feature ${name}`,
        statusMsg: msg,
      });
    }
  }

  const { challenge, rules }: sisyphusChallenge = JSON.parse(
    document.querySelector("#sisyphus_challenge")!.textContent!,
  );

  const process = algorithms[rules.algorithm];
  if (!process) {
    ohNoes({
      titleMsg: "Challenge error!",
      statusMsg: `Failed to resolve check algorithm. You may want to reload the page.`,
    });
    return;
  }

  status.innerHTML = `Calculating...<br/>Difficulty: ${rules.report_as}, `;
  progress.style.display = "inline-block";

  // the whole text, including "Speed:", as a single node, because some browsers
  // (Firefox mobile) present screen readers with each node as a separate piece
  // of text.
  const rateText = document.createTextNode("Speed: 0kH/s");
  status.append(rateText);

  let lastSpeedUpdate = 0;
  let showingApology = false;
  const likelihood = 16 ** -rules.report_as;

  try {
    const t0 = Date.now();
    const { hash, nonce } = await process(
      challenge,
      rules.difficulty,
      null,
      (iters: number) => {
        const delta = Date.now() - t0;
        // only update the speed every second so it's less visually distracting
        if (delta - lastSpeedUpdate > 1000) {
          lastSpeedUpdate = delta;
          rateText.data = `Speed: ${(iters / delta).toFixed(3)}kH/s`;
        }
        // the probability of still being on the page is (1 - likelihood) ^ iters.
        // by definition, half of the time the progress bar only gets to half, so
        // apply a polynomial ease-out function to move faster in the beginning
        // and then slow down as things get increasingly unlikely. quadratic felt
        // the best in testing, but this may need adjustment in the future.

        const probability = (1 - likelihood) ** iters;
        const distance = (1 - probability ** 2) * 100;
        progress.ariaValueNow = distance.toString();
        (progress.firstElementChild as HTMLDivElement).style.width =
          `${distance}%`;

        if (probability < 0.1 && !showingApology) {
          status.append(
            document.createElement("br"),
            document.createTextNode(
              "Verification is taking longer than expected. Please do not refresh the page.",
            ),
          );
          showingApology = true;
        }
      },
    );
    const t1 = Date.now();
    console.log({ hash, nonce });

    title.innerHTML = "Success!";
    status.innerHTML = `Done! Took ${t1 - t0}ms, ${nonce} iterations`;
    progress.style.display = "none";

    if (userReadDetails) {
      const container: HTMLDivElement = document.querySelector("#progress")!;

      // Style progress bar as a continue button
      container.style.display = "flex";
      container.style.alignItems = "center";
      container.style.justifyContent = "center";
      container.style.height = "2rem";
      container.style.borderRadius = "1rem";
      container.style.cursor = "pointer";
      container.style.background = "#b16286";
      container.style.color = "white";
      container.style.fontWeight = "bold";
      container.style.outline = "4px solid #b16286";
      container.style.outlineOffset = "2px";
      container.style.width = "min(20rem, 90%)";
      container.style.margin = "1rem auto 2rem";
      container.innerHTML = "I've finished reading, continue →";

      function onDetailsExpand() {
        // const redir = window.location.href;
        // window.location.replace(
        //   u(`${basePrefix}/.within.website/x/cmd/sisyphus/api/pass-challenge`, {
        //     response: hash,
        //     nonce,
        //     redir,
        //     elapsedTime: t1 - t0,
        //   }),
        // );
      }

      container.addEventListener("click", onDetailsExpand);
      setTimeout(onDetailsExpand, 30_000);
    } else {
      // setTimeout(() => {
      //   const redir = window.location.href;
      //   window.location.replace(
      //     u(`${basePrefix}/.within.website/x/cmd/sisyphus/api/pass-challenge`, {
      //       response: hash,
      //       nonce,
      //       redir,
      //       elapsedTime: t1 - t0,
      //     }),
      //   );
      // }, 250);
    }
  } catch (error: any) {
    ohNoes({
      titleMsg: "Calculation error!",
      statusMsg: `Failed to calculate challenge: ${error?.message}`,
    });
  }
})();
