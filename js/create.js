import { db, collection, addDoc, serverTimestamp } from "./firebase-init.js";

const itemsBody = document.getElementById("itemsBody");
const addItemBtn = document.getElementById("addItemBtn");
const form = document.getElementById("noteForm");
const msgEl = document.getElementById("msg");
const submitBtn = document.getElementById("submitBtn");
const resultPanel = document.getElementById("resultPanel");
const linkOut = document.getElementById("linkOut");
const copyBtn = document.getElementById("copyBtn");
const qrImg = document.getElementById("qrImg");
const createAnotherBtn = document.getElementById("createAnotherBtn");

let itemCount = 0;

function addItemRow(prefill = {}){
  itemCount++;
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" class="it-name" value="${prefill.name || ""}" placeholder="VD: Tấm lót sàn cao su"></td>
    <td><input type="text" class="it-pack" value="${prefill.pack || ""}" placeholder="VD: Cuộn 10m x 1.2m"></td>
    <td><input type="text" class="it-qty" value="${prefill.qty || ""}" placeholder="VD: 20"></td>
    <td><input type="text" class="it-mfr" value="${prefill.mfr || ""}" placeholder="Nhà sản xuất"></td>
    <td><input type="text" class="it-lot" value="${prefill.lot || ""}" placeholder="Số Lot"></td>
    <td><button type="button" class="rm" title="Xóa dòng">✕</button></td>
  `;
  tr.querySelector(".rm").addEventListener("click", () => {
    if(itemsBody.children.length > 1){ tr.remove(); }
  });
  itemsBody.appendChild(tr);
}

addItemBtn.addEventListener("click", () => addItemRow());
addItemRow(); // dòng sản phẩm đầu tiên

// Mặc định ngày giao hàng = hôm nay
document.getElementById("deliveryDate").valueAsDate = new Date();

function collectItems(){
  const rows = itemsBody.querySelectorAll("tr");
  const items = [];
  rows.forEach(r => {
    const name = r.querySelector(".it-name").value.trim();
    const pack = r.querySelector(".it-pack").value.trim();
    const qty = r.querySelector(".it-qty").value.trim();
    const mfr = r.querySelector(".it-mfr").value.trim();
    const lot = r.querySelector(".it-lot").value.trim();
    if(name || pack || qty || mfr || lot){
      items.push({ name, pack, qty, mfr, lot });
    }
  });
  return items;
}

function genCode(){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,"0");
  const d = String(now.getDate()).padStart(2,"0");
  const rand = Math.floor(Math.random()*900+100); // 3 chữ số ngẫu nhiên
  return `WMS-${y}${m}${d}-${rand}`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msgEl.innerHTML = "";

  const items = collectItems();
  if(items.length === 0){
    msgEl.innerHTML = `<div class="msg error">Vui lòng nhập ít nhất một sản phẩm.</div>`;
    return;
  }

  const data = {
    code: genCode(),
    customerName: document.getElementById("customerName").value.trim(),
    taxCode: document.getElementById("taxCode").value.trim(),
    deliveryAddress: document.getElementById("deliveryAddress").value.trim(),
    items,
    deliveryDate: document.getElementById("deliveryDate").value,
    vehicleInfo: document.getElementById("vehicleInfo").value.trim(),
    driverName: document.getElementById("driverName").value.trim(),
    driverCccd: document.getElementById("driverCccd").value.trim(),
    status: "pending",
    createdAt: serverTimestamp(),
    // Điền bởi tài xế / khách hàng khi ký nhận:
    receiverName: "",
    signatureUrl: "",
    deliveredAt: "",
    vehiclePhotoUrls: []
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Đang lưu...";

  try{
    const docRef = await addDoc(collection(db, "deliveryNotes"), data);
    const link = `${location.origin}${location.pathname.replace("create.html","")}driver.html?id=${docRef.id}`;
    linkOut.textContent = link;
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(link)}`;
    resultPanel.style.display = "block";
    form.style.display = "none";
    resultPanel.scrollIntoView({ behavior: "smooth" });
  }catch(err){
    console.error(err);
    msgEl.innerHTML = `<div class="msg error">Lỗi khi lưu phiếu: ${err.message}. Kiểm tra lại cấu hình Firebase.</div>`;
  }finally{
    submitBtn.disabled = false;
    submitBtn.textContent = "Tạo phiếu & lấy link gửi tài xế";
  }
});

copyBtn.addEventListener("click", async () => {
  try{
    await navigator.clipboard.writeText(linkOut.textContent);
    copyBtn.textContent = "Đã sao chép ✓";
    setTimeout(() => copyBtn.textContent = "Sao chép link", 1600);
  }catch(e){
    alert("Không sao chép được, vui lòng chọn và copy thủ công.");
  }
});

createAnotherBtn.addEventListener("click", (e) => {
  e.preventDefault();
  location.reload();
});
