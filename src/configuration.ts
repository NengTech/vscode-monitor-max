import { workspace } from "vscode";
import { MetricsExist } from "./constants";
export const getRefreshInterval = () =>
	workspace.getConfiguration().get<number>("monitor-ultra.refresh-interval") ??
	1000;

export const getMetrics = workspace
	.getConfiguration()
	.get("monitor-ultra.metrics") as MetricsExist[];
export const getDiskSpaceConfig = () =>
	workspace.getConfiguration().get<string[]>("monitor-ultra.diskSpace") ?? ["/"];

export const getGpuConfig = () =>
	workspace.getConfiguration().get<number>("monitor-ultra.gpuIndex") ?? 0;

export const getGpuEnabledConfig = () =>
	workspace.getConfiguration().get<boolean>("monitor-ultra.gpuEnabled") ?? true;

export const getGpuAutoDetectConfig = () =>
	workspace.getConfiguration().get<boolean>("monitor-ultra.gpuAutoDetect") ?? true;

export { MetricsExist };
