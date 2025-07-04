import * as SI from "systeminformation";
import { exec } from "child_process";
import byteFormat from "./byteFormat";
import { MetricCtrProps } from "./constants";
import { getDiskSpaceConfig, getGpuConfig } from "./configuration";

/**
 * Converts a byte value into a nicely formatted string.
 * @param bytes The number of bytes to format.
 * @param option An optional options object to customize formatting behavior. By default, it uses binary units, no space,
 * a single unit suffix, and sets the minimum and maximum significant digits to 1 and 4. This object can override these defaults.
 * @returns The formatted byte size as a string.
 */
const pretty = (bytes: number, option: any = {}): string => {
	// Format the bytes using the byteFormat function, merging default options with user-provided ones
	return byteFormat(bytes, {
		binary: true, // Use binary units
		space: false, // Do not add a space before the unit
		single: true, // Use a single unit, e.g., don't display both KB and MB
		minimumFractionDigits: 1, // Minimum fraction digits
		minimumIntegerDigits: 1, // Minimum integer digits
		minimumSignificantDigits: 4, // Minimum significant digits
		maximumSignificantDigits: 4, // Maximum significant digits
		...option, // Override default options with user-provided ones
	});
};

const cpuText = async () => {
	const cl = await SI.currentLoad();
	return `$(pulse)${cl.currentLoad.toLocaleString(undefined, {
		maximumSignificantDigits: 3,
		minimumSignificantDigits: 3,
	})}%`;
};

const memActiveText = async () => {
	const m = await SI.mem();
	let active, total;
	if (Number(pretty(m.total, { suffix: false })) < 100) {
		active = pretty(m.active, {
			minimumSignificantDigits: 3,
			maximumSignificantDigits: 3,
		});
		total = pretty(m.total, {
			minimumSignificantDigits: 3,
			maximumSignificantDigits: 3,
		});
	} else {
		active = pretty(m.active);
		total = pretty(m.total);
	}

	if (active.slice(-1) === total.slice(-1)) {
		return `$(server)${active.slice(0, -1)}/${total}`;
	}
	return `$(server)${active}/${total}`;
};

const memUsedText = async () => {
	const m = await SI.mem();
	let used, total;
	if (Number(pretty(m.total, { suffix: false })) < 100) {
		used = pretty(m.used, {
			minimumSignificantDigits: 3,
			maximumSignificantDigits: 3,
		});
		total = pretty(m.total, {
			minimumSignificantDigits: 3,
			maximumSignificantDigits: 3,
		});
	} else {
		used = pretty(m.used);
		total = pretty(m.total);
	}

	if (used.slice(-1) === total.slice(-1)) {
		return `$(server)${used.slice(0, -1)}/${total}`;
	}
	return `$(server)${used}/${total}`;
};

const netText = async () => {
	const ns = await SI.networkStats();
	return `$(cloud-download)${pretty(
		ns?.[0]?.rx_sec ?? 0
	)}/s $(cloud-upload)${pretty(ns?.[0]?.tx_sec ?? 0)}/s`;
};

/**
 * Retrieves and formats the file system read and write rate information.
 * No parameters.
 * @returns {Promise<string>} A promise that resolves to a formatted string of read and write rates, or an empty string if the data is unavailable or invalid.
 */
const fsText = async () => {
    // Fetches file system statistics
	const fs = await SI.fsStats();

    // Formats and returns the read and write rate information
	return `$(log-in)${pretty(fs.wx_sec ?? 0)}/s $(log-out)${pretty(
		fs.rx_sec ?? 0
	)}/s`;
};

const batteryText = async () => {
	const b = await SI.battery();
	if (!b.hasBattery) {
		return "";
	}
	return `$(plug)${b.percent}%${b.isCharging ? "(Charging)" : ""}`;
};

const cpuSpeedText = async () => {
	let cpuCurrentSpeed = await SI.cpuCurrentSpeed();
	return `$(dashboard) ${cpuCurrentSpeed.avg}GHz`;
};

