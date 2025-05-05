const videoElement = `<video id="videotest" width="0" height="0" src="/.within.website/x/cmd/sisyphus/static/testdata/black.mp4"></video>`;

export const testVideo = async (testarea: HTMLVideoElement) => {
  testarea.innerHTML = videoElement;
  return await new Promise((resolve) => {
    const video = document.querySelector("#videotest")!;
    video.addEventListener("canplay", () => {
      testarea.style.display = "none";
      resolve(true);
    });
    video.addEventListener("error", () => {
      testarea.style.display = "none";
      resolve(false);
    });
  });
};
