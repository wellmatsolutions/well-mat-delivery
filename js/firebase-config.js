// =====================================================================
// CẤU HÌNH FIREBASE — điền thông tin dự án Firebase của bạn vào đây.
// Xem hướng dẫn lấy các giá trị này trong README.md (Bước 1).
// =====================================================================
export const firebaseConfig = {
  apiKey: "DÁN_API_KEY_VÀO_ĐÂY",
  authDomain: "TÊN-DỰ-ÁN.firebaseapp.com",
  projectId: "TÊN-DỰ-ÁN",
  messagingSenderId: "DÁN_SENDER_ID",
  appId: "DÁN_APP_ID"
};
// Ghi chú: không cần "storageBucket" — ứng dụng không dùng Firebase Storage
// (ảnh/chữ ký được nén và lưu trực tiếp trong Firestore, xem README.md).

// Ghi chú về "apiKey": giá trị này KHÔNG phải là khóa bí mật — Firebase
// thiết kế để apiKey lộ ra công khai trong mã nguồn web (khác với API key
// của server truyền thống). Việc GitHub/Google quét thấy và cảnh báo là
// hành vi tự động bình thường. Bảo mật thật sự nằm ở Security Rules của
// Firestore và Firebase Authentication — xem README.md.

// Thông tin công ty — dùng làm mặc định trên mọi phiếu giao hàng.
export const COMPANY = {
  name: "CÔNG TY TNHH WELL MAT SOLUTIONS",
  address: "Tầng 5, 231-233 Lê Thánh Tôn, Phường Bến Thành, TP Hồ Chí Minh, Việt Nam",
  hotline: "Hotline kỹ thuật 24/7: +84 384 871 216",
  email: "sales@well-mat.com",
  // Đặt file logo tại assets/logo.png và file con dấu tại assets/stamp.png
  logo: "assets/logo.png",
  stamp: "assets/stamp.png"
};
