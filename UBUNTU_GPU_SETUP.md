# Ubuntu GPU监控安装指南

## 前置要求

在Ubuntu系统中使用Monitor Ultra的GPU监控功能，需要满足以下条件：

### 1. 硬件要求
- NVIDIA GPU（支持的GPU型号）
- 兼容的NVIDIA驱动程序

### 2. 软件要求
- Ubuntu 18.04+ (推荐 Ubuntu 20.04/22.04/24.04 LTS)
- NVIDIA驱动程序
- nvidia-smi 工具

## 安装步骤

### 步骤1: 检查GPU硬件

```bash
# 检查是否有NVIDIA GPU
lspci | grep -i nvidia

# 应该显示类似以下内容：
# 01:00.0 VGA compatible controller: NVIDIA Corporation ...
```

### 步骤2: 安装NVIDIA驱动

#### 方法1：自动安装（推荐）
```bash
# 检查推荐的驱动版本
sudo ubuntu-drivers devices

# 自动安装推荐驱动
sudo ubuntu-drivers autoinstall

# 重启系统
sudo reboot
```

#### 方法2：手动安装特定版本
```bash
# 查看可用驱动版本
apt search nvidia-driver

# 安装特定版本（例如：545版本）
sudo apt install nvidia-driver-545

# 重启系统
sudo reboot
```

### 步骤3: 验证安装

重启后，验证驱动是否正确安装：

```bash
# 检查nvidia-smi是否可用
nvidia-smi

# 应该显示GPU信息，类似以下内容：
#+-----------------------------------------------------------------------------+
#| NVIDIA-SMI 545.29.06    Driver Version: 545.29.06    CUDA Version: 12.3  |
#|-------------------------------+----------------------+----------------------+
#| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
#| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
#|===============================+======================+======================|
#|   0  NVIDIA GeForce ...  Off  | 00000000:01:00.0 On |                  N/A |
#| 30%   32C    P0    40W / 250W |    500MiB / 8192MiB |     15%      Default |
#+-------------------------------+----------------------+----------------------+
```

### 步骤4: 配置VS Code Monitor Ultra

1. 安装或更新Monitor Ultra扩展
2. 打开VS Code设置 (Ctrl+,)
3. 搜索 "monitor-ultra"
4. 确保以下设置已启用：
   - `GPU Enabled`: ✓ 
   - `GPU Auto Detect`: ✓
   - `GPU Index`: 0 (对于第一个GPU)

## 故障排除

### 问题1: `nvidia-smi: command not found`

**解决方案：**
```bash
# 检查nvidia-smi是否在PATH中
which nvidia-smi

# 如果找不到，尝试手动添加到PATH
echo 'export PATH=$PATH:/usr/bin:/usr/local/bin' >> ~/.bashrc
source ~/.bashrc

# 重新安装驱动
sudo ubuntu-drivers autoinstall
sudo reboot
```

### 问题2: `No devices were found`

**解决方案：**
```bash
# 检查GPU是否被系统识别
lspci | grep -i nvidia

# 检查内核模块是否加载
lsmod | grep nvidia

# 如果没有加载，尝试手动加载
sudo modprobe nvidia

# 检查安全启动是否禁用（可能需要）
mokutil --sb-state
```

### 问题3: 权限问题

**解决方案：**
```bash
# 检查设备权限
ls -la /dev/nvidia*

# 添加用户到video组
sudo usermod -a -G video $USER

# 重新登录或重启
```

### 问题4: GPU监控显示空白

**可能原因和解决方案：**

1. **驱动版本不兼容**
   ```bash
   # 卸载当前驱动并重新安装
   sudo apt purge nvidia-driver-*
   sudo ubuntu-drivers autoinstall
   sudo reboot
   ```

2. **nvidia-smi超时**
   - VS Code扩展会等待5秒执行nvidia-smi
   - 如果GPU正在高负载下运行，可能会超时
   - 等待GPU负载降低后重试

3. **多GPU配置问题**
   - 检查GPU索引设置
   - 尝试设置为0（第一个GPU）

## 性能优化建议

### 1. 调整刷新间隔
- 默认刷新间隔为3秒
- 对于高负载系统，可以增加到5-10秒
- 设置路径：VS Code设置 → Monitor Ultra → Refresh Interval

### 2. 选择性启用GPU监控
- 如果不需要GPU监控，可以在设置中禁用
- 这将减少系统资源消耗

### 3. 监控特定GPU
- 对于多GPU系统，可以指定要监控的GPU索引
- 设置路径：VS Code设置 → Monitor Ultra → GPU Index

## 支持的Ubuntu版本

- ✅ Ubuntu 24.04 LTS (Noble Numbat)
- ✅ Ubuntu 22.04 LTS (Jammy Jellyfish)  
- ✅ Ubuntu 20.04 LTS (Focal Fossa)
- ✅ Ubuntu 18.04 LTS (Bionic Beaver)
- ⚠️ 其他发行版可能需要额外配置

## 常见GPU型号支持

### 完全支持 ✅
- GeForce RTX 30/40系列
- GeForce GTX 16/20系列
- Quadro/Tesla专业卡
- A100/H100等数据中心GPU

### 部分支持 ⚠️
- 较老的GeForce GTX 10系列（需要较新驱动）
- 集成GPU（不支持）

## 获取帮助

如果遇到问题，请：

1. 检查是否满足所有前置要求
2. 查看VS Code开发者工具中的错误信息
3. 在项目GitHub仓库中创建issue
4. 提供以下信息：
   - Ubuntu版本：`lsb_release -a`
   - GPU信息：`nvidia-smi`
   - 驱动版本：`nvidia-smi --query-gpu=driver_version --format=csv,noheader`
   - 错误日志

---

通过以上步骤，你应该能够在Ubuntu系统上成功使用Monitor Ultra的GPU监控功能。
