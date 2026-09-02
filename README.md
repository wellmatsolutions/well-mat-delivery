# Hệ thống Phiếu Giao Hàng — Well Mat Solutions

Website tĩnh (đăng trên GitHub Pages) để tạo phiếu giao hàng, gửi link cho tài xế/khách hàng ký nhận trên điện thoại (chữ ký, chụp hình xe, giờ giao), lưu dữ liệu trên Firebase và tải phiếu về dưới dạng PDF.

**Kiến trúc:** chỉ dùng **Firestore** (cơ sở dữ liệu) + **Authentication** (đăng nhập quản trị) — cả hai đều nằm trong gói **Spark miễn phí hoàn toàn** của Firebase, không cần khai thẻ ngân hàng. Ảnh chữ ký và hình xe giao hàng được **nén nhỏ ngay trên điện thoại** trước khi lưu thẳng vào Firestore (không dùng Firebase Storage, vì từ 03/2026 Google bắt buộc Storage phải có gói Blaze trả phí dù dùng ít).

## Cấu trúc file
```
index.html      → Danh sách phiếu giao hàng (trang chủ, cần đăng nhập)
create.html     → Tạo phiếu giao hàng mới, sinh link gửi tài xế (cần đăng nhập)
driver.html     → Trang tài xế/khách hàng mở trên điện thoại để ký nhận (mở tự do)
view.html       → Xem chi tiết phiếu + tải PDF (cần đăng nhập)
css/style.css   → Giao diện
js/             → Toàn bộ logic (Firebase, form, ký tên, nén ảnh, PDF...)
assets/logo.png → Logo công ty
assets/stamp.png→ Con dấu công ty, được chèn mờ lên ô ký "Bên giao"
```

## Bước 1 — Tạo dự án Firebase (miễn phí, ~5 phút)

