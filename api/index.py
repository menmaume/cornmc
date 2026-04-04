from flask import Flask, request, send_file, jsonify
import mcschematic
from PIL import Image
from rembg import remove
from sklearn.cluster import KMeans
import cv2
import numpy as np
import json
import tempfile
import os
import io


app = Flask(__name__)

# Lấy đường dẫn của thư mục 'api/' để tìm file mapping và settings
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Bê nguyên danh sách blocks từ file skintool.py của bạn vào đây
blocks = [
    {'color':(8, 10, 15, 255),'block':'black_concrete'},
    {'color':(37, 22, 16, 255),'block':'black_terracotta'},
    {'color':(20, 21, 25, 255),'block':'black_wool'},
    {'color':(44, 46, 143, 255),'block':'blue_concrete'},
    {'color':(74, 59, 91, 255),'block':'blue_terracotta'},
    {'color':(53, 57, 157, 255),'block':'blue_wool'},
    {'color':(96, 59, 31, 255),'block':'brown_concrete'},
    {'color':(77, 51, 35, 255),'block':'brown_terracotta'},
    {'color':(114, 71, 40, 255),'block':'brown_wool'},
    {'color':(21, 119, 136, 255),'block':'cyan_concrete'},
    {'color':(86, 91, 91, 255),'block':'cyan_terracotta'},
    {'color':(21, 137, 145, 255),'block':'cyan_wool'},
    {'color':(54, 57, 61, 255),'block':'gray_concrete'},
    {'color':(57, 42, 35, 255),'block':'gray_terracotta'},
    {'color':(62, 68, 71, 255),'block':'gray_wool'},
    {'color':(73, 91, 36, 255),'block':'green_concrete'},
    {'color':(76, 83, 42, 255),'block':'green_terracotta'},
    {'color':(84, 109, 27, 255),'block':'green_wool'},
    {'color':(35, 137, 198, 255),'block':'light_blue_concrete'},
    {'color':(113, 108, 137, 255),'block':'light_blue_terracotta'},
    {'color':(58, 175, 217, 255),'block':'light_blue_wool'},
    {'color':(125, 125, 115, 255),'block':'light_gray_concrete'},
    {'color':(135, 106, 97, 255),'block':'light_gray_terracotta'},
    {'color':(142, 142, 134, 255),'block':'light_gray_wool'},
    {'color':(94, 168, 24, 255),'block':'lime_concrete'},
    {'color':(103, 117, 52, 255),'block':'lime_terracotta'},
    {'color':(112, 185, 25, 255),'block':'lime_wool'},
    {'color':(169, 48, 159, 255),'block':'magenta_concrete'},
    {'color':(149, 88, 108, 255),'block':'magenta_terracotta'},
    {'color':(189, 68, 179, 255),'block':'magenta_wool'},
    {'color':(224, 97, 0, 255),'block':'orange_concrete'},
    {'color':(161, 83, 37, 255),'block':'orange_terracotta'},
    {'color':(240, 118, 19, 255),'block':'orange_wool'},
    {'color':(213, 101, 142, 255),'block':'pink_concrete'},
    {'color':(161, 78, 78, 255),'block':'pink_terracotta'},
    {'color':(237, 141, 172, 255),'block':'pink_wool'},
    {'color':(100, 31, 156, 255),'block':'purple_concrete'},
    {'color':(118, 70, 86, 255),'block':'purple_terracotta'},
    {'color':(121, 42, 172, 255),'block':'purple_wool'},
    {'color':(142, 32, 32, 255),'block':'red_concrete'},
    {'color':(143, 61, 46, 255),'block':'red_terracotta'},
    {'color':(160, 39, 34, 255),'block':'red_wool'},
    {'color':(207, 213, 214, 255),'block':'white_concrete'},
    {'color':(209, 178, 161, 255),'block':'white_terracotta'},
    {'color':(233, 236, 236, 255),'block':'white_wool'},
    {'color':(240, 175, 21, 255),'block':'yellow_concrete'},
    {'color':(186, 133, 35, 255),'block':'yellow_terracotta'},
    {'color':(248, 197, 39, 255),'block':'yellow_wool'},
]

