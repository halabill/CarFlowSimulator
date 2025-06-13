import cv2
import numpy as np

# --- 輔助函式，避免重複程式碼 ---
def sample_path(path, num_points):
    """從給定的路徑中，均勻取樣指定數量的點"""
    path_length = len(path)
    if path_length < 2:
        return []
    indices = np.linspace(0, path_length - 1, num_points, dtype=int)
    sampled_points = [tuple(path[idx][0]) for idx in indices]
    return sampled_points

def print_js_array(variable_name, points):
    """將點的列表輸出成 JavaScript 陣列格式"""
    print(f"const {variable_name} = [")
    if points:
        for point in points:
            print(f"    {{ x: {point[0]}, y: {point[1]} }},")
    print("];")
    print() # 空一行，讓輸出更清晰

# --- 主要邏輯 ---

# 1. 載入圖片並找到輪廓
image_path = "Map_Red_Path.png"
image = cv2.imread(image_path)

if image is None:
    print(f"錯誤：無法讀取圖片 {image_path}")
    exit()

hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
lower_red1 = np.array([0, 70, 50])
upper_red1 = np.array([10, 255, 255])
mask1 = cv2.inRange(hsv_image, lower_red1, upper_red1)
lower_red2 = np.array([170, 70, 50])
upper_red2 = np.array([180, 255, 255])
mask2 = cv2.inRange(hsv_image, lower_red2, upper_red2)
mask = cv2.bitwise_or(mask1, mask2)
contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)

if not contours:
    print("錯誤：在圖片中找不到紅色路徑的輪廓。")
    exit()

largest_contour = max(contours, key=cv2.contourArea)

# 2. 找到起點並重新排序輪廓
contour_points = largest_contour[:, 0, :]
start_point_index = np.argmax(contour_points[:, 1])
rolled_contour = np.roll(largest_contour, -start_point_index, axis=0)

# 3. 將輪廓分為「去程」和「回程」兩半
halfway_index = len(rolled_contour) // 2
forward_path = rolled_contour[0:halfway_index]
backward_path_raw = rolled_contour[halfway_index:]

# 4. 處理去程 (Forward Path) -> 現在反轉為 End-to-Start
sampled_forward_points = sample_path(forward_path, 100)
# *** 新增：將去程的點反向排序 ***
sampled_forward_points = sampled_forward_points[::-1]
print_js_array("redControlPoints", sampled_forward_points)

# 5. 處理回程 (Backward Path) -> 保持 End-to-Start
#    後半段的路徑是從終點走回起點，我們需要反轉它，
#    使其順序變為從終點開始。
backward_path_ordered = backward_path_raw[::-1]
sampled_backward_points = sample_path(backward_path_ordered, 100)
print_js_array("yellowControlPoints", sampled_backward_points)


# (可選) 視覺化驗證
for point in sampled_forward_points:
    cv2.circle(image, point, 3, (0, 255, 0), -1) # 綠色點代表去程
for point in sampled_backward_points:
    cv2.circle(image, point, 3, (0, 255, 255), -1) # 黃色點代表回程

cv2.imshow("Sampled Points", image)
cv2.waitKey(0)
cv2.destroyAllWindows()