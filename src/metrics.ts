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
  // return `$(pulse)${cl.currentLoad.toLocaleString(undefined, {
  //   maximumSignificantDigits: 3,
  //   minimumSignificantDigits: 3,
  // })}%`;
  const value = cl.currentLoad.toFixed(2); // e.g. "3.21"
  // !! 如果整数部分不足两位，前面补数字等宽空格（Figure Space） \u2007
  const padded = value.padStart(5, "\u2007");   // "3.21" -> "03.21"
  return `$(pulse)${padded}%`;
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
    return `$(server) ${active.slice(0, -1)} / ${total}`;
  }
  return `$(server) ${active} / ${total}`;
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
  )}/s  $(cloud-upload)${pretty(ns?.[0]?.tx_sec ?? 0)}/s`;
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
  return `$(log-in)${pretty(fs.wx_sec ?? 0)}/s  $(log-out)${pretty(
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
  // !! 固定保持两位小数
  return `$(dashboard) ${cpuCurrentSpeed.avg.toFixed(2)}GHz`;
};

const cpuTempText = async () => {
  const cl = await SI.cpuTemperature();
  if (!cl.main) {
    return "";
  }
  // !! 固定保持一位小数
  return `$(thermometer)${cl.main.toFixed(1)}°C`;
};

const osDistroText = async () => {
  const os = await SI.osInfo();
  return `${os.distro}`;
};

const diskSpaceText = async () => {
  const fsSize = await SI.fsSize();
  const disksToShow = getDiskSpaceConfig();

  const GB = 1024 ** 3;
  const MIN_DISK_SIZE = 256 * GB;

  function isRealDisk(d: any) {
    const t = (d.type || '').toLowerCase();   // ext4/xfs/btrfs/lvm 等
    const fs = (d.fs || '').toLowerCase();    // /dev/mapper/xxx 或 /dev/nvme0n1p2
    const m = d.mount || '';

    // 1) 排除伪文件系统类型
    const EXCLUDE_TYPES = new Set([
      'tmpfs', 'devtmpfs', 'overlay', 'squashfs', 'ramfs', 'aufs', 'efivarfs',
      'proc', 'sysfs', 'pstore', 'bpf', 'tracefs', 'cgroup', 'cgroup2',
      'securityfs', 'configfs', 'fusectl', 'autofs', 'debugfs'
    ]);
    if (EXCLUDE_TYPES.has(t)) return false;

    // 2) 排除典型的挂载点前缀（运行区、设备、snap、docker 等）
    const EXCLUDE_MOUNT_PREFIX = ['/run', '/sys', '/dev', '/proc', '/snap', '/var/lib/docker', '/var/snap'];
    if (EXCLUDE_MOUNT_PREFIX.some(p => m.startsWith(p))) return false;

    // 3) 要么是块设备路径，要么是常见本地 FS 类型（允许 LVM、ext、xfs、btrfs、zfs）
    const isBlock = fs.startsWith('/dev/');
    const looksLocalFs = /ext\d|xfs|btrfs|zfs/.test(t);
    return isBlock || looksLocalFs;
  }

  // 候选：真实磁盘 + 容量≥256GB
  const candidates = fsSize.filter(d => isRealDisk(d) && d.size >= MIN_DISK_SIZE);

  if (candidates.length === 0) {
    return 'No disk >= 256GB';
  }

  // 取最大容量的那块盘/分区
  const largest = candidates.reduce((a, b) => (b.size > a.size ? b : a));
  const usedPct = ((largest.used / largest.size) * 100).toFixed(1);

  // 想带挂载点就用：`$(database)${largest.mount} ${usedPct}%`
  return `$(database)${usedPct}%`;


  // if (disksToShow.includes('all') && fsSize.length > 0) {
  //   // !! 对 fsSize 进行一次过滤，每个 disk 的 total 是 bytes 如果 total < 256 GB 则直接跳过不显示
  //   return fsSize.filter(disk => disk.size >= 256 * 1024 * 1024 * 1024).map(disk => {
  //     const total = disk.size;
  //     const used = disk.used;
  //     const usedPercentage = (used / total * 100).toFixed(1);
  //     // return `$(database)${disk.mount} ${usedPercentage}% ${pretty(used)}/${pretty(total)}`;

  //     return `$(database)${usedPercentage}%`;
  //   }).join(' | ');
  // }
  // return fsSize
  //   .filter(disk => disksToShow.includes(disk.mount)).filter(disk => disk.size >= 256 * 1024 * 1024 * 1024)
  //   .map(disk => {
  //     const total = disk.size;
  //     const used = disk.used;
  //     const usedPercentage = (used / total * 100).toFixed(1);
  //     // return `$(database)${disk.mount} ${usedPercentage}% ${pretty(used)}/${pretty(total)}`;
  //     return `$(database)${usedPercentage}%`;
  //   }).join(' | ');
};

const uptimeText = async () => {
  const uptime = await SI.time();
  const days = Math.floor(uptime.uptime / (24 * 3600));
  const hours = Math.floor((uptime.uptime % (24 * 3600)) / 3600);
  const minutes = Math.floor((uptime.uptime % 3600) / 60);
  return `$(clock) ${days}d ${hours}h ${minutes}m`;
};

// GPU数据缓存机制，避免频繁调用nvidia-smi
let gpuDataCache: { [key: string]: { data: string, timestamp: number } } = {};
const CACHE_DURATION = 250; // 0.25秒缓存

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

    exec(command, { timeout: 3000 }, (error: any, stdout: string, stderr: string) => {
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
    if (values[1]) {
      // !! 补空格防止跳动，前面补数字等宽空格（Figure Space） \u2007
      const targetValue = values[0].padStart(2, "\u2007");
      const targetValue2 = values[1].padStart(2, "\u2007");
      return `$(chip)[ ${targetValue}% ][ ${targetValue2}% ]`;
    } else if (values[0]) {
      const targetValue = values[0].padStart(2, "\u2007");
      return `$(chip)${targetValue}%`;
    } else {
      return "error";
    }


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

    if (usedValues[1]) {
      // !! 只显示显存占用
      const used1 = parseInt(usedValues[0]);
      // const total1 = parseInt(totalValues[0] || totalValues[0]);
      const used2 = parseInt(usedValues[1]);
      // const total2 = parseInt(totalValues[1] || totalValues[0]);

      const usedFormatted1 = pretty(used1 * 1024 * 1024);
      // const totalFormatted1 = pretty(total1 * 1024 * 1024);
      const usedFormatted2 = pretty(used2 * 1024 * 1024);
      // const totalFormatted2 = pretty(total2 * 1024 * 1024);

      return `$(repo)[ ${usedFormatted1} ][ ${usedFormatted2} ]`;

      // return `$(repo)[ ${usedFormatted1} / ${totalFormatted1} ][ ${usedFormatted2} / ${totalFormatted2} ]`;
    } else if (usedValues[0]) {
      const used = parseInt(usedValues[0]);
      const total = parseInt(totalValues[0]);

      const usedFormatted = pretty(used * 1024 * 1024); // 转换为字节
      const totalFormatted = pretty(total * 1024 * 1024);

      return `$(repo)${usedFormatted} / ${totalFormatted}`;
    } else {
      return "error";
    }

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
    if (values[1]) {
      const targetValue = values[0];
      const targetValue2 = values[1];
      return `$(flame)[ ${targetValue}°C ][ ${targetValue2}°C ]`;
    } else if (values[0]) {
      const targetValue = values[0];
      return `$(flame)${targetValue}°C`;
    } else {
      return "error";
    }


  } catch (error) {
    return '';
  }
};

const metrics: MetricCtrProps[] = [
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
  // !! 去掉不用的
  // {
  //   func: batteryText,
  //   section: "battery",
  // },
  {
    func: cpuText,
    section: "cpu",
  },
  {
    func: cpuTempText,
    section: "cpuTemp",
  },
  {
    func: cpuSpeedText,
    section: "cpuSpeed",
  },
  // {
  //   func: osDistroText,
  //   section: "osDistro",
  // },
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