import { db, doc, getDoc } from "./firebase-init.js";
import { COMPANY } from "./firebase-config.js";

const params = new URLSearchParams(location.search);
const noteId = params.get("id");
const docWrap = document.getElementById("docWrap");
const msgEl = document.getElementById("msg");
const linkBoxWrap = document.getElementById("linkBoxWrap");
const statusLine = document.getElementById("statusLine");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

function fmtDate(d){
  if(!d) return "—";
  try{ return new Date(d).toLocaleDateString("vi-VN"); }catch(e){ return d; }
}

function itemsRowsHtml(items){
  if(!items || items.length===0) return `<tr><td colspan="5">Không có sản phẩm</td></tr>`;
  return items.map(it => `<tr>
    <td>${it.name||"—"}</td><td>${it.pack||"—"}</td><td>${it.qty||"—"}</td>
    <td>${it.mfr||"—"}</td><td>${it.lot||"—"}</td>
  </tr>`).join("");
}

function renderDoc(n){
  const done = n.status === "done";
  docWrap.innerHTML = `
  <div class="doc" id="pdfArea">
    <div class="doc-header">
      <div class="co">
        <img src="${COMPANY.logo}" alt="logo" onerror="this.style.display='none'">
        <div class="co-name">${COMPANY.name}</div>
        <div class="co-line">${COMPANY.address}</div>
        <div class="co-line">${COMPANY.hotline}</div>
        <div class="co-line">${COMPANY.email}</div>
      </div>
      <div class="doc-title">
        <h1>PHIẾU GIAO HÀNG</h1>
        <div class="code">${n.code || noteId}</div>
        <div class="code">Ngày lập: ${fmtDate(n.deliveryDate)}</div>
      </div>
    </div>

    <div class="doc-section-title">Thông tin khách hàng &amp; vận chuyển</div>
    <div class="kv-grid">
      <div class="kv"><span class="k">Tên khách hàng</span><span class="v">${n.customerName||"—"}</span></div>
      <div class="kv"><span class="k">Mã số thuế</span><span class="v">${n.taxCode||"—"}</span></div>
      <div class="kv"><span class="k">Ngày giao hàng</span><span class="v">${fmtDate(n.deliveryDate)}</span></div>
      <div class="kv"><span class="k">Thông tin xe</span><span class="v">${n.vehicleInfo||"—"}</span></div>
      <div class="kv"><span class="k">Tên tài xế</span><span class="v">${n.driverName||"—"}</span></div>
      <div class="kv"><span class="k">CCCD tài xế</span><span class="v">${n.driverCccd||"—"}</span></div>
    </div>
    <div class="kv" style="border-bottom:none; margin-top:8px;"><span class="k">Địa chỉ giao hàng</span></div>
    <p style="margin-top:2px">${n.deliveryAddress||"—"}</p>

    <div class="doc-section-title">Sản phẩm</div>
    <table class="items">
      <thead><tr><th>Tên sản phẩm</th><th>Quy cách đóng gói</th><th>Số lượng</th><th>Nhà sản xuất</th><th>Số Lot</th></tr></thead>
      <tbody>${itemsRowsHtml(n.items)}</tbody>
    </table>

    <div class="doc-section-title">Xác nhận giao nhận</div>
    <div class="sign-grid">
      <div class="sign-box">
        <div class="role">BÊN GIAO — ${COMPANY.name}</div>
        <div class="sub">Đại diện công ty</div>
        <img class="stamp-img" src="${COMPANY.stamp}" onerror="this.style.display='none'">
      </div>
      <div class="sign-box">
        <div class="role">BÊN NHẬN</div>
        <div class="sub">${done ? "Đã ký nhận qua điện thoại" : "Chưa ký nhận"}</div>
        ${n.signatureImage ? `<img class="sign-img" src="${n.signatureImage}">` : `<p style="color:var(--ink-soft);font-size:0.82rem;">(chưa có chữ ký)</p>`}
        <div class="name-line">Người nhận: <strong>${n.receiverName||"—"}</strong></div>
        <div class="name-line">Giờ giao: <strong>${n.deliveredAt||"—"}</strong></div>
      </div>
    </div>

    ${n.vehiclePhotos && n.vehiclePhotos.length ? `
      <div class="doc-section-title">Hình ảnh xe giao hàng</div>
      <div class="photo-strip">${n.vehiclePhotos.map(u=>`<img src="${u}">`).join("")}</div>
    ` : ""}
  </div>`;
}

async function load(){
  if(!noteId){
    msgEl.innerHTML = `<div class="msg error">Thiếu mã phiếu.</div>`;
    return;
  }
  try{
    const snap = await getDoc(doc(db, "deliveryNotes", noteId));
    if(!snap.exists()){
      msgEl.innerHTML = `<div class="msg error">Không tìm thấy phiếu giao hàng.</div>`;
      return;
    }
    const n = snap.data();
    statusLine.textContent = n.status === "done"
      ? `Đã ký nhận lúc ${n.deliveredAt || ""} · ${fmtDate(n.deliveryDate)}`
      : `Chờ tài xế/khách hàng ký nhận`;
    renderDoc(n);

    if(n.status !== "done"){
      const link = `${location.origin}${location.pathname.replace("view.html","")}driver.html?id=${noteId}`;
      linkBoxWrap.innerHTML = `
        <div class="panel">
          <div class="panel-head"><h2>Link gửi tài xế</h2></div>
          <div class="panel-body">
            <div class="link-box">
              <code>${link}</code>
              <button class="btn small" id="copyBtn2" type="button">Sao chép link</button>
            </div>
          </div>
        </div>`;
      document.getElementById("copyBtn2").addEventListener("click", async () => {
        await navigator.clipboard.writeText(link);
      });
    }
  }catch(e){
    console.error(e);
    msgEl.innerHTML = `<div class="msg error">Lỗi tải phiếu: ${e.message}</div>`;
  }
}

downloadPdfBtn.addEventListener("click", async () => {
  const area = document.getElementById("pdfArea");
  if(!area) return;
  downloadPdfBtn.disabled = true;
  downloadPdfBtn.textContent = "Đang tạo PDF...";
  try{
    const canvas = await html2canvas(area, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while(heightLeft > 0){
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(`PhieuGiaoHang_${noteId}.pdf`);
  }catch(e){
    console.error(e);
    alert("Không tạo được PDF: " + e.message);
  }finally{
    downloadPdfBtn.disabled = false;
    downloadPdfBtn.textContent = "Tải PDF";
  }
});

load();