def colordiff(pixelcolor, blockcolor):
    out = 0
    for i in range(4):
        out += abs(pixelcolor[i] - blockcolor[i])
    return out

def findblockfromcolor(pixcolor):
    # Tìm block có màu giống nhất (Tối ưu lại thuật toán cũ của bạn cho web chạy nhanh hơn)
    best_block = min(blocks, key=lambda b: colordiff(pixcolor["color"], b["color"]))
    return best_block["block"]

def combinedata(im, map_img):
    image_val = list(im.getdata())
    map_val = list(map_img.getdata())
    conversions = []
    for i in range(len(map_val)):
        conversions.append({
            "color": image_val[i],
            "pos": map_val[i],
            "block": ""
        })

    out = []
    for i in conversions:
        if i["color"][3] == 0 or i["pos"][3] == 0:
            continue
        else:
            out.append(i)
    return out

# nhan dien khuon mat AI
def detect_face_and_crop(pil_image):
    # Chuyển ảnh PIL sang định dạng OpenCV
    open_cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGBA2BGR)
    gray = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2GRAY)
    
    # Load bộ nhận diện khuôn mặt có sẵn
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
    
    if len(faces) > 0:
        # Lấy khuôn mặt đầu tiên tìm được
        (x, y, w, h) = faces[0]
        # Mở rộng vùng cắt một chút để lấy cả tóc
        face_crop = pil_image.crop((x, y, x+w, y+h))
        return face_crop.resize((8, 8), Image.Resampling.LANCZOS)
    
    # Nếu không tìm thấy mặt, trả về ảnh resize 8x8 tâm bình thường
    return pil_image.resize((8, 8), Image.Resampling.LANCZOS)

# nhan dien mau RGB tu dong 
def get_smart_palette(pil_image, num_colors=8):
    # Chuyển ảnh về mảng pixel
    img_array = np.array(pil_image.convert("RGB")).reshape(-1, 3)
    
    # Dùng AI K-Means để tìm ra các nhóm màu chính
    kmeans = KMeans(n_clusters=num_colors, n_init=10)
    kmeans.fit(img_array)
    
    # Trả về danh sách các màu chủ đạo (RGB)
    return kmeans.cluster_centers_.astype(int)

