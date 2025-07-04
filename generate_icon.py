#!/usr/bin/env python3
"""
Monitor Ultra 图标生成器
生成具有科技感蓝色基调的 VS Code 扩展图标
"""

from PIL import Image, ImageDraw, ImageFont
import os
import sys

def create_monitor_ultra_icon(size=512):
    """创建 Monitor Ultra 图标"""
    
    # 创建图像
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 计算比例
    scale = size / 512
    
    # 定义颜色
    colors = {
        'bg_start': (26, 26, 46),      # 深蓝色背景起始
        'bg_end': (15, 52, 96),        # 深蓝色背景结束
        'primary': (0, 122, 204),      # VS Code 蓝色
        'accent': (0, 153, 255),       # 亮蓝色
        'success': (0, 255, 136),      # 绿色
        'warning': (255, 217, 61),     # 黄色
        'error': (255, 107, 107),      # 红色
        'purple': (168, 85, 247),      # 紫色
        'white': (255, 255, 255),      # 白色
        'dark': (0, 17, 34),           # 深色
    }
    
    # 绘制背景渐变（简化为实心背景）
    draw.rectangle([(0, 0), (size, size)], fill=colors['bg_start'])
    
    # 绘制圆角背景
    corner_radius = int(80 * scale)
    draw.rounded_rectangle([(0, 0), (size, size)], radius=corner_radius, fill=colors['bg_end'])
    
    # 中心位置
    cx, cy = size // 2, size // 2
    
    # 绘制主屏幕框架
    screen_width = int(280 * scale)
    screen_height = int(200 * scale)
    screen_x = cx - screen_width // 2
    screen_y = cy - screen_height // 2 - int(20 * scale)
    
    # 屏幕外框
    line_width = max(1, int(6 * scale))
    draw.rectangle([
        (screen_x - line_width//2, screen_y - line_width//2),
        (screen_x + screen_width + line_width//2, screen_y + screen_height + line_width//2)
    ], outline=colors['primary'], width=line_width)
    
    # 屏幕内容背景
    draw.rectangle([
        (screen_x + line_width, screen_y + line_width),
        (screen_x + screen_width - line_width, screen_y + screen_height - line_width)
    ], fill=colors['dark'])
    
    # 绘制监控数据线条
    data_lines = [
        {'y_offset': -60, 'color': colors['success'], 'width': 200},
        {'y_offset': -30, 'color': colors['accent'], 'width': 150},
        {'y_offset': 0, 'color': colors['error'], 'width': 180},
        {'y_offset': 30, 'color': colors['warning'], 'width': 160},
        {'y_offset': 60, 'color': colors['purple'], 'width': 140},
    ]
    
    for line in data_lines:
        y_pos = cy + int(line['y_offset'] * scale)
        line_width_scaled = int(line['width'] * scale)
        line_thickness = max(1, int(4 * scale))
        
        draw.rectangle([
            (cx - line_width_scaled//2, y_pos - line_thickness//2),
            (cx + line_width_scaled//2, y_pos + line_thickness//2)
        ], fill=line['color'])
    
    # 绘制GPU芯片图标
    chip_size = int(60 * scale)
    chip_x = cx - int(120 * scale)
    chip_y = cy - int(120 * scale)
    
    # 芯片主体
    draw.rectangle([
        (chip_x, chip_y),
        (chip_x + chip_size, chip_y + chip_size)
    ], fill=colors['primary'])
    
    # 芯片网格
    grid_thickness = max(1, int(2 * scale))
    for i in range(1, 4):
        # 垂直线
        x_pos = chip_x + i * chip_size // 4
        draw.rectangle([
            (x_pos - grid_thickness//2, chip_y),
            (x_pos + grid_thickness//2, chip_y + chip_size)
        ], fill=colors['white'])
        
        # 水平线
        y_pos = chip_y + i * chip_size // 4
        draw.rectangle([
            (chip_x, y_pos - grid_thickness//2),
            (chip_x + chip_size, y_pos + grid_thickness//2)
        ], fill=colors['white'])
    
    # 芯片引脚
    pin_size = max(1, int(4 * scale))
    pin_length = max(1, int(8 * scale))
    
    for i in range(8):
        pin_offset = i * int(8 * scale) + int(4 * scale)
        
        # 左侧引脚
        draw.rectangle([
            (chip_x - pin_length, chip_y + pin_offset),
            (chip_x, chip_y + pin_offset + pin_size)
        ], fill=colors['success'])
        
        # 右侧引脚
        draw.rectangle([
            (chip_x + chip_size, chip_y + pin_offset),
            (chip_x + chip_size + pin_length, chip_y + pin_offset + pin_size)
        ], fill=colors['success'])
        
        # 上侧引脚
        draw.rectangle([
            (chip_x + pin_offset, chip_y - pin_length),
            (chip_x + pin_offset + pin_size, chip_y)
        ], fill=colors['success'])
        
        # 下侧引脚
        draw.rectangle([
            (chip_x + pin_offset, chip_y + chip_size),
            (chip_x + pin_offset + pin_size, chip_y + chip_size + pin_length)
        ], fill=colors['success'])
    
    # 绘制内存条
    mem_width = int(80 * scale)
    mem_height = int(20 * scale)
    mem_x = cx + int(80 * scale)
    mem_y = cy - int(120 * scale)
    
    draw.rectangle([
        (mem_x, mem_y),
        (mem_x + mem_width, mem_y + mem_height)
    ], fill=colors['accent'])
    
    # 内存条刻痕
    notch_width = max(1, int(4 * scale))
    notch_height = max(1, int(10 * scale))
    draw.rectangle([
        (mem_x + mem_width//2 - notch_width//2, mem_y - notch_height//2),
        (mem_x + mem_width//2 + notch_width//2, mem_y + notch_height//2)
    ], fill=colors['dark'])
    
    # 内存条引脚
    for i in range(10):
        pin_x = mem_x + i * int(8 * scale)
        draw.rectangle([
            (pin_x, mem_y + mem_height),
            (pin_x + pin_size, mem_y + mem_height + pin_length)
        ], fill=colors['warning'])
    
    # 绘制温度计
    temp_x = cx + int(100 * scale)
    temp_y = cy + int(40 * scale)
    temp_thickness = max(1, int(8 * scale))
    temp_length = int(60 * scale)
    
    draw.rectangle([
        (temp_x - temp_thickness//2, temp_y),
        (temp_x + temp_thickness//2, temp_y + temp_length)
    ], fill=colors['error'])
    
    # 温度计球
    bulb_radius = int(12 * scale)
    draw.ellipse([
        (temp_x - bulb_radius, temp_y + temp_length),
        (temp_x + bulb_radius, temp_y + temp_length + bulb_radius * 2)
    ], fill=colors['error'])
    
    # 绘制CPU图标
    cpu_size = int(50 * scale)
    cpu_x = cx - int(120 * scale)
    cpu_y = cy + int(40 * scale)
    
    # CPU外框
    cpu_thickness = max(1, int(4 * scale))
    draw.rectangle([
        (cpu_x - cpu_thickness//2, cpu_y - cpu_thickness//2),
        (cpu_x + cpu_size + cpu_thickness//2, cpu_y + cpu_size + cpu_thickness//2)
    ], outline=colors['purple'], width=cpu_thickness)
    
    # CPU内部
    inner_margin = int(10 * scale)
    draw.rectangle([
        (cpu_x + inner_margin, cpu_y + inner_margin),
        (cpu_x + cpu_size - inner_margin, cpu_y + cpu_size - inner_margin)
    ], fill=colors['purple'])
    
    # 添加"ULTRA"文字（简化版）
    text_y = cy + int(140 * scale)
    
    # 由于PIL字体处理复杂，我们用简单的矩形来表示文字
    text_blocks = [
        {'x_offset': -80, 'width': 20, 'height': 40},  # U
        {'x_offset': -50, 'width': 20, 'height': 40},  # L
        {'x_offset': -20, 'width': 20, 'height': 40},  # T
        {'x_offset': 10, 'width': 20, 'height': 40},   # R
        {'x_offset': 40, 'width': 20, 'height': 40},   # A
    ]
    
    for block in text_blocks:
        block_x = cx + int(block['x_offset'] * scale)
        block_width = int(block['width'] * scale)
        block_height = int(block['height'] * scale)
        
        draw.rectangle([
            (block_x, text_y),
            (block_x + block_width, text_y + block_height)
        ], fill=colors['white'])
    
    # 绘制装饰性光线
    dash_length = int(20 * scale)
    dash_gap = int(10 * scale)
    dash_thickness = max(1, int(2 * scale))
    
    # 对角线光线（简化）
    corners = [
        (int(50 * scale), int(50 * scale), int(150 * scale), int(150 * scale)),
        (size - int(50 * scale), int(50 * scale), size - int(150 * scale), int(150 * scale)),
        (int(50 * scale), size - int(50 * scale), int(150 * scale), size - int(150 * scale)),
        (size - int(50 * scale), size - int(50 * scale), size - int(150 * scale), size - int(150 * scale)),
    ]
    
    for x1, y1, x2, y2 in corners:
        # 简化的虚线效果
        draw.line([(x1, y1), (x2, y2)], fill=colors['primary'], width=dash_thickness)
    
    return img

def main():
    """主函数"""
    print("正在生成 Monitor Ultra 图标...")
    
    # 确保assets目录存在
    assets_dir = "assets"
    if not os.path.exists(assets_dir):
        os.makedirs(assets_dir)
    
    # 生成主图标
    icon = create_monitor_ultra_icon(512)
    icon_path = os.path.join(assets_dir, "icon.png")
    icon.save(icon_path, "PNG")
    print(f"✅ 主图标已保存: {icon_path}")
    
    # 生成不同尺寸的图标
    sizes = [16, 24, 32, 48, 64, 128, 256]
    for size in sizes:
        icon_sized = create_monitor_ultra_icon(size)
        sized_path = os.path.join(assets_dir, f"icon-{size}x{size}.png")
        icon_sized.save(sized_path, "PNG")
        print(f"✅ {size}x{size} 图标已保存: {sized_path}")
    
    print("\n🎉 Monitor Ultra 图标生成完成！")
    print("📁 所有图标文件已保存到 assets/ 目录")
    print("🎨 图标特色：科技感蓝色基调、GPU监控主题、现代设计")

if __name__ == "__main__":
    try:
        main()
    except ImportError:
        print("❌ 错误：需要安装 Pillow 库")
        print("请运行：pip install Pillow")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 生成图标时出错：{e}")
        sys.exit(1)
