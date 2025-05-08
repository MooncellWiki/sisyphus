<script setup lang="ts">
import {
  darkTheme,
  NA,
  NConfigProvider,
  NH1,
  NLayout,
  NLayoutFooter,
  NModal,
  NP,
  NProgress,
  NText,
} from "naive-ui";
import { onMounted, ref } from "vue";
import processFast from "./sisyphus/proof-of-work";
import processSlow from "./sisyphus/proof-of-work-slow";

const props = defineProps<{
  title: string;
  basePrefix: string | null;
  challengeData: ChallengeData | null;
}>();

const preferColorSchemeQuery = window.matchMedia(
  "(prefers-color-scheme: dark)",
);
preferColorSchemeQuery.onchange = (e) => {
  useDarkTheme.value = e.matches;
};
const useDarkTheme = ref(preferColorSchemeQuery.matches);
const titleText = ref(props.title);
const statusText = ref("Calculating...");
const progressVisible = ref(false);
const progressValue = ref(0);
const progressLabel = ref("0");
const showContinue = ref(false);
const challengeError = ref(false);
const result = ref({
  hash: "",
  nonce: 0,
  elapsedTime: 0,
});
const showModal = ref(false);

const algorithms = {
  fast: processFast,
  slow: processSlow,
};

interface OhNoesParams {
  titleMsg: string;
  statusMsg: string;
}

interface ChallengeData {
  challenge: string;
  rules: {
    algorithm: keyof typeof algorithms;
    difficulty: number;
    report_as: number;
  };
}

const u = (url: string, params: Record<string, string | number>) => {
  let result = new URL(url, window.location.href);
  Object.entries(params).forEach(([k, v]) =>
    result.searchParams.set(k, v.toString()),
  );
  return result.toString();
};

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

function ohNoes({ titleMsg, statusMsg }: OhNoesParams) {
  titleText.value = titleMsg;
  statusText.value = statusMsg;
  progressVisible.value = false;
  challengeError.value = true;
}

async function handleChallenge() {
  if (!window.isSecureContext) {
    ohNoes({
      titleMsg: "Your context is not secure!",
      statusMsg: `Try connecting over HTTPS or let the admin know to set up HTTPS. For more information, see <NA href="https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts#when_is_a_context_considered_secure">MDN</NA>.`,
    });
    return;
  }

  for (const { value, name, msg } of dependencies) {
    if (!value) {
      ohNoes({
        titleMsg: `Missing feature ${name}`,
        statusMsg: msg,
      });
      return;
    }
  }

  if (!props.challengeData) {
    ohNoes({
      titleMsg: "Challenge error!",
      statusMsg: `Failed to load challenge data. You may want to reload the page.`,
    });
    return;
  }

  const { challenge, rules } = props.challengeData;
  const process = algorithms[rules.algorithm];
  if (!process) {
    ohNoes({
      titleMsg: "Challenge error!",
      statusMsg: `Failed to resolve check algorithm. You may want to reload the page.`,
    });
    return;
  }

  progressVisible.value = true;
  progressValue.value = 0;
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
        if (delta - lastSpeedUpdate > 1000) {
          lastSpeedUpdate = delta;
          progressLabel.value = (iters / delta).toFixed(3);
        }
        const probability = (1 - likelihood) ** iters;
        const distance = (1 - probability ** 2) * 100;
        progressValue.value = distance;

        if (probability < 0.1 && !showingApology) {
          statusText.value +=
            "\nVerification is taking longer than expected. Please do not refresh the page.";
          showingApology = true;
        }
      },
    );
    const t1 = Date.now();

    titleText.value = "Success!";
    statusText.value = `Done! Took ${t1 - t0}ms, ${nonce} iterations`;
    progressVisible.value = false;
    result.value = {
      hash,
      nonce,
      elapsedTime: t1 - t0,
    };

    showContinue.value = showModal.value;
    setTimeout(submitResult, showModal.value ? 30000 : 250);
  } catch (error: any) {
    ohNoes({
      titleMsg: "Calculation error!",
      statusMsg: `Failed to calculate challenge: ${error?.message}`,
    });
  }
}

