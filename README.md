# Hệ thống Phiếu Giao Hàng — Well Mat Solutions

Website tĩnh (đăng trên GitHub Pages) để tạo phiếu giao hàng, gửi link cho tài xế/khách hàng ký nhận trên điện thoại (chữ ký, chụp hình xe, giờ giao), lưu dữ liệu trên Firebase và tải phiếu về dưới dạng PDF.

## Cấu trúc file
```
index.html      → Danh sách phiếu giao hàng (trang chủ)
create.html     → Tạo phiếu giao hàng mới, sinh link gửi tài xế
driver.html     → Trang tài xế/khách hàng mở trên điện thoại để ký nhận
view.html       → Xem chi tiết phiếu + tải PDF
css/style.css   → Giao diện
js/             → Toàn bộ logic (Firebase, form, ký tên, PDF...)
assets/logo.png → Logo công ty (đổi bằng logo thật của bạn)
assets/stamp.png→ Con dấu công ty, được chèn mờ lên ô ký "Bên giao" (đổi bằng file con dấu thật, nền trong suốt PNG)
```

## Bước 1 — Tạo dự án Firebase (miễn phí, ~5 phút)

1. Vào https://console.firebase.google.com → **Add project** → đặt tên (VD: `wellmat-delivery`) → bỏ Google Analytics cho đơn giản → Create.
2. Trong dự án, vào **Build → Firestore Database → Create database** → chọn **Start in production mode** → chọn khu vực gần Việt Nam (VD: `asia-southeast1`) → Enable.
3. Vào **Build → Storage → Get started** → giữ mặc định → Done.
4. Vào **Project settings** (biểu tượng bánh răng) → mục **Your apps** → bấm biểu tượng **</>** (Web) → đặt tên app (VD: `web`) → Register app.
5. Firebase sẽ hiện đoạn `firebaseConfig = {...}`. Copy các giá trị này vào file **`js/firebase-config.js`**, thay các dòng `DÁN_...` bằng giá trị thật:
   ```js
   export const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "wellmat-delivery.firebaseapp.com",
     projectId: "wellmat-delivery",
     storageBucket: "wellmat-delivery.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```

## Bước 2 — Cấp quyền đọc/ghi cho Firestore & Storage

Vì đây là công cụ nội bộ dùng link riêng (không có đăng nhập), ta mở quyền đọc/ghi cơ bản. **Lưu ý:** link phiếu (driver.html?id=...) đóng vai trò như mã bí mật — chỉ người có link mới xem/sửa được phiếu đó, nhưng ai đoán được ID vẫn có thể truy cập. Với quy mô nội bộ công ty là đủ an toàn; nếu cần chặt chẽ hơn, có thể bổ sung Firebase Authentication sau.

**Firestore rules** (tab *Rules* trong Firestore Database):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /deliveryNotes/{noteId} {
      allow read: if true;
      allow create: if true;
      allow update: if true;
      allow delete: if false;
    }
  }
}
```

**Storage rules** (tab *Rules* trong Storage):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /deliveryNotes/{noteId}/{fileName} {
      allow read: if true;
      allow write: if request.resource.size < 10 * 1024 * 1024;
    }
  }
}
```
Bấm **Publish** sau khi dán mỗi phần rules.

## Bước 3 — Thay logo và con dấu công ty

- Thay file `assets/logo.png` bằng logo thật (nền trong suốt, cao khoảng 120px).
- Thay file `assets/stamp.png` bằng ảnh con dấu công ty đã cắt nền trong suốt (định dạng PNG). File này sẽ tự động được chèn mờ lên góc chữ ký "Bên giao" trong phiếu xem/tải PDF (`view.html`).
- Thông tin công ty (tên, địa chỉ, hotline, email) đã có sẵn trong `js/firebase-config.js`, mục `COMPANY` — sửa trực tiếp nếu cần thay đổi sau này.

## Bước 4 — Đăng lên GitHub Pages

1. Tạo repo mới trên GitHub (VD: `wellmat-delivery`), tải toàn bộ các file/thư mục trong gói này lên (giữ nguyên cấu trúc thư mục).
2. Vào **Settings → Pages** của repo → **Source**: chọn nhánh `main`, thư mục `/ (root)` → Save.
3. Sau 1–2 phút, GitHub sẽ cấp link dạng: `https://<tên-user>.github.io/wellmat-delivery/`
4. Mở link đó → bạn sẽ thấy trang danh sách phiếu giao hàng.

## Cách sử dụng hằng ngày

1. Vào trang web → **Tạo phiếu mới** → điền thông tin khách hàng, sản phẩm, xe, tài xế → **Tạo phiếu & lấy link gửi tài xế**.
2. Copy link (hoặc quét mã QR hiển thị) → gửi cho tài xế qua Zalo/SMS.
3. Tài xế mở link trên điện thoại → sau khi giao hàng xong, khách hàng điền **Người nhận**, **ký tên** trực tiếp trên màn hình, **chụp hình xe giao hàng**, kiểm tra **giờ giao** → bấm **Lưu**.
4. Bạn quay lại trang **Danh sách phiếu** trên website (từ máy tính) → phiếu sẽ hiện trạng thái **✔ Đã ký nhận** → bấm vào để xem chi tiết → bấm **Tải PDF** để lưu về máy hoặc in.

## Ghi chú

- Toàn bộ dữ liệu (thông tin phiếu, chữ ký, hình ảnh) lưu trên Firebase (gói miễn phí Spark đủ dùng cho vài trăm phiếu/tháng).
- Nếu muốn giới hạn ai được vào trang tạo phiếu (`create.html`) và danh sách (`index.html`), có thể thêm Firebase Authentication (đăng nhập email/mật khẩu) — có thể bổ sung sau nếu cần, chỉ dùng nội bộ công ty.
- Nếu cần sửa/xóa một phiếu đã tạo sai, hiện tại thao tác trực tiếp trong Firebase Console → Firestore Database → collection `deliveryNotes`.
