import { Config } from "@remotion/cli/config";

// PNG frames + a low CRF: the video is terminal text over soft gradients, which
// is exactly where JPEG frames smear edges and band.
Config.setVideoImageFormat("png");
Config.setCrf(18);
Config.setOverwriteOutput(true);
