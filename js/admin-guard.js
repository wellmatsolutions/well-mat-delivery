// =====================================================================
// ĐĂNG NHẬP QUẢN TRỊ — dùng Firebase Authentication (email/mật khẩu) thật.
// Khác với mật khẩu cũ, cách này an toàn thật sự vì Security Rules của
// Firestore/Storage có thể kiểm tra "đã đăng nhập hay chưa" trước khi cho
// đọc/ghi dữ liệu — chứ không chỉ ẩn giao diện web.
//
// Cách tạo tài khoản quản trị: xem README.md, mục "Bước 2 — Tạo tài khoản
// đăng nhập quản trị".
// =====================================================================
import { auth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "./firebase-init.js";

function buildOverlay(){
  const overlay = document.createElement("div");
  overlay.id = "authGateOverlay";
  overlay.innerHTML = `
    <div class="auth-gate-box">
      <img src="assets/logo.png" alt="Well Mat Solutions" class="auth-gate-logo" onerror="this.style.display='none'">
      <h2>Khu vực quản trị</h2>
      <p>Đăng nhập bằng tài khoản quản trị để truy cập trang quản lý phiếu giao hàng.</p>
      <form id="authGateForm">
        <input type="email" id="authGateEmail" placeholder="Email quản trị" autocomplete="username">
        <input type="password" id="authGatePw" placeholder="Mật khẩu" autocomplete="current-password">
        <button type="submit" class="btn amber block">Đăng nhập</button>
      </form>
      <div id="authGateErr" class="auth-gate-err"></div>
    </div>`;
  document.body.appendChild(overlay);

  const emailInput = document.getElementById("authGateEmail");
  const pwInput = document.getElementById("authGatePw");
  const errEl = document.getElementById("authGateErr");
  emailInput.focus();

  document.getElementById("authGateForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    errEl.textContent = "";
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    btn.textContent = "Đang đăng nhập...";
    try{
      await signInWithEmailAndPassword(auth, emailInput.value.trim(), pwInput.value);
      // onAuthStateChanged bên dưới sẽ tự động gỡ overlay khi đăng nhập thành công
    }catch(err){
      let text = "Đăng nhập thất bại, vui lòng thử lại.";
      if(err.code === "auth/invalid-email") text = "Email không hợp lệ.";
      if(err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found")
        text = "Sai email hoặc mật khẩu.";
      if(err.code === "auth/too-many-requests") text = "Bạn đã thử sai quá nhiều lần, vui lòng đợi vài phút rồi thử lại (hoặc đặt lại mật khẩu trong Firebase Console).";
      if(err.code === "auth/operation-not-allowed") text = "Chưa bật đăng nhập Email/Password trong Firebase Console (Authentication → Sign-in method).";
      if(err.code === "auth/network-request-failed") text = "Lỗi kết nối mạng, vui lòng kiểm tra lại internet.";
      if(err.code === "auth/api-key-not-valid" || err.code === "auth/invalid-api-key") text = "Cấu hình Firebase (apiKey) trong firebase-config.js không đúng.";
      if(!["auth/invalid-email","auth/invalid-credential","auth/wrong-password","auth/user-not-found","auth/too-many-requests","auth/operation-not-allowed","auth/network-request-failed","auth/api-key-not-valid","auth/invalid-api-key"].includes(err.code)){
        text = `Đăng nhập thất bại (mã lỗi: ${err.code || "không rõ"}). Mở Console trình duyệt (F12) để xem chi tiết.`;
      }
      errEl.textContent = text;
      btn.disabled = false;
      btn.textContent = "Đăng nhập";
    }
  });
}

onAuthStateChanged(auth, (user) => {
  document.documentElement.style.visibility = "visible";
  const existing = document.getElementById("authGateOverlay");

  if(user){
    if(existing) existing.remove();
    const logoutBtn = document.getElementById("logoutBtn");
    if(logoutBtn){
      logoutBtn.style.display = "inline";
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        signOut(auth);
      });
    }
  }else{
    if(!existing) buildOverlay();
  }
});
