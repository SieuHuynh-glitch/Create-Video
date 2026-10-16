/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(90);
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);
Config.setConcurrency(2); // Giới hạn tối đa 2 luồng Chromium song song - an toàn tuyệt đối cho RAM 16GB
Config.setOffthreadVideoCacheSizeInBytes(1024 * 1024 * 512); // Giới hạn bộ đệm giải mã OffthreadVideo tối đa 512MB