@app.route('/api/convert', methods=['POST', 'OPTIONS'])
def convert_skin():
    if request.method == 'OPTIONS': 
        return '', 200
        
    if 'skin' not in request.files:
        return jsonify({"error": "Chưa chọn file skin!"}), 400
    
    file = request.files['skin']
    
    try:
        # 1. Đọc file mapping và settings từ thư mục /api/
        map_path = os.path.join(BASE_DIR, 'mapping_4px.png')
        settings_path = os.path.join(BASE_DIR, 'settings.json')

        mapping = Image.open(map_path).convert("RGBA")
        skin = Image.open(file).convert("RGBA")
        
        try:
            with open(settings_path) as f:
                settings = json.load(f)
        except:
            settings = {"version": "JE_1_20_1"}

        schem = mcschematic.MCSchematic()
        conversions = combinedata(skin, mapping)
        
        # 2. Xử lý convert
        for i in range(len(conversions)):
            conversions[i]["block"] = findblockfromcolor(conversions[i])
            
        for i in conversions:
            x, y, z, *rest = i["pos"]
            schem.setBlock((x, y, z), i["block"])

        # 3. Lưu file vào thư mục rác tạm thời của máy chủ Vercel (/tmp)
        temp_dir = tempfile.gettempdir()
        output_name = "Skin_Converted"
        
        # Xác định phiên bản
        schem_version = mcschematic.Version.JE_1_20_1
        if "version" in settings:
            try:
                schem_version = getattr(mcschematic.Version, settings["version"])
            except: pass
            
        schem.save(temp_dir, output_name, schem_version)
        file_path = os.path.join(temp_dir, f"{output_name}.schem")
        
        # 4. Gửi file về cho người dùng tải
        return send_file(file_path, as_attachment=True, download_name="SkinCustom.schem")

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/ai-photo-to-skin', methods=['POST', 'OPTIONS'])
def ai_photo_to_skin():
    if request.method == 'OPTIONS': return '', 200
    
    try:
        file_input = request.files.get('image')
        if not file_input:
            return jsonify({"error": "Vui lòng tải ảnh chân dung!"}), 400

        mapping = Image.open(os.path.join(BASE_DIR, 'mapping_4px.png')).convert("RGBA")
        photo = Image.open(file_input).convert("RGBA")
        
        try:
        photo = Image.open(file_input).convert("RGBA")
        
        # BƯỚC 1: AI Nhận diện mặt cho vùng Đầu
        face_pixel = detect_face_and_crop(photo)
        
        # BƯỚC 2: AI Phân tích màu chủ đạo cho trang phục (vùng Thân/Chân)
        smart_colors = get_smart_palette(photo, num_colors=5)
        main_theme_color = tuple(smart_colors[0]) # Lấy màu chiếm diện tích lớn nhất
        
        # BƯỚC 3: Mapping thông minh
        mapping = Image.open(os.path.join(BASE_DIR, 'mapping_4px.png')).convert("RGBA")
        skin_final = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        map_data = list(mapping.getdata())
        mw, _ = mapping.size
        new_data = []

        for i, pixel_map in enumerate(map_data):
            if pixel_map[3] > 0:
                x, y = i % mw, i // mw
                
                if y < 16: # Vùng ĐẦU: Lấy từ kết quả nhận diện mặt
                    new_data.append(face_pixel.getpixel((x % 8, y % 8)))
                else: # Vùng THÂN/CHÂN: Hòa trộn màu gốc với Bảng màu thông minh
                    raw_c = photo.resize((16, 16)).getpixel((x % 16, y % 16))
                    # Pha 30% màu chủ đạo để skin có tone màu thống nhất
                    blended = tuple([int(raw_c[j]*0.7 + main_theme_color[j]*0.3) for j in range(3)] + [255])
                    new_data.append(blended)
            else:
                new_data.append((0, 0, 0, 0))
        
        # 3. Xuất file
        img_io = io.BytesIO()
        skin_final.save(img_io, 'PNG')
        img_io.seek(0)
        return send_file(img_io, mimetype='image/png', as_attachment=True, download_name="AI_Portrait_Skin.png")

    except Exception as e:
        return jsonify({"error": str(e)}), 500
     
@app.route('/api/pixel-scanner', methods=['POST', 'OPTIONS'])
def pixel_scanner():
    if request.method == 'OPTIONS': return '', 200
    
    try:
        file_input = request.files.get('image')
        # Lấy tham số độ phân giải pixel từ người dùng (mặc định là 64)
        pixel_size = int(request.form.get('size', 64)) 
        
        if not file_input:
            return jsonify({"error": "Vui lòng chọn ảnh để scan!"}), 400

        # 1. Đọc và tiền xử lý ảnh
        img = Image.open(file_input).convert("RGBA")
        
        # 2. Thuật toán Pixelate: Downscale và Upscale không làm nhòe (Nearest Neighbor)
        # Bước này tạo ra các ô vuông pixel đặc trưng
        img_small = img.resize((pixel_size, pixel_size), resample=Image.Resampling.BILINEAR)
        
        # 3. AI Color Quantization: Giảm bảng màu để tạo hiệu ứng tranh vẽ pixel
        # Sử dụng chế độ "P" (Palette) để ép ảnh về tối đa 32 màu chủ đạo
        img_pixel = img_small.convert("P", palette=Image.Palette.ADAPTIVE, colors=32).convert("RGBA")
        
        # 4. Phóng to lại để người dùng dễ nhìn (giữ nguyên độ sắc nét của ô vuông)
        result_img = img_pixel.resize((512, 512), resample=Image.Resampling.NEAREST)

        # 5. Xuất file trả về
        img_io = io.BytesIO()
        result_img.save(img_io, 'PNG')
        img_io.seek(0)
        
        return send_file(img_io, mimetype='image/png', as_attachment=True, download_name="CornNetwork_PixelArt.png")

    except Exception as e:
        return jsonify({"error": str(e)}), 500     
   