const cpuTempText = async () => {
	const cl = await SI.cpuTemperature();
	if (!cl.main) {
		return "";
	}
	return `$(thermometer)${cl.main}°C`;
};

const osDistroText = async () => {
	const os = await SI.osInfo();
	return `${os.distro}`;
};

const diskSpaceText = async () => {
    const fsSize = await SI.fsSize();
	const disksToShow = getDiskSpaceConfig();

    if (disksToShow.includes('all') && fsSize.length > 0) {
        return fsSize.map(disk => {
            const total = disk.size;
            const used = disk.used;
            const usedPercentage = (used / total * 100).toFixed(1);
            return `$(database)${disk.mount} ${usedPercentage}% ${pretty(used)}/${pretty(total)}`;
        }).join(' | ');
    }
    return fsSize
        .filter(disk => disksToShow.includes(disk.mount))
        .map(disk => {
            const total = disk.size;
            const used = disk.used;
            const usedPercentage = (used / total * 100).toFixed(1);
            return `$(database)${disk.mount} ${usedPercentage}% ${pretty(used)}/${pretty(total)}`;
        }).join(' | ');
};

const uptimeText = async () => {
	const uptime = await SI.time();
	const days = Math.floor(uptime.uptime / (24 * 3600));
	const hours = Math.floor((uptime.uptime % (24 * 3600)) / 3600);
	const minutes = Math.floor((uptime.uptime % 3600) / 60);
	return `$(clock) ${days}d ${hours}h ${minutes}m`;
};

// GPU数据缓存机制，避免频繁调用nvidia-smi
let gpuDataCache: {[key: string]: {data: string, timestamp: number}} = {};
const CACHE_DURATION = 1000; // 1秒缓存

/**
 * 检测当前系统是否为Ubuntu，并检查NVIDIA驱动状态
 */
const checkUbuntuGpuSupport = async (): Promise<boolean> => {
	return new Promise(async (resolve) => {
		// 检查是否为Linux系统
		const os = await SI.osInfo();
		if (os.platform !== 'linux') {
			resolve(false);
			return;
		}
		
		// 检查nvidia-smi是否可用
		exec('which nvidia-smi', (error: any) => {
			if (error) {
				resolve(false);
				return;
			}
			
			// 检查nvidia-smi是否能正常执行
			exec('nvidia-smi -L', { timeout: 3000 }, (error: any, stdout: string) => {
				resolve(!error && stdout.includes('GPU'));
			});
		});
	});
};

/**
 * 获取可用GPU列表 (Ubuntu优化)
 */
const getAvailableGpus = async (): Promise<number> => {
	return new Promise((resolve) => {
		exec('nvidia-smi -L', { timeout: 3000 }, (error: any, stdout: string) => {
			if (error) {
				resolve(0);
				return;
			}
			const gpuCount = (stdout.match(/GPU \d+:/g) || []).length;
			resolve(gpuCount);
		});
	});
};

/**
 * 执行 nvidia-smi 命令获取 GPU 信息 (Ubuntu优化版本)
 */
const executeNvidiaSmi = async (query: string): Promise<string> => {
	return new Promise((resolve) => {
		const command = `nvidia-smi --query-gpu=${query} --format=csv,noheader,nounits`;
		
		exec(command, { timeout: 5000 }, (error: any, stdout: string, stderr: string) => {
			if (error) {
				// Ubuntu特定错误处理
				if (error.code === 'ENOENT') {
					// console.debug('nvidia-smi command not found. NVIDIA drivers may not be installed.');
				} else if (error.code === 127) {
					// console.debug('nvidia-smi not in PATH. Please ensure NVIDIA drivers are properly installed.');
				} else if (stderr && stderr.includes('permission')) {
					// console.debug('Permission denied accessing GPU. Try running VS Code with appropriate permissions.');
				} else {
					// console.debug(`GPU monitoring error: ${error.message}`);
				}
				resolve('');
				return;
			}
			resolve(stdout.trim());
		});
	});
};