1. Vào https://console.firebase.google.com → **Add project** → đặt tên (VD: `wellmat-delivery`) → bỏ Google Analytics cho đơn giản → Create.
2. Trong dự án, vào **Build → Firestore Database → Create database** → chọn **Start in production mode** → chọn khu vực gần Việt Nam (VD: `asia-southeast1`) → Enable.
3. Vào **Project settings** (biểu tượng bánh răng) → mục **Your apps** → bấm biểu tượng **</>** (Web) → đặt tên app (VD: `web`) → Register app.
4. Firebase sẽ hiện đoạn `firebaseConfig = {...}`. Copy các giá trị này vào file **`js/firebase-config.js`**, thay các dòng `DÁN_...` bằng giá trị thật:
   ```js
   export const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "wellmat-delivery.firebaseapp.com",
     projectId: "wellmat-delivery",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
   (Không cần `storageBucket` vì ứng dụng không dùng Firebase Storage.)

## Bước 2 — Tạo tài khoản đăng nhập quản trị (Firebase Authentication)

Trang **Danh sách phiếu**, **Tạo phiếu mới** và **Xem chi tiết** yêu cầu đăng nhập — chỉ người có tài khoản mới xem được danh sách khách hàng và tạo phiếu. Trang **driver.html** (tài xế/khách ký nhận) vẫn mở tự do, không cần đăng nhập.

1. Trong Firebase Console, vào **Build → Authentication → Get started**.
2. Tab **Sign-in method** → bật **Email/Password** → Save.
3. Tab **Users** → **Add user** → nhập email quản trị (VD: `admin@wellmat.com`, không cần là email thật, chỉ cần đúng định dạng) và đặt mật khẩu → Add user.
4. Lặp lại để tạo thêm tài khoản cho từng nhân viên nếu cần.
5. Khi vào `index.html`/`create.html`/`view.html`, hệ thống sẽ hiện màn hình đăng nhập — nhập đúng email/mật khẩu vừa tạo là vào được. Có nút **Đăng xuất** trên thanh điều hướng.

## Bước 3 — Thiết lập Security Rules (bắt buộc, quyết định việc dữ liệu có bị lộ hay không)

Đây là bước quan trọng nhất để **chặn người ngoài gọi thẳng API tải dữ liệu khách hàng** mà không cần qua giao diện web.

Vào **Firestore Database → tab *Rules*** → **xóa sạch nội dung mặc định đang có** (kể cả đoạn `match /{document=**} { allow read, write: if false; }`) → dán đúng **một khối duy nhất** sau vào:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /deliveryNotes/{noteId} {
      // Xem 1 phiếu theo ID (driver.html, view.html) — ai có link đều xem được phiếu đó
      allow get: if true;
      // Liệt kê TOÀN BỘ phiếu (index.html) — chỉ cho phép khi đã đăng nhập
      allow list: if request.auth != null;
      // Tạo phiếu mới — chỉ cho phép khi đã đăng nhập (create.html)
      allow create: if request.auth != null;
      // Cập nhật (tài xế ký nhận) — cho phép công khai, nhưng chỉ được đổi
      // đúng các trường ký nhận, không được sửa thông tin khách hàng/sản phẩm
      allow update: if request.resource.data.diff(resource.data).affectedKeys()
                        .hasOnly(['receiverName','signatureImage','deliveredAt','vehiclePhotos','status','completedAt']);
      allow delete: if request.auth != null;
    }

    // Mọi collection khác ngoài deliveryNotes: khóa hoàn toàn
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Bấm **Publish**. (Không cần thiết lập Storage Rules vì ứng dụng không dùng Firebase Storage.)

> **Vì sao vẫn an toàn dù `allow get: if true`?** Vì `get` chỉ cho đọc **đúng 1 phiếu khi biết chính xác ID** (như một mã bí mật trong link) — không cho liệt kê hay dò danh sách toàn bộ khách hàng. Việc liệt kê (`list`) mới là thứ để lộ toàn bộ dữ liệu, và đã bị khóa lại yêu cầu đăng nhập.

## Vì sao không dùng Firebase Storage?

Kể từ 03/02/2026, Google bắt buộc phải nâng cấp lên gói **Blaze** (trả theo mức dùng, cần khai thẻ ngân hàng) mới được dùng Firebase Storage, dù dùng rất ít. Để tránh việc này, hệ thống nén ảnh chữ ký và hình xe giao hàng ngay trên điện thoại tài xế (giảm kích thước ảnh xuống còn vài trăm KB) rồi lưu thẳng vào Firestore — vẫn nằm gọn trong gói Spark miễn phí.

**Giới hạn cần biết:** Firestore giới hạn mỗi tài liệu (mỗi phiếu) tối đa khoảng 1MB. Vì vậy:
- Ảnh xe giao hàng: tối đa **3 ảnh/phiếu**, tự động nén còn khoảng 900px & chất lượng vừa phải.
- Chữ ký: tự động nén nhỏ.
- Nếu vẫn báo "ảnh quá lớn" sau khi nén, hãy chụp lại với ít ảnh hơn hoặc ảnh đơn giản hơn (ít chi tiết/ít sáng).

Nếu sau này muốn lưu ảnh chất lượng cao không giới hạn, có thể nâng cấp lên gói Blaze và khôi phục lại Firebase Storage — báo lại để được hỗ trợ chuyển đổi.

## Xử lý lỗi "Không đăng nhập được vào trang quản trị"

Kiểm tra lần lượt theo thứ tự sau — đây là các nguyên nhân phổ biến nhất:

1. **Chưa bật phương thức đăng nhập Email/Password** — vào Firebase Console → **Authentication → Sign-in method** → kiểm tra dòng **Email/Password** đã ở trạng thái **Enabled** chưa. Đây là nguyên nhân hay gặp nhất (dễ quên bước này). Nếu chưa bật, hệ thống sẽ báo lỗi "Chưa bật đăng nhập Email/Password...".
2. **Chưa tạo tài khoản, hoặc tạo nhầm chỗ** — vào **Authentication → Users**, kiểm tra email quản trị có nằm trong danh sách không. Lưu ý: tài khoản này khác hoàn toàn với việc thêm dữ liệu vào Firestore — phải tạo đúng ở tab **Authentication → Users → Add user**, không phải ở Firestore Database.
3. **Gõ sai email/mật khẩu** — kiểm tra không có khoảng trắng thừa ở đầu/cuối, đúng hoa/thường của mật khẩu.
4. **Bị khóa tạm do thử sai quá nhiều lần** — Firebase sẽ tạm khóa vài phút sau nhiều lần đăng nhập sai liên tục (báo lỗi "quá nhiều lần"). Đợi khoảng 5–10 phút rồi thử lại, hoặc đặt lại mật khẩu ở bước 5.
5. **Cấu hình `js/firebase-config.js` sai** — kiểm tra lại `apiKey`, `authDomain`, `projectId`... đã copy đúng, đủ, không thiếu dấu ngoặc/dấu phẩy so với Firebase Console → Project settings.
6. **Quên mật khẩu / muốn đổi mật khẩu** — vào **Authentication → Users** → chọn tài khoản → bấm vào dòng ba chấm (⋮) → **Reset password**, hoặc xóa và tạo lại tài khoản mới.
7. **Xem lỗi cụ thể:** mở trang trên máy tính, bấm F12 → tab Console, thử đăng nhập lại, đọc dòng lỗi đỏ bắt đầu bằng `FirebaseError: auth/...` — gửi lại mã lỗi đó (VD: `auth/user-not-found`) để được hỗ trợ chính xác hơn.

## Xử lý lỗi "Không lưu được sau khi ký/chụp ảnh"

1. **Đã Publish Rules chưa?** (xem Bước 3) — quên bấm Publish là nguyên nhân phổ biến nhất.
2. **Đã tạo Firestore Database chưa?** — vào Build → Firestore Database, nếu chưa từng bấm "Create database" thì mọi thao tác lưu sẽ lỗi.
3. **Ảnh quá lớn sau khi nén?** — thử chụp lại với ít ảnh hơn (tối đa 3 ảnh) hoặc ảnh đơn giản hơn.
4. **Xem lỗi cụ thể:** trên điện thoại tài xế, mượn máy tính mở lại đúng link đó, bấm F12 → tab Console để xem dòng lỗi đỏ (thường bắt đầu bằng `FirebaseError:`), gửi lại dòng đó để được hỗ trợ chính xác hơn.

## Về cảnh báo "lộ API key"

`apiKey` trong `js/firebase-config.js` **không phải là khóa bí mật** — Firebase thiết kế để giá trị này xuất hiện công khai trong mã nguồn mọi trang web dùng Firebase (khác hẳn API key server truyền thống). GitHub/Google có công cụ tự động quét và cảnh báo bất kỳ chuỗi nào giống API key, kể cả loại được phép công khai như thế này. Bảo mật thật sự nằm ở Security Rules (Bước 3) và Authentication (Bước 2).

Muốn thêm một lớp phòng thủ nữa: vào **Google Cloud Console → APIs & Services → Credentials** → chọn API key của dự án → mục **Application restrictions** → chọn **Websites** → thêm domain GitHub Pages của bạn (VD: `ten-user.github.io/*`).

## Bước 4 — Thay logo và con dấu công ty

- Thay file `assets/logo.png` bằng logo thật (nền trong suốt, cao khoảng 120px).
- Thay file `assets/stamp.png` bằng ảnh con dấu công ty đã cắt nền trong suốt (định dạng PNG). File này sẽ tự động được chèn mờ lên góc chữ ký "Bên giao" trong phiếu xem/tải PDF (`view.html`).
- Thông tin công ty (tên, địa chỉ, hotline, email) đã có sẵn trong `js/firebase-config.js`, mục `COMPANY` — sửa trực tiếp nếu cần thay đổi sau này.

## Bước 5 — Đăng lên GitHub Pages

1. Tạo repo mới trên GitHub (VD: `wellmat-delivery`), tải toàn bộ các file/thư mục trong gói này lên (giữ nguyên cấu trúc thư mục).
2. Vào **Settings → Pages** của repo → **Source**: chọn nhánh `main`, thư mục `/ (root)` → Save.
3. Sau 1–2 phút, GitHub sẽ cấp link dạng: `https://<tên-user>.github.io/wellmat-delivery/`
4. Mở link đó → đăng nhập bằng tài khoản quản trị đã tạo ở Bước 2 → bạn sẽ thấy trang danh sách phiếu giao hàng.

## Cách sử dụng hằng ngày

1. Vào trang web → đăng nhập → **Tạo phiếu mới** → điền thông tin khách hàng, sản phẩm, xe, tài xế → **Tạo phiếu & lấy link gửi tài xế**.
2. Copy link (hoặc quét mã QR hiển thị) → gửi cho tài xế qua Zalo/SMS.
3. Tài xế mở link trên điện thoại → sau khi giao hàng xong, khách hàng điền **Người nhận**, **ký tên** trực tiếp trên màn hình, **chụp hình xe giao hàng** (tối đa 3 ảnh), kiểm tra **giờ giao** → bấm **Lưu**.
4. Bạn quay lại trang **Danh sách phiếu** trên website → phiếu sẽ hiện trạng thái **✔ Đã ký nhận** → bấm vào để xem chi tiết → bấm **Tải PDF** để lưu về máy hoặc in.

## Ghi chú

- Firestore gói Spark miễn phí cho phép 1GiB dữ liệu lưu trữ — với mỗi phiếu ước tính vài trăm KB, đủ dùng cho hàng nghìn phiếu.
- Đăng nhập quản trị dùng Firebase Authentication thật (Bước 2) kết hợp Security Rules (Bước 3) — cả hai đều cần thiết lập, thiếu một trong hai vẫn có thể bị lộ dữ liệu.
- Nếu cần sửa/xóa một phiếu đã tạo sai, thao tác trực tiếp trong Firebase Console → Firestore Database → collection `deliveryNotes`.
- Quên mật khẩu quản trị: vào Firebase Console → Authentication → Users → chọn tài khoản → đặt lại mật khẩu.