@app.route('/api/merge', methods=['POST', 'OPTIONS'])
def merge_skin():
    try:
        # 1. Lấy file từ request
        file_head = request.files.get('head')  # File lấy Đầu
        file_main = request.files.get('body')  # Skin GỐC (Lấy Thân & Chân)
        file_legs = request.files.get('legs')  # File lấy Chân (nếu có)

        if not file_main:
            return jsonify({"error": "Thiếu file Skin Gốc!"}), 400

        # 2. Mở ảnh gốc và tạo bản sao để xử lý
        img_main = Image.open(file_main).convert("RGBA")
        skin_final = img_main.copy()

        # 3. BƯỚC QUAN TRỌNG: CLEAR ĐẦU CŨ
        # Nếu người dùng có upload đầu mới, ta xóa trắng vùng đầu cũ trên skin_final
        if file_head:
            # Tọa độ vùng đầu trong Minecraft Skin (0,0 đến 64,16)
            # Vùng này bao gồm cả Head và Hat (lớp phủ 3D)
            clear_box = (0, 0, 64, 16)
            
            # Tạo một miếng trong suốt hoàn toàn để "tẩy" vùng đầu
            empty_head = Image.new("RGBA", (64, 16), (0, 0, 0, 0))
            skin_final.paste(empty_head, (0, 0)) # Xóa sạch vùng (0,0,64,16)

            # 4. RÁP ĐẦU MỚI VÀO
            img_head = Image.open(file_head).convert("RGBA")
            new_head_part = img_head.crop(clear_box)
            # Paste đầu mới vào vị trí đã được dọn sạch
            skin_final.paste(new_head_part, (0, 0), mask=new_head_part)

        # 5. GHÉP CHÂN (Nếu có file chân riêng thì thực hiện tương tự)
        if file_legs:
            img_legs = Image.open(file_legs).convert("RGBA")
            # Xóa & Ráp chân phải (0,16 -> 16,48)
            box_r_leg = (0, 16, 16, 48)
            skin_final.paste(Image.new("RGBA", (16, 32), (0,0,0,0)), (0, 16))
            skin_final.paste(img_legs.crop(box_r_leg), (0, 16), mask=img_legs.crop(box_r_leg))
            
            # Xóa & Ráp chân trái (Gồm Layer 1: 16,48-24,64 và Layer 2: 0,48-8,64)
            box_l_leg_1 = (16, 48, 24, 64)
            box_l_leg_2 = (0, 48, 8, 64)
            skin_final.paste(Image.new("RGBA", (8, 16), (0,0,0,0)), (16, 48))
            skin_final.paste(Image.new("RGBA", (8, 16), (0,0,0,0)), (0, 48))
            skin_final.paste(img_legs.crop(box_l_leg_1), (16, 48), mask=img_legs.crop(box_l_leg_1))
            skin_final.paste(img_legs.crop(box_l_leg_2), (0, 48), mask=img_legs.crop(box_l_leg_2))

        # 6. Xuất file qua BytesIO (nhớ import io ở đầu file)
        img_io = io.BytesIO()
        skin_final.save(img_io, 'PNG')
        img_io.seek(0)
        return send_file(img_io, mimetype='image/png', as_attachment=True, download_name="Corntoll_Skin.png")

    except Exception as e:
        return jsonify({"error": str(e)}), 500