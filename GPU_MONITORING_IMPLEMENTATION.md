# GPU 监控功能实现方案

## 项目概述
本方案将为 Monitor Ultra 扩展添加 NVIDIA GPU 占用检测功能，包括 GPU 利用率、内存使用情况和温度监控。

## 技术方案

### 1. 依赖包选择
使用 `node-nvidia-ml` 或 `nvidia-ml-py` 的 Node.js 包装器来获取 NVIDIA GPU 信息。推荐使用 `@nvidia/nvml` 或者通过执行 `nvidia-smi` 命令获取数据。

考虑到兼容性和稳定性，建议使用 `child_process` 执行 `nvidia-smi` 命令的方式。

### 2. 需要修改的文件

#### 2.1 package.json
```json
{
  "dependencies": {
    // 现有依赖...
    // 可选：如果使用专门的 NVIDIA 库
    // "@nvidia/nvml": "^1.0.0"
  }
}
```

#### 2.2 src/constants.ts
```typescript
// 在 metricsExist 数组中添加新的 GPU 相关指标
export const metricsExist: string[] = metrics.map((x) => x.section);
// 将包含: 'gpuUtilization', 'gpuMemory', 'gpuTemperature'
```

#### 2.3 src/configuration.ts
```typescript
// 添加 GPU 监控配置
export const getGpuConfig = () =>
  workspace.getConfiguration().get<number>("monitor-pro.gpuIndex") ?? 0;
```

#### 2.4 package.json - configuration 部分
```json
{
  "contributes": {
    "configuration": {
      "properties": {
        "monitor-pro.metrics": {
          "default": [
            "cpu",
            "memoryActive", 
            "memoryUsed",
            "network",
            "fileSystem",
            "battery",
            "cpuTemp",
            "cpuSpeed",
            "osDistro",
            "diskSpace",
            "uptime",
            "gpuUtilization",
            "gpuMemory",
            "gpuTemperature"
          ],
          "items": {
            "enum": [
              "cpu",
              "memoryActive",
              "memoryUsed", 
              "network",
              "fileSystem",
              "battery",
              "cpuTemp",
              "cpuSpeed",
              "osDistro",
              "diskSpace",
              "uptime",
              "gpuUtilization",
              "gpuMemory",
              "gpuTemperature"
            ]
          }
        },
        "monitor-ultra.gpuIndex": {
          "type": "number",
          "default": 0,
          "description": "要监控的 GPU 索引（默认为第一个 GPU）"
        }
      }
    }
  }
}
```

#### 2.5 src/metrics.ts
```typescript
// 添加新的 GPU 相关函数

/**
 * 执行 nvidia-smi 命令获取 GPU 信息
 */
const executeNvidiaSmi = async (query: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    const command = `nvidia-smi --query-gpu=${query} --format=csv,noheader,nounits`;
    
    exec(command, (error: any, stdout: string, stderr: string) => {
      if (error) {
        console.warn('NVIDIA GPU not detected or nvidia-smi not available');
        resolve('');
        return;
      }
      resolve(stdout.trim());
    });
  });
};

/**
 * GPU 利用率监控
 */
const gpuUtilizationText = async () => {
  try {
    const utilization = await executeNvidiaSmi('utilization.gpu');
    if (!utilization) return '';
    
    const gpuIndex = getGpuConfig();
    const values = utilization.split('\n');
    const targetValue = values[gpuIndex] || values[0];
    
    return `$(chip)${targetValue}%`;
  } catch (error) {
    return '';
  }
};

/**
 * GPU 内存使用监控
 */
const gpuMemoryText = async () => {
  try {
    const memoryUsed = await executeNvidiaSmi('memory.used');
    const memoryTotal = await executeNvidiaSmi('memory.total');
    
    if (!memoryUsed || !memoryTotal) return '';
    
    const gpuIndex = getGpuConfig();
    const usedValues = memoryUsed.split('\n');
    const totalValues = memoryTotal.split('\n');
    
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
 * GPU 温度监控
 */
const gpuTemperatureText = async () => {
  try {
    const temperature = await executeNvidiaSmi('temperature.gpu');
    if (!temperature) return '';
    
    const gpuIndex = getGpuConfig();
    const values = temperature.split('\n');
    const targetValue = values[gpuIndex] || values[0];
    
    return `$(flame)${targetValue}°C`;
  } catch (error) {
    return '';
  }
};

// 在 metrics 数组中添加新的指标
const metrics: MetricCtrProps[] = [
  // ...现有指标...
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
```

#### 2.6 本地化文件更新

**locales/zh-CN.json**
```json
{
  // ...现有内容...
  "metric.gpuUtilization.name": "GPU 利用率",
  "metric.gpuMemory.name": "GPU 内存使用",
  "metric.gpuTemperature.name": "GPU 温度",
  "config.gpuIndex": "要监控的 GPU 索引"
}
```

**locales/en.json**
```json
{
  // ...现有内容...
  "metric.gpuUtilization.name": "GPU Utilization",
  "metric.gpuMemory.name": "GPU Memory Usage", 
  "metric.gpuTemperature.name": "GPU Temperature",
  "config.gpuIndex": "GPU index to monitor"
}
```

### 3. 实现细节

#### 3.1 错误处理
- 当系统没有 NVIDIA GPU 时，相关指标将返回空字符串
- 当 `nvidia-smi` 命令不可用时，优雅地处理错误
- 添加适当的日志记录用于调试

#### 3.2 性能考虑
- 使用缓存机制避免频繁调用 `nvidia-smi`
- 考虑将 GPU 数据获取合并到一次调用中
- 设置合理的超时时间

#### 3.3 多GPU支持
- 通过配置选项允许用户选择要监控的 GPU
- 支持显示多个 GPU 的信息（未来扩展）

### 4. 测试计划

#### 4.1 环境测试
- 有 NVIDIA GPU 的 Windows 系统
- 没有 NVIDIA GPU 的系统
- 多 GPU 系统

#### 4.2 功能测试
- GPU 利用率显示准确性
- GPU 内存使用显示准确性
- GPU 温度显示准确性
- 配置更改的响应性

### 5. 部署步骤

1. **安装依赖**（如果需要）
2. **更新配置文件** - 添加 GPU 相关配置项
3. **实现 GPU 监控函数** - 在 `metrics.ts` 中添加
4. **更新本地化文件** - 添加中英文翻译
5. **更新常量定义** - 确保类型正确
6. **测试功能** - 在有 GPU 的系统上验证
7. **文档更新** - 更新 README 文件

### 6. 后续扩展计划

- 支持 AMD GPU (通过 `rocm-smi`)
- 支持集成显卡监控
- 添加 GPU 风扇速度监控
- 添加 GPU 功耗监控
- 多 GPU 并行显示
- GPU 使用率历史图表

### 7. 注意事项

- 确保 `nvidia-smi` 在系统 PATH 中可用
- 考虑不同操作系统的兼容性
- 处理权限问题（某些系统可能需要管理员权限）
- 考虑 GPU 驱动版本兼容性

## 预期效果

实现后，用户将能够在 VS Code 状态栏中看到：
- `$(chip)75%` - GPU 利用率
- `$(repo)2.1G/8.0G` - GPU 内存使用
- `$(flame)65°C` - GPU 温度

这些指标将与现有的 CPU、内存等监控指标一起显示，为用户提供完整的系统资源监控体验。
