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
import { useI18n } from "vue-i18n";
import processFast from "./sisyphus/proof-of-work";
import processSlow from "./sisyphus/proof-of-work-slow";

const { t } = useI18n();

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
const statusText = ref(t("common.calculating"));
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
    msg: t("dependencies.missingWebCrypto"),
    value: window.crypto,
  },
  {
    name: "Web Workers",
    msg: t("dependencies.missingWebWorkers"),
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
      titleMsg: t("errors.insecureContext"),
      statusMsg: t("errors.insecureContextMessage"),
    });
    return;
  }

  for (const { value, name, msg } of dependencies) {
    if (!value) {
      ohNoes({
        titleMsg: t("errors.missingFeature", { name }),
        statusMsg: msg,
      });
      return;
    }
  }

  if (!props.challengeData) {
    ohNoes({
      titleMsg: t("common.challengeError"),
      statusMsg: t("errors.loadChallenge"),
    });
    return;
  }

  const { challenge, rules } = props.challengeData;
  const process = algorithms[rules.algorithm];
  if (!process) {
    ohNoes({
      titleMsg: t("common.challengeError"),
      statusMsg: t("errors.resolveAlgorithm"),
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
          statusText.value += "\n" + t("errors.longVerification");
          showingApology = true;
        }
      },
    );
    const t1 = Date.now();

    titleText.value = t("common.success");
    statusText.value = t("progress.completed", { time: t1 - t0, nonce });
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
      titleMsg: t("common.calculationError"),
      statusMsg: t("errors.calculationFailed", { message: error?.message }),
    });
  }
}

function submitResult() {
  const { hash, nonce, elapsedTime } = result.value;
  const redir = window.location.href;
  // window.location.replace(
  //   u(`${props.basePrefix}/.within.website/x/cmd/sisyphus/api/pass-challenge`, {
  //     response: hash,
  //     nonce,
  //     redir,
  //     elapsedTime,
  //   }),
  // );
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
        <NText v-html="statusText"></NText>
        <NProgress
          class="max-w-3xl"
          v-if="progressVisible"
          type="line"
          status="info"
          :percentage="Math.round(progressValue)"
          indicator-placement="inside"
        />
        <NText v-if="progressVisible"
          >{{
            $t("progress.difficulty", {
              difficulty: props.challengeData?.rules.report_as,
              speed: progressLabel,
            })
          }}
        </NText>

        <NModal v-model:show="showModal" preset="dialog">
          <template #header>
            <NText>{{ $t("modal.title") }}</NText>
          </template>
          <i18n-t keypath="modal.paragraph1" :tag="NP">
            <NA href="https://github.com/MooncellWiki/sisyphus">Sisyphus</NA>
            <NA
              href="https://thelibre.news/foss-infrastructure-is-under-attack-by-ai-companies/"
            >
              AI companies aggressively scraping websites
            </NA>
          </i18n-t>

          <i18n-t keypath="modal.paragraph2" :tag="NP">
            <NA href="https://anubis.techaro.lol/docs/design/why-proof-of-work"
              >Proof-of-Work</NA
            >
            <NA href="https://en.wikipedia.org/wiki/Hashcash">Hashcash</NA>
          </i18n-t>

          <NP>{{ $t("modal.paragraph3") }}</NP>

          <i18n-t keypath="modal.paragraph4" :tag="NP">
            <NA href="https://jshelter.org/">JShelter</NA>
          </i18n-t>
        </NModal>
        <NA @click="onDetailClicked">{{ $t("common.whySeeing") }}</NA>
        <div id="testarea"></div>
        <div
          v-if="showContinue"
          @click="submitResult"
          class="sisyphus-continue-btn"
        >
          {{ $t("common.continueReading") }}
        </div>
      </div>

      <NLayoutFooter bordered class="p-5">
        <div class="flex flex-col items-center justify-center">
          <NText v-if="props.challengeData">
            {{
              $t("common.challenge", {
                challenge: props.challengeData?.challenge,
              })
            }}</NText
          >

          <i18n-t keypath="common.protectedBy" :tag="NText">
            <NA href="https://github.com/MooncellWiki/sisyphus">Sisyphus</NA>
            <NA href="https://project.mooncell.wiki">Mooncell Wiki</NA>
          </i18n-t>
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
