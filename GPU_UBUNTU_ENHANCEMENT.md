# GPU监控功能Ubuntu优化方案

## 项目现状分析

通过代码审查发现，项目中GPU监控功能已经基本实现，包括：
- GPU利用率监控 (`gpuUtilizationText`)
- GPU内存使用监控 (`gpuMemoryText`) 
- GPU温度监控 (`gpuTemperatureText`)
- 基于`nvidia-smi`命令的数据获取机制

但针对Ubuntu Linux系统，还需要以下优化和增强。

## Ubuntu系统特定优化

### 1. 权限检查和处理

在Ubuntu系统中，`nvidia-smi`命令可能需要特定权限，需要改进错误处理：

#### 1.1 修改 `src/metrics.ts` - 增强错误处理
```typescript
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
					console.debug('nvidia-smi command not found. NVIDIA drivers may not be installed.');
				} else if (error.code === 127) {
					console.debug('nvidia-smi not in PATH. Please ensure NVIDIA drivers are properly installed.');
				} else if (stderr.includes('permission')) {
					console.debug('Permission denied accessing GPU. Try running VS Code with appropriate permissions.');
				} else {
					console.debug(`GPU monitoring error: ${error.message}`);
				}
				resolve('');
				return;
			}
			resolve(stdout.trim());
		});
	});
};
```

### 2. Ubuntu系统检测和适配

#### 2.1 添加系统检测函数
在 `src/metrics.ts` 中添加：

```typescript
/**
 * 检测当前系统是否为Ubuntu，并检查NVIDIA驱动状态
 */
const checkUbuntuGpuSupport = async (): Promise<boolean> => {
	return new Promise((resolve) => {
		// 检查是否为Linux系统
		const os = require('os');
		if (os.platform() !== 'linux') {
			resolve(false);
			return;
		}
		
		// 检查nvidia-smi是否可用
		exec('which nvidia-smi', (error) => {
			if (error) {
				resolve(false);
				return;
			}
			
			// 检查nvidia-smi是否能正常执行
			exec('nvidia-smi -L', { timeout: 3000 }, (error, stdout) => {
				resolve(!error && stdout.includes('GPU'));
			});
		});
	});
};
```

### 3. GPU检测增强

#### 3.1 多GPU支持优化
```typescript
/**
 * 获取可用GPU列表 (Ubuntu优化)
 */
const getAvailableGpus = async (): Promise<number> => {
	return new Promise((resolve) => {
		exec('nvidia-smi -L', { timeout: 3000 }, (error, stdout) => {
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
 * GPU利用率监控 (Ubuntu优化版本)
 */
const gpuUtilizationText = async () => {
	try {
		// 首先检查GPU支持
		const hasGpuSupport = await checkUbuntuGpuSupport();
		if (!hasGpuSupport) return '';
		
		const utilization = await executeNvidiaSmi('utilization.gpu');
		if (!utilization) return '';
		
		const gpuIndex = getGpuConfig();
		const values = utilization.split('\n').filter(v => v.trim() !== '');
		const targetValue = values[gpuIndex] || values[0];
		
		return `$(chip)${targetValue}%`;
	} catch (error) {
		console.debug('GPU utilization monitoring failed:', error);
		return '';
	}
};
```

### 4. 配置优化

#### 4.1 添加Ubuntu特定配置
在 `package.json` 的 configuration 部分添加：

```json
{
  "monitor-ultra.gpuEnabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable GPU monitoring (requires NVIDIA drivers and nvidia-smi)"
  },
  "monitor-ultra.gpuAutoDetect": {
    "type": "boolean", 
    "default": true,
    "description": "Automatically detect and enable GPU monitoring if hardware is available"
  }
}
```

#### 4.2 修改 `src/configuration.ts`
```typescript
export const getGpuEnabledConfig = () =>
	workspace.getConfiguration().get<boolean>("monitor-ultra.gpuEnabled") ?? true;

export const getGpuAutoDetectConfig = () =>
	workspace.getConfiguration().get<boolean>("monitor-ultra.gpuAutoDetect") ?? true;
```

### 5. 启动时自动检测

#### 5.1 修改 `src/extension.ts` 
添加启动时GPU检测：

```typescript
import { checkUbuntuGpuSupport } from './metrics';

export async function activate(context: vscode.ExtensionContext) {
	// 现有代码...
	
	// Ubuntu GPU自动检测
	if (getGpuAutoDetectConfig()) {
		const hasGpu = await checkUbuntuGpuSupport();
		if (!hasGpu) {
			console.log('GPU monitoring disabled: No compatible NVIDIA GPU detected or nvidia-smi not available');
		}
	}
	
	// 现有代码...
}
```

