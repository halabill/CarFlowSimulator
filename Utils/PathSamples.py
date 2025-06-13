import cv2
import numpy as np

# 載入圖片
image_path = "Map_Red_Path.png"
image = cv2.imread(image_path)

# 檢查圖片是否成功載入
if image is None:
    print(f"錯誤：無法讀取圖片 {image_path}")
    exit()

# 轉 HSV 擷取紅色遮罩
hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

# 定義紅色範圍（兩段，以涵蓋 HSV 色彩空間中環繞的紅色）
lower_red1 = np.array([0, 70, 50])
upper_red1 = np.array([10, 255, 255])
mask1 = cv2.inRange(hsv_image, lower_red1, upper_red1)

lower_red2 = np.array([170, 70, 50])
upper_red2 = np.array([180, 255, 255])
mask2 = cv2.inRange(hsv_image, lower_red2, upper_red2)

# 合併遮罩
mask = cv2.bitwise_or(mask1, mask2)

# 找輪廓
# CHAIN_APPROX_NONE 確保我們得到路徑上所有的點，而不是簡化過的
contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)

# 檢查是否找到輪廓
if not contours:
    print("錯誤：在圖片中找不到紅色路徑的輪廓。")
    exit()

# 找出最大的輪廓（假設這就是我們要的紅線）
largest_contour = max(contours, key=cv2.contourArea)

# --- 核心修正邏輯開始 ---

# 1. 自動找到起點：在輪廓上找到 Y 座標最大（最底部）的點作為起點
#    largest_contour 的形狀是 (N, 1, 2)，我們用 [:, 0, :] 轉成 (N, 2)
contour_points = largest_contour[:, 0, :]
start_point_index = np.argmax(contour_points[:, 1]) # Y 座標在索引 1

# 2. 重新排序輪廓，讓我們的起點成為陣列的第一個元素
#    np.roll 會將陣列循環移動
rolled_contour = np.roll(largest_contour, -start_point_index, axis=0)

# 3. 找到路徑的終點
#    輪廓是閉合的，路徑的終點應該是離起點直線距離最遠的那個點
start_xy = rolled_contour[0][0]
dists_from_start = np.linalg.norm(rolled_contour[:, 0, :] - start_xy, axis=1)
end_point_index = np.argmax(dists_from_start)

# 4. 截取單向路徑
#    從起點 (index 0) 到我們剛找到的終點 (end_point_index)
one_way_path = rolled_contour[0:end_point_index + 1]

# 5. 在單向路徑上進行等距取樣
num_points = 100
path_length = len(one_way_path)
# 使用 np.linspace 在 0 到 path_length-1 之間產生 num_points 個索引
indices = np.linspace(0, path_length - 1, num_points, dtype=int)
sampled_points = [tuple(one_way_path[idx][0]) for idx in indices]

# --- 核心修正邏輯結束 ---

# 輸出成 JS 陣列格式
print("const redControlPoints = [")
for point in sampled_points:
    # point[0] 是 x, point[1] 是 y
    print(f"    {{ x: {point[0]}, y: {point[1]} }},")
print("];")

# (可選) 視覺化驗證
# 在原始影像上畫出取樣點，以確認結果
for point in sampled_points:
    cv2.circle(image, point, 3, (0, 255, 0), -1) # 畫綠色的點

cv2.imshow("Sampled Points", image)
cv2.waitKey(0)
cv2.destroyAllWindows()