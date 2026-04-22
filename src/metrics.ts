import * as SI from "systeminformation";
import { exec, spawn, ChildProcess } from "child_process";
import byteFormat from "./byteFormat";
import { MetricCtrProps } from "./constants";
import { getDiskSpaceConfig } from "./configuration";

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

// 常驻 nvidia-smi 进程，持续输出 GPU 数据
interface GpuSnapshot {
  utilization: string[];
  memoryUsed: string[];
  memoryTotal: string[];
  temperature: string[];
}

const ALL_GPU_FIELDS = 'utilization.gpu,memory.used,memory.total,temperature.gpu';
const GPU_LOOP_MS = 500;

let gpuSnapshot: GpuSnapshot = { utilization: [], memoryUsed: [], memoryTotal: [], temperature: [] };
let nvidiaSmiProcess: ChildProcess | null = null;
let gpuDaemonStarted = false;

function parseGpuOutput(block: string): GpuSnapshot {
  const utilization: string[] = [];
  const memoryUsed: string[] = [];
  const memoryTotal: string[] = [];
  const temperature: string[] = [];

  for (const line of block.split('\n')) {
    const parts = line.split(',').map(s => s.trim());
    if (parts.length >= 4) {
      utilization.push(parts[0]);
      memoryUsed.push(parts[1]);
      memoryTotal.push(parts[2]);
      temperature.push(parts[3]);
    }
  }
  return { utilization, memoryUsed, memoryTotal, temperature };
}

function startGpuDaemon() {
  if (gpuDaemonStarted) return;
  gpuDaemonStarted = true;

  const proc = spawn('nvidia-smi', [
    `--query-gpu=${ALL_GPU_FIELDS}`,
    '--format=csv,noheader,nounits',
    `--loop-ms=${GPU_LOOP_MS}`,
  ], { stdio: ['ignore', 'pipe', 'ignore'] });

  nvidiaSmiProcess = proc;

  let buffer = '';
  proc.stdout!.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop()!;

    const block = lines.filter(l => l.trim()).join('\n');
    if (block) {
      gpuSnapshot = parseGpuOutput(block);
    }
  });

  proc.on('error', () => {
    nvidiaSmiProcess = null;
    gpuDaemonStarted = false;
  });

  proc.on('exit', () => {
    nvidiaSmiProcess = null;
    gpuDaemonStarted = false;
  });
}

export function stopGpuDaemon() {
  if (nvidiaSmiProcess) {
    nvidiaSmiProcess.kill();
    nvidiaSmiProcess = null;
  }
  gpuDaemonStarted = false;
}

function getGpuSnapshot(): GpuSnapshot {
  startGpuDaemon();
  return gpuSnapshot;
}

const gpuUtilizationText = async () => {
  try {
    const snap = getGpuSnapshot();
    const values = snap.utilization;
    if (values.length === 0) return '';

    if (values[1]) {
      const v0 = values[0].padStart(2, ' ');
      const v1 = values[1].padStart(2, ' ');
      return `$(chip)[ ${v0}% ][ ${v1}% ]`;
    } else {
      const v0 = values[0].padStart(2, ' ');
      return `$(chip)${v0}%`;
    }
  } catch (error) {
    return '';
  }
};

const gpuMemoryText = async () => {
  try {
    const snap = getGpuSnapshot();
    const usedValues = snap.memoryUsed;
    const totalValues = snap.memoryTotal;
    if (usedValues.length === 0) return '';

    if (usedValues[1]) {
      const used1 = parseInt(usedValues[0]);
      const used2 = parseInt(usedValues[1]);
      const usedFormatted1 = pretty(used1 * 1024 * 1024);
      const usedFormatted2 = pretty(used2 * 1024 * 1024);
      return `$(repo)[ ${usedFormatted1} ][ ${usedFormatted2} ]`;
    } else if (usedValues[0]) {
      const used = parseInt(usedValues[0]);
      const total = parseInt(totalValues[0]);
      const usedFormatted = pretty(used * 1024 * 1024);
      const totalFormatted = pretty(total * 1024 * 1024);
      return `$(repo)${usedFormatted} / ${totalFormatted}`;
    } else {
      return 'error';
    }
  } catch (error) {
    return '';
  }
};

const gpuTemperatureText = async () => {
  try {
    const snap = getGpuSnapshot();
    const values = snap.temperature;
    if (values.length === 0) return '';

    if (values[1]) {
      return `$(flame)[ ${values[0]}°C ][ ${values[1]}°C ]`;
    } else {
      return `$(flame)${values[0]}°C`;
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