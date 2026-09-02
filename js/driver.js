import {
  db, storage, doc, getDoc, updateDoc, serverTimestamp,
  ref, uploadString, uploadBytes, getDownloadURL
} from "./firebase-init.js";

const params = new URLSearchParams(location.search);
const noteId = params.get("id");
const contentEl = document.getElementById("content");
const msgEl = document.getElementById("msg");

function fmtDate(d){
  if(!d) return "—";
  try{ return new Date(d).toLocaleDateString("vi-VN"); }catch(e){ return d; }
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
        ${n.signatureUrl ? `<div class="doc-section-title">Chữ ký</div><img src="${n.signatureUrl}" style="max-width:260px;border:1px solid var(--paper-line);border-radius:4px;">` : ""}
        ${n.vehiclePhotoUrls && n.vehiclePhotoUrls.length ? `<div class="doc-section-title">Hình ảnh xe giao hàng</div><div class="photo-strip">${n.vehiclePhotoUrls.map(u=>`<img src="${u}">`).join("")}</div>` : ""}
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
            <label>Chụp hình xe giao hàng *</label>
            <div class="photo-input-row">
              <label class="btn ghost small" style="cursor:pointer;">
                📷 Chụp / chọn ảnh
                <input type="file" id="photoInput" accept="image/*" capture="environment" multiple style="display:none;">
              </label>
            </div>
            <div class="photo-preview" id="photoPreview"></div>
          </div>
        </div>
      </div>
      <button type="submit" class="btn amber block" id="saveBtn">Lưu xác nhận giao hàng</button>
    </form>
  `;

  // Mặc định giờ giao = giờ hiện tại
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
    Array.from(photoInput.files).forEach(file => {
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
    saveBtn.textContent = "Đang lưu...";

    try{
      // 1) Tải chữ ký lên Storage
      const sigDataUrl = sigPad.toDataURL("image/png");
      const sigRef = ref(storage, `deliveryNotes/${noteId}/signature_${Date.now()}.png`);
      await uploadString(sigRef, sigDataUrl, "data_url");
      const signatureUrl = await getDownloadURL(sigRef);

      // 2) Tải hình ảnh xe lên Storage
      const photoUrls = [];
      for(let i=0; i<remainingPhotos.length; i++){
        const file = remainingPhotos[i];
        const pRef = ref(storage, `deliveryNotes/${noteId}/photo_${Date.now()}_${i}.jpg`);
        await uploadBytes(pRef, file);
        photoUrls.push(await getDownloadURL(pRef));
      }

      // 3) Cập nhật phiếu giao hàng
      await updateDoc(doc(db, "deliveryNotes", noteId), {
        receiverName: document.getElementById("receiverName").value.trim(),
        deliveredAt: document.getElementById("deliveredTime").value,
        signatureUrl,
        vehiclePhotoUrls: photoUrls,
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