/**
 * 带缓存的nvidia-smi执行函数
 */
const executeNvidiaSmiCached = async (query: string): Promise<string> => {
	const now = Date.now();
	const cacheKey = query;
	
	if (gpuDataCache[cacheKey] && (now - gpuDataCache[cacheKey].timestamp) < CACHE_DURATION) {
		return gpuDataCache[cacheKey].data;
	}
	
	const result = await executeNvidiaSmi(query);
	gpuDataCache[cacheKey] = { data: result, timestamp: now };
	
	return result;
};

/**
 * GPU 利用率监控 (Ubuntu优化版本)
 */
const gpuUtilizationText = async () => {
	try {
		// 使用缓存版本的nvidia-smi调用
		const utilization = await executeNvidiaSmiCached('utilization.gpu');
		if (!utilization) return '';
		
		const gpuIndex = getGpuConfig();
		const values = utilization.split('\n').filter(v => v.trim() !== '');
		const targetValue = values[gpuIndex] || values[0];
		
		return `$(chip)${targetValue}%`;
	} catch (error) {
		return '';
	}
};

/**
 * GPU 内存使用监控 (Ubuntu优化版本)
 */
const gpuMemoryText = async () => {
	try {
		// 使用缓存版本的nvidia-smi调用
		const memoryUsed = await executeNvidiaSmiCached('memory.used');
		const memoryTotal = await executeNvidiaSmiCached('memory.total');
		
		if (!memoryUsed || !memoryTotal) return '';
		
		const gpuIndex = getGpuConfig();
		const usedValues = memoryUsed.split('\n').filter(v => v.trim() !== '');
		const totalValues = memoryTotal.split('\n').filter(v => v.trim() !== '');
		
		const used = parseInt(usedValues[gpuIndex] || usedValues[0]);
		const total = parseInt(totalValues[gpuIndex] || totalValues[0]);
		
		const usedFormatted = pretty(used * 1024 * 1024); // 转换为字节
		const totalFormatted = pretty(total * 1024 * 1024);
		
		return `$(repo)${usedFormatted}/${totalFormatted}`;
	} catch (error) {
		return '';
	}
};

/**
 * GPU 温度监控 (Ubuntu优化版本)
 */
const gpuTemperatureText = async () => {
	try {
		// 使用缓存版本的nvidia-smi调用
		const temperature = await executeNvidiaSmiCached('temperature.gpu');
		if (!temperature) return '';
		
		const gpuIndex = getGpuConfig();
		const values = temperature.split('\n').filter(v => v.trim() !== '');
		const targetValue = values[gpuIndex] || values[0];
		
		return `$(flame)${targetValue}°C`;
	} catch (error) {
		return '';
	}
};

const metrics: MetricCtrProps[] = [
	{
		func: cpuText,
		section: "cpu",
	},
	{
		func: memActiveText,
		section: "memoryActive",
	},
	{
		func: memUsedText,
		section: "memoryUsed",
	},
	{
		func: netText,
		section: "network",
	},
	{
		func: fsText,
		section: "fileSystem",
	},
	{
		func: batteryText,
		section: "battery",
	},
	{
		func: cpuTempText,
		section: "cpuTemp",
	},
	{
		func: cpuSpeedText,
		section: "cpuSpeed",
	},
	{
		func: osDistroText,
		section: "osDistro",
	},
	{
		func: diskSpaceText,
		section: "diskSpace",
	},
	{
        func: uptimeText,
        section: "uptime",
    },
	{
		func: gpuUtilizationText,
		section: "gpuUtilization",
	},
	{
		func: gpuMemoryText,
		section: "gpuMemory",
	},
	{
		func: gpuTemperatureText,
		section: "gpuTemperature",
	},
];

export default metrics;