# Monitor Ultra 安装指南

## 安装方法

### 方法1：从VSIX文件安装（推荐）

我们已经为您创建了Monitor Ultra的VSIX安装包：

#### 步骤1：获取VSIX文件
- 文件名：`monitor-ultra-1.0.0.vsix`
- 包含所有Ubuntu GPU监控优化功能

#### 步骤2：安装VSIX文件

**方法A：通过VS Code界面安装**
1. 打开VS Code
2. 按 `Ctrl+Shift+P` 打开命令面板
3. 输入 "Extensions: Install from VSIX..."
4. 选择命令并按回车
5. 浏览并选择 `monitor-ultra-1.0.0.vsix` 文件
6. 点击"安装"
7. 重启VS Code

**方法B：通过命令行安装**
```bash
# 使用VS Code命令行工具
code --install-extension monitor-ultra-1.0.0.vsix

# 或者在项目目录中运行
code --install-extension ./monitor-ultra-1.0.0.vsix
```

### 方法3：开发模式运行

如果您是开发者想要调试或修改代码：

1. **克隆项目**：
   ```bash
   git clone <项目地址>
   cd vscode-monitor-ultra
   ```

2. **安装依赖**：
   ```bash
   npm install
   ```

3. **编译项目**：
   ```bash
   npm run compile
   ```

4. **在VS Code中调试**：
   - 在VS Code中打开项目文件夹
   - 按 `F5` 或点击"运行和调试"
   - 选择"运行扩展"
   - 这会打开一个新的VS Code扩展开发主机窗口

## 验证安装

安装完成后，您应该能看到：

1. **状态栏显示**：
   - 在VS Code底部状态栏看到系统资源信息
   - 例如：`$(pulse)15.2%` (CPU使用率)

2. **扩展列表**：
   - 在扩展面板中能找到"Monitor Ultra"
   - 状态显示为"已安装"

3. **设置选项**：
   - 打开设置 (`Ctrl+,`)
   - 搜索 "monitor-ultra"
   - 看到GPU相关的配置选项

## Ubuntu用户GPU监控设置

如果您使用Ubuntu系统并想要GPU监控功能：

### 前置要求
1. **安装NVIDIA驱动**：
   ```bash
   sudo ubuntu-drivers autoinstall
   sudo reboot
   ```

2. **验证nvidia-smi**：
   ```bash
   nvidia-smi
   ```

### 配置GPU监控
1. 打开VS Code设置 (`Ctrl+,`)
2. 搜索 "monitor-ultra"
3. 确保以下设置已启用：
   - ✅ `GPU Enabled` (启用GPU监控)
   - ✅ `GPU Auto Detect` (自动检测GPU)
   - 设置 `GPU Index` 为 0（第一个GPU）

### 验证GPU监控
安装成功后，状态栏应显示：
- `$(chip)75%` - GPU 利用率
- `$(repo)2.1G/8.0G` - GPU 内存使用
- `$(flame)65°C` - GPU 温度

## 故障排除

### 问题1：扩展未显示在状态栏
**解决方案**：
- 检查设置中是否启用了所需的监控指标
- 重启VS Code
- 检查是否有错误信息在开发者工具中

### 问题2：GPU监控不工作（Ubuntu）
**解决方案**：
- 确保安装了NVIDIA驱动：`nvidia-smi`
- 检查VS Code开发者工具中的错误信息
- 参考 `UBUNTU_GPU_SETUP.md` 详细指南

### 问题3：VSIX安装失败
**解决方案**：
- 确保VS Code版本兼容（需要1.101.2+）
- 尝试先卸载旧版本再安装
- 检查文件权限

## 卸载

如果需要卸载扩展：

1. **通过VS Code界面**：
   - 打开扩展面板 (`Ctrl+Shift+X`)
   - 找到 Monitor Ultra
   - 点击齿轮图标 → "卸载"

2. **通过命令行**：
   ```bash
   code --uninstall-extension your-publisher-name.monitor-ultra
   ```

## 获取帮助

- **GitHub仓库**：[项目地址]
- **问题反馈**：创建GitHub Issue
- **文档**：查看项目中的README和其他文档
- **Ubuntu GPU设置**：参考 `UBUNTU_GPU_SETUP.md`

---

通过以上方法，您都能成功在VS Code中安装和使用Monitor Ultra扩展！
