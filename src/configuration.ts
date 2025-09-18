import { workspace } from "vscode";
import { MetricsExist } from "./constants";
export const getRefreshInterval = () =>
  workspace.getConfiguration().get<number>("monitor-max.refresh-interval") ??
  250;

export const getMetrics = workspace
  .getConfiguration()
  .get("monitor-max.metrics") as MetricsExist[];
export const getDiskSpaceConfig = () =>
  workspace.getConfiguration().get<string[]>("monitor-max.diskSpace") ?? ["/"];

export const getGpuConfig = () =>
  workspace.getConfiguration().get<number>("monitor-max.gpuIndex") ?? 0;

export const getGpuEnabledConfig = () =>
  workspace.getConfiguration().get<boolean>("monitor-max.gpuEnabled") ?? true;

export const getGpuAutoDetectConfig = () =>
  workspace.getConfiguration().get<boolean>("monitor-max.gpuAutoDetect") ?? true;

export { MetricsExist };