### 6. 本地化更新

#### 6.1 更新 `locales/zh-CN.json`
```json
{
  "config.gpuEnabled": "启用GPU监控（需要NVIDIA驱动和nvidia-smi工具）",
  "config.gpuAutoDetect": "自动检测并启用GPU监控（如果硬件可用）",
  "metric.gpuUtilization.name": "GPU 利用率",
  "metric.gpuMemory.name": "GPU 内存使用",
  "metric.gpuTemperature.name": "GPU 温度"
}
```

#### 6.2 更新 `locales/en.json`
```json
{
  "config.gpuEnabled": "Enable GPU monitoring (requires NVIDIA drivers and nvidia-smi)",
  "config.gpuAutoDetect": "Automatically detect and enable GPU monitoring if hardware is available",
  "metric.gpuUtilization.name": "GPU Utilization",
  "metric.gpuMemory.name": "GPU Memory Usage",
  "metric.gpuTemperature.name": "GPU Temperature"
}
```

### 7. 安装和使用指南

#### 7.1 Ubuntu GPU监控前置要求

在Ubuntu系统中使用GPU监控功能需要：

1. **安装NVIDIA驱动**
```bash
# 检查GPU
lspci | grep -i nvidia

# 安装推荐驱动
sudo ubuntu-drivers autoinstall
# 或手动安装
sudo apt install nvidia-driver-545  # 替换为适合的版本

# 重启系统
sudo reboot
```

2. **验证安装**
```bash
# 检查驱动状态
nvidia-smi

# 应该显示GPU信息和状态
```

3. **确保nvidia-smi在PATH中**
```bash
# 检查nvidia-smi位置
which nvidia-smi

# 如果找不到，添加到PATH
echo 'export PATH=$PATH:/usr/bin' >> ~/.bashrc
source ~/.bashrc
```

#### 7.2 故障排除

**常见问题：**

1. **`nvidia-smi: command not found`**
   - 安装NVIDIA驱动：`sudo ubuntu-drivers autoinstall`
   - 重启系统

2. **`No devices were found`**
   - 检查GPU是否被系统识别：`lspci | grep -i nvidia`
   - 确认安装了正确的驱动版本

3. **权限问题**
   - 确保当前用户有访问GPU设备的权限
   - 检查设备权限：`ls -la /dev/nvidia*`

### 8. 性能优化

#### 8.1 缓存机制
```typescript
// 添加简单的缓存避免频繁调用nvidia-smi
let gpuDataCache: {[key: string]: {data: string, timestamp: number}} = {};
const CACHE_DURATION = 1000; // 1秒缓存

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
```

### 9. 测试计划

#### 9.1 Ubuntu环境测试
- [ ] Ubuntu 20.04 LTS + NVIDIA GPU
- [ ] Ubuntu 22.04 LTS + NVIDIA GPU  
- [ ] Ubuntu 24.04 LTS + NVIDIA GPU
- [ ] 无GPU的Ubuntu系统
- [ ] 多GPU配置测试

#### 9.2 功能测试
- [ ] 驱动安装检测
- [ ] GPU数据获取准确性
- [ ] 错误处理和恢复
- [ ] 性能影响评估

### 10. 部署步骤

1. **更新代码文件**
   - 修改 `src/metrics.ts` - 添加Ubuntu优化函数
   - 更新 `src/configuration.ts` - 添加新配置选项
   - 修改 `src/extension.ts` - 添加启动检测

2. **更新配置文件**
   - 修改 `package.json` - 添加新的配置项
   - 更新本地化文件

3. **测试验证**
   - 在Ubuntu环境中测试各种GPU配置
   - 验证错误处理机制

4. **文档更新**
   - 更新README文件中的Ubuntu安装指南
   - 添加故障排除文档

## 预期效果

实现后，Ubuntu用户将获得：
- 自动GPU检测和配置
- 更好的错误处理和用户提示
- 针对Ubuntu系统优化的性能
- 清晰的安装和故障排除指南

在VS Code状态栏中显示：
- `$(chip)75%` - GPU 利用率
- `$(repo)2.1G/8.0G` - GPU 内存使用  
- `$(flame)65°C` - GPU 温度

这将为Ubuntu用户提供完整、稳定的GPU监控体验。
