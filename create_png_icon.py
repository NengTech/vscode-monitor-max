import base64

# 创建一个简单的蓝色基调PNG图标的数据
# 这是一个256x256的PNG图像，使用蓝色渐变和科技感设计

def create_png_icon():
    # PNG文件头
    png_signature = b'\x89PNG\r\n\x1a\n'
    
    # 简单的蓝色渐变图像数据（简化版）
    width, height = 256, 256
    
    # 创建基本的PNG结构
    import struct
    import zlib
    
    # IHDR chunk (图像头)
    ihdr_data = struct.pack('>2I5B', width, height, 8, 2, 0, 0, 0)  # RGB, no alpha
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff
    ihdr_chunk = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    
    # 创建图像数据
    image_data = b''
    for y in range(height):
        image_data += b'\x00'  # 行过滤器
        for x in range(width):
            # 创建科技感蓝色渐变
            center_x, center_y = width // 2, height // 2
            distance = ((x - center_x) ** 2 + (y - center_y) ** 2) ** 0.5
            max_distance = (center_x ** 2 + center_y ** 2) ** 0.5
            
            # 蓝色基调
            intensity = max(0, min(1, 1 - distance / max_distance))
            
            # 深蓝到亮蓝的渐变
            r = int(15 + intensity * 50)    # 深蓝色调
            g = int(52 + intensity * 70)    # 
            b = int(96 + intensity * 159)   # 主要蓝色
            
            # 添加一些科技感的环形效果
            ring_distance = abs(distance - 80)
            if ring_distance < 5:
                r = min(255, r + 50)
                g = min(255, g + 100)
                b = min(255, b + 100)
            
            # 中心监控屏幕区域
            if (center_x - 90 < x < center_x + 90 and 
                center_y - 60 < y < center_y + 60):
                # 屏幕边框
                if (x == center_x - 90 or x == center_x + 89 or 
                    y == center_y - 60 or y == center_y + 59):
                    r, g, b = 0, 122, 204  # VS Code蓝色
                # 屏幕内容
                elif (center_x - 85 < x < center_x + 85 and 
                      center_y - 55 < y < center_y + 55):
                    r, g, b = 0, 17, 34  # 深色屏幕
                    
                    # 添加监控数据线条
                    line_y_positions = [center_y - 30, center_y - 10, center_y + 10, center_y + 30]
                    for i, line_y in enumerate(line_y_positions):
                        if abs(y - line_y) < 2 and center_x - 60 < x < center_x + 60:
                            colors = [
                                (0, 255, 136),   # 绿色
                                (0, 153, 255),   # 亮蓝色
                                (255, 107, 107), # 红色
                                (255, 217, 61)   # 黄色
                            ]
                            r, g, b = colors[i % len(colors)]
            
            # GPU芯片区域
            if (center_x - 150 < x < center_x - 110 and 
                center_y - 90 < y < center_y - 50):
                if (x == center_x - 150 or x == center_x - 111 or 
                    y == center_y - 90 or y == center_y - 51):
                    r, g, b = 0, 122, 204  # 芯片边框
                else:
                    r, g, b = 0, 122, 204  # 芯片内部
                    # 添加网格效果
                    if (x - center_x + 150) % 10 == 0 or (y - center_y + 90) % 10 == 0:
                        r, g, b = 255, 255, 255  # 白色网格
            
            # 确保颜色值在有效范围内
            r = max(0, min(255, r))
            g = max(0, min(255, g))
            b = max(0, min(255, b))
            
            image_data += struct.pack('BBB', r, g, b)
    
    # 压缩图像数据
    compressed_data = zlib.compress(image_data)
    
    # IDAT chunk (图像数据)
    idat_crc = zlib.crc32(b'IDAT' + compressed_data) & 0xffffffff
    idat_chunk = struct.pack('>I', len(compressed_data)) + b'IDAT' + compressed_data + struct.pack('>I', idat_crc)
    
    # IEND chunk (文件结束)
    iend_crc = zlib.crc32(b'IEND') & 0xffffffff
    iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    
    # 组合完整的PNG文件
    png_data = png_signature + ihdr_chunk + idat_chunk + iend_chunk
    
    # 保存到文件
    with open('assets/icon.png', 'wb') as f:
        f.write(png_data)
    
    print('✅ PNG图标已生成: assets/icon.png')
    print('🎨 特色: 科技感蓝色基调、GPU监控主题、现代设计')

if __name__ == '__main__':
    create_png_icon()
