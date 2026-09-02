import { db, doc, getDoc, updateDoc, serverTimestamp } from "./firebase-init.js";

const params = new URLSearchParams(location.search);
const noteId = params.get("id");
const contentEl = document.getElementById("content");
const msgEl = document.getElementById("msg");

// Giới hạn để đảm bảo cả phiếu vẫn nằm trong hạn mức 1MB/tài liệu của Firestore
const MAX_PHOTOS = 3;
const PHOTO_MAX_DIM = 900;      // px, cạnh dài nhất sau khi nén
const PHOTO_QUALITY = 0.55;     // chất lượng JPEG (0–1)
const SIG_MAX_DIM = 700;
const SIG_QUALITY = 0.7;

function fmtDate(d){
  if(!d) return "—";
  try{ return new Date(d).toLocaleDateString("vi-VN"); }catch(e){ return d; }
}

// Nén 1 file ảnh (từ camera/thư viện) thành chuỗi base64 (data URL), giới hạn kích thước
function compressImageFile(file, maxDim, quality){
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if(width > height && width > maxDim){
        height = Math.round(height * (maxDim / width));
        width = maxDim;
      }else if(height > maxDim){
        width = Math.round(width * (maxDim / height));
        height = maxDim;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Nén chữ ký từ signature_pad thành JPEG nhỏ (nền trắng đã có sẵn)
function compressSignature(sigPad, maxDim, quality){
  return new Promise((resolve) => {
    const srcCanvas = sigPad._canvas || document.getElementById("sigCanvas");
    let width = srcCanvas.width, height = srcCanvas.height;
    const ratio = Math.min(1, maxDim / Math.max(width, height));
    const outCanvas = document.createElement("canvas");
    outCanvas.width = Math.round(width * ratio);
    outCanvas.height = Math.round(height * ratio);
    const ctx = outCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
    ctx.drawImage(srcCanvas, 0, 0, outCanvas.width, outCanvas.height);
    resolve(outCanvas.toDataURL("image/jpeg", quality));
  });
}

function itemsTableHtml(items){
  if(!items || items.length === 0) return "<p style='color:var(--ink-soft)'>Không có sản phẩm.</p>";
  return `
  <div class="items-table-wrap">
  <table class="items-table" style="font-size:0.86rem">
    <thead><tr>
      <th>Sản phẩm</th><th>Quy cách</th><th>SL</th><th>Nhà sản xuất</th><th>Số Lot</th>
    </tr></thead>
    <tbody>
      ${items.map(it => `<tr>
        <td>${it.name||"—"}</td><td>${it.pack||"—"}</td><td>${it.qty||"—"}</td>
        <td>${it.mfr||"—"}</td><td>${it.lot||"—"}</td>
      </tr>`).join("")}
    </tbody>
  </table>
  </div>`;
}

function infoPanelHtml(n){
  return `
  <div class="panel">
    <div class="panel-head"><h2>Thông tin giao hàng</h2><span class="idx">${n.code || noteId}</span></div>
    <div class="panel-body">
      <div class="kv-grid">
        <div class="kv"><span class="k">Khách hàng</span><span class="v">${n.customerName||"—"}</span></div>
        <div class="kv"><span class="k">Mã số thuế</span><span class="v">${n.taxCode||"—"}</span></div>
        <div class="kv"><span class="k">Ngày giao</span><span class="v">${fmtDate(n.deliveryDate)}</span></div>
        <div class="kv"><span class="k">Thông tin xe</span><span class="v">${n.vehicleInfo||"—"}</span></div>
        <div class="kv"><span class="k">Tài xế</span><span class="v">${n.driverName||"—"}</span></div>
        <div class="kv"><span class="k">CCCD tài xế</span><span class="v">${n.driverCccd||"—"}</span></div>
      </div>
      <div class="kv" style="border-bottom:none"><span class="k">Địa chỉ giao hàng</span></div>
      <p style="margin-top:2px">${n.deliveryAddress||"—"}</p>
      <div class="doc-section-title">Sản phẩm</div>
      ${itemsTableHtml(n.items)}
    </div>
  </div>`;
}

async function load(){
  if(!noteId){
    contentEl.innerHTML = `<div class="msg error">Link không hợp lệ: thiếu mã phiếu.</div>`;
    return;
  }
  try{
    const snap = await getDoc(doc(db, "deliveryNotes", noteId));
    if(!snap.exists()){
      contentEl.innerHTML = `<div class="msg error">Không tìm thấy phiếu giao hàng này.</div>`;
      return;
    }
    const n = snap.data();
    if(n.status === "done"){
      renderDone(n);
    }else{
      renderForm(n);
    }
  }catch(e){
    console.error(e);
    contentEl.innerHTML = `<div class="msg error">Lỗi tải phiếu: ${e.message}</div>`;
  }
}

function renderDone(n){
  contentEl.innerHTML = `
    <div class="msg ok">✔ Phiếu này đã được ký nhận. Cảm ơn quý khách!</div>
    ${infoPanelHtml(n)}
    <div class="panel">
      <div class="panel-head"><h2>Xác nhận đã nhận hàng</h2></div>
      <div class="panel-body">
        <div class="kv-grid">
          <div class="kv"><span class="k">Người nhận</span><span class="v">${n.receiverName||"—"}</span></div>
          <div class="kv"><span class="k">Giờ giao</span><span class="v">${n.deliveredAt||"—"}</span></div>
        </div>
        ${n.signatureImage ? `<div class="doc-section-title">Chữ ký</div><img src="${n.signatureImage}" style="max-width:260px;border:1px solid var(--paper-line);border-radius:4px;">` : ""}
        ${n.vehiclePhotos && n.vehiclePhotos.length ? `<div class="doc-section-title">Hình ảnh xe giao hàng</div><div class="photo-strip">${n.vehiclePhotos.map(u=>`<img src="${u}">`).join("")}</div>` : ""}
      </div>
    </div>
  `;
}

function renderForm(n){
  contentEl.innerHTML = `
    <div class="readonly-note">Vui lòng kiểm tra thông tin bên dưới, sau đó điền xác nhận và bấm Lưu.</div>
    ${infoPanelHtml(n)}
    <form id="signForm">
      <div class="panel">
        <div class="panel-head"><h2>Xác nhận nhận hàng</h2></div>
        <div class="panel-body">
          <div class="field">
            <label for="receiverName">Người nhận *</label>
            <input type="text" id="receiverName" required placeholder="Họ tên người nhận hàng">
          </div>
          <div class="field">
            <label for="deliveredTime">Giờ giao *</label>
            <input type="time" id="deliveredTime" required>
          </div>
          <div class="field">
            <label>Ký tên *</label>
            <div class="sigpad-wrap"><canvas id="sigCanvas"></canvas></div>
            <div class="sigpad-actions">
              <button type="button" class="btn ghost small" id="clearSig">Xóa chữ ký</button>
            </div>
            <div class="hint">Dùng ngón tay ký trực tiếp vào khung trắng phía trên.</div>
          </div>
          <div class="field">
            <label>Chụp hình xe giao hàng * (tối đa ${MAX_PHOTOS} ảnh)</label>
            <div class="photo-input-row">
              <label class="btn ghost small" style="cursor:pointer;">
                📷 Chụp / chọn ảnh
                <input type="file" id="photoInput" accept="image/*" capture="environment" multiple style="display:none;">
              </label>
            </div>
            <div class="photo-preview" id="photoPreview"></div>
            <div class="hint">Ảnh sẽ được tự động nén nhỏ lại trước khi lưu.</div>
          </div>
        </div>
      </div>
      <button type="submit" class="btn amber block" id="saveBtn">Lưu xác nhận giao hàng</button>
    </form>
  `;

  const now = new Date();
  document.getElementById("deliveredTime").value =
    `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

  // ----- Signature pad -----
  const canvas = document.getElementById("sigCanvas");
  function resizeCanvas(){
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    if(window._sigPad) window._sigPad.clear();
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  const sigPad = new SignaturePad(canvas, { backgroundColor: "#ffffff" });
  window._sigPad = sigPad;

  document.getElementById("clearSig").addEventListener("click", () => sigPad.clear());

  // ----- Photo capture -----
  const photoInput = document.getElementById("photoInput");
  const photoPreview = document.getElementById("photoPreview");
  let photoFiles = [];

  photoInput.addEventListener("change", () => {
    const incoming = Array.from(photoInput.files);
    const currentCount = photoFiles.filter(f => f).length;
    if(currentCount + incoming.length > MAX_PHOTOS){
      msgEl.innerHTML = `<div class="msg error">Chỉ được chọn tối đa ${MAX_PHOTOS} ảnh.</div>`;
      window.scrollTo({top:0, behavior:"smooth"});
    }
    const allowed = incoming.slice(0, Math.max(0, MAX_PHOTOS - currentCount));
    allowed.forEach(file => {
      photoFiles.push(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.createElement("div");
        div.className = "thumb";
        const idx = photoFiles.length - 1;
        div.innerHTML = `<img src="${e.target.result}"><button type="button">✕</button>`;
        div.querySelector("button").addEventListener("click", () => {
          photoFiles[idx] = null;
          div.remove();
        });
        photoPreview.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
    photoInput.value = "";
  });

  // ----- Submit -----
  document.getElementById("signForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    msgEl.innerHTML = "";

    if(sigPad.isEmpty()){
      msgEl.innerHTML = `<div class="msg error">Vui lòng ký tên trước khi lưu.</div>`;
      window.scrollTo({top:0, behavior:"smooth"});
      return;
    }
    const remainingPhotos = photoFiles.filter(f => f);
    if(remainingPhotos.length === 0){
      msgEl.innerHTML = `<div class="msg error">Vui lòng chụp ít nhất một hình ảnh xe giao hàng.</div>`;
      window.scrollTo({top:0, behavior:"smooth"});
      return;
    }

    const saveBtn = document.getElementById("saveBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Đang nén & lưu...";

    try{
      // 1) Nén chữ ký thành base64 nhỏ gọn
      const signatureImage = await compressSignature(sigPad, SIG_MAX_DIM, SIG_QUALITY);

      // 2) Nén từng ảnh xe thành base64 nhỏ gọn
      const vehiclePhotos = [];
      for(const file of remainingPhotos){
        const dataUrl = await compressImageFile(file, PHOTO_MAX_DIM, PHOTO_QUALITY);
        vehiclePhotos.push(dataUrl);
      }

      // 3) Kiểm tra tổng dung lượng trước khi lưu (Firestore giới hạn ~1MB/tài liệu)
      const totalBytes = [signatureImage, ...vehiclePhotos].reduce((s, d) => s + d.length, 0);
      if(totalBytes > 850000){
        msgEl.innerHTML = `<div class="msg error">Ảnh vẫn còn quá lớn sau khi nén, vui lòng chụp lại với ít ảnh hơn hoặc thử lại.</div>`;
        window.scrollTo({top:0, behavior:"smooth"});
        saveBtn.disabled = false;
        saveBtn.textContent = "Lưu xác nhận giao hàng";
        return;
      }

      // 4) Cập nhật phiếu giao hàng trực tiếp trong Firestore
      await updateDoc(doc(db, "deliveryNotes", noteId), {
        receiverName: document.getElementById("receiverName").value.trim(),
        deliveredAt: document.getElementById("deliveredTime").value,
        signatureImage,
        vehiclePhotos,
        status: "done",
        completedAt: serverTimestamp()
      });

      msgEl.innerHTML = `<div class="msg ok">✔ Đã lưu xác nhận giao hàng thành công. Cảm ơn quý khách!</div>`;
      const snap = await getDoc(doc(db, "deliveryNotes", noteId));
      renderDone(snap.data());
      window.scrollTo({top:0, behavior:"smooth"});
    }catch(err){
      console.error(err);
      msgEl.innerHTML = `<div class="msg error">Lỗi khi lưu: ${err.message}</div>`;
      saveBtn.disabled = false;
      saveBtn.textContent = "Lưu xác nhận giao hàng";
    }
  });
}

load();