function submitResult() {
  const { hash, nonce, elapsedTime } = result.value;
  const redir = window.location.href;
  window.location.replace(
    u(`${props.basePrefix}/.within.website/x/cmd/sisyphus/api/pass-challenge`, {
      response: hash,
      nonce,
      redir,
      elapsedTime,
    }),
  );
}

function onDetailClicked() {
  showModal.value = !showModal.value;
}

onMounted(() => {
  handleChallenge();
});
</script>

<template>
  <NConfigProvider abstract :theme="useDarkTheme ? darkTheme : null">
    <NLayout content-class="min-h-screen flex flex-col">
      <div class="sisyphus-content">
        <NH1>{{ titleText }}</NH1>
        <NText>{{ statusText }}</NText>
        <NProgress
          class="max-w-3xl"
          v-if="progressVisible"
          type="line"
          status="info"
          :percentage="Math.round(progressValue)"
          indicator-placement="inside"
        />
        <NText v-if="progressVisible">
          Difficulty: {{ props.challengeData?.rules.report_as }}, Speed:
          {{ progressLabel }}kH/s
        </NText>

        <NModal v-model:show="showModal" preset="dialog">
          <template #header>
            <NText>Why am i seeing this?</NText>
          </template>
          <NP>
            You are seeing this because the administrator of this website has
            set up
            <NA href="https://github.com/MooncellWiki/sisyphus">sisyphus</NA>
            to protect the server against the scourge of
            <NA
              href="https://thelibre.news/foss-infrastructure-is-under-attack-by-ai-companies/"
            >
              AI companies aggressively scraping websites </NA
            >. This can and does cause downtime for the websites, which makes
            their resources inaccessible for everyone.
          </NP>
          <NP>
            sisyphus is a compromise. sisyphus uses a
            <NA
              href="https://sisyphus.techaro.lol/docs/design/why-proof-of-work"
              >Proof-of-Work</NA
            >
            scheme in the vein of
            <NA href="https://en.wikipedia.org/wiki/Hashcash">Hashcash</NA>, a
            proposed proof-of-work scheme for reducing email spam. The idea is
            that at individual scales the additional load is ignorable, but at
            mass scraper levels it adds up and makes scraping much more
            expensive.
          </NP>
          <NP>
            Ultimately, this is a hack whose real purpose is to give a "good
            enough" placeholder solution so that more time can be spent on
            fingerprinting and identifying headless browsers (EG: via how they
            do font rendering) so that the challenge proof of work page doesn't
            need to be presented to users that are much more likely to be
            legitimate.
          </NP>
          <NP>
            Please note that sisyphus requires the use of modern JavaScript
            features that plugins like
            <NA href="https://jshelter.org/">JShelter</NA> will disable. Please
            disable JShelter or other such plugins for this domain.
          </NP>
        </NModal>
        <NA @click="onDetailClicked"> Why am I seeing this? </NA>
        <div id="testarea"></div>
        <div
          v-if="showContinue"
          @click="submitResult"
          class="sisyphus-continue-btn"
        >
          I've finished reading, continue →
        </div>
      </div>

      <NLayoutFooter bordered class="p-5">
        <div class="flex flex-col items-center justify-center">
          <NText v-if="props.challengeData"
            >Challenge: {{ props.challengeData?.challenge }}</NText
          >
          <NText>
            Protected by
            <NA href="https://github.com/MooncellWiki/sisyphus">Sisyphus</NA>
            from
            <NA href="https://mooncell.wiki">Mooncell Wiki</NA>.
          </NText>
        </div>
      </NLayoutFooter>
    </NLayout>
  </NConfigProvider>
</template>

<style scoped lang="scss">
.sisyphus {
  &-content {
    @apply flex flex-1 items-center justify-center flex-col;
  }

  &-progress-label {
    @apply text-sm text-center mb-6;
  }

  &-continue-btn {
    @apply flex items-center justify-center h-10 rounded-full cursor-pointer;
    @apply bg-gray-600 text-white font-bold py-2 px-4;
    @apply outline outline-4 outline-gray-600 outline-offset-2;
    @apply w-4/5 max-w-80 mx-auto my-6 hover:bg-gray-700;
  }
}
</style>
