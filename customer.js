"use strict";
const SUPABASE_URL = "https://olryjrwplydbyjeaetoo.supabase.co",
  SUPABASE_KEY = "sb_publishable_z0WIb54qmBpkI1izjbXy6A_Z8j_vAdV",
  API = SUPABASE_URL + "/rest/v1";
let current = null,
  payments = [];
const $ = (id) => document.getElementById(id);
const monthNames = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];
function money(n) {
  return "৳" + Number(n || 0).toLocaleString("bn-BD");
}
function esc(v) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
async function api(path, options = {}) {
  const h = {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers || {}),
  };
  const r = await fetch(API + path, { ...options, headers: h });
  const txt = await r.text();
  let d = null;
  try {
    d = txt ? JSON.parse(txt) : null;
  } catch (e) {}
  if (!r.ok)
    throw new Error(d?.message || d?.hint || txt || "HTTP " + r.status);
  return d;
}
function normalize(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}
function showError(t) {
  $("error").textContent = t;
  $("error").style.display = "block";
}
function monthKey(y, m) {
  return y + "-" + String(m).padStart(2, "0");
}
function customerStartKey() {
  if (!current?.start) return null;
  const d = new Date(current.start + "T00:00:00");
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function isActiveMonth(k) {
  const startKey = customerStartKey();
  return !startKey || k >= startKey;
}
function setupSelectors() {
  const now = new Date(),
    ys = [];
  const start = current?.start
    ? new Date(current.start + "T00:00:00")
    : new Date(now.getFullYear(), 0, 1);
  for (let y = start.getFullYear(); y <= now.getFullYear(); y++) ys.push(y);
  $("yearSelect").innerHTML = ys
    .map((y) => `<option value="${y}">${y} সাল</option>`)
    .join("");
  $("yearSelect").value = now.getFullYear();
  $("monthSelect").innerHTML = monthNames
    .map((m, i) => `<option value="${i + 1}">${m}</option>`)
    .join("");
  $("monthSelect").value = String(now.getMonth() + 1);
}
function renderAccount() {
  const c = current,
    rent = Number(c.monthly_rent ?? c.rent ?? 0),
    y = Number($("yearSelect").value),
    m = Number($("monthSelect").value),
    k = monthKey(y, m),
    p = payments.find((x) => x.payment_month === k),
    paid = Number(p?.amount || 0),
    due = isActiveMonth(k) ? Math.max(rent - paid, 0) : 0;
  $("custName").textContent = c.name || "কাস্টমার";
  $("custCode").textContent = "ফ্রিজ কোড: " + (c.fridge_code || "");
  $("phone").textContent = c.phone || "—";
  $("address").textContent = c.address || "—";
  $("fridge").textContent = String(c.fridge || 1);
  $("rent").textContent = money(rent);
  const now = new Date();
  let dueTotal = 0,
    monthCount = 0;
  if (rent) {
    const start = current.start
      ? new Date(current.start + "T00:00:00")
      : new Date(now.getFullYear(), 0, 1);
    let yy = start.getFullYear(),
      mm = start.getMonth() + 1;
    while (
      yy < now.getFullYear() ||
      (yy === now.getFullYear() && mm <= now.getMonth() + 1)
    ) {
      const kk = monthKey(yy, mm),
        pp = payments.find((x) => x.payment_month === kk),
        pa = Number(pp?.amount || 0);
      dueTotal += Math.max(rent - pa, 0);
      monthCount++;
      mm++;
      if (mm > 12) {
        mm = 1;
        yy++;
      }
    }
  }
  $("totalPaid").textContent = money(
    payments.reduce((s, x) => s + Number(x.amount || 0), 0),
  );
  $("totalDue").textContent = money(dueTotal);
  $("totalMonths").textContent = monthCount;
  $("history").innerHTML =
    `<tr><td><b>${monthNames[m - 1]} ${y}</b></td><td>${money(rent)}</td><td>${isActiveMonth(k) ? money(paid) : "—"}</td><td>${isActiveMonth(k) && p ? esc(p.payment_date || "—") : "—"}</td><td><b>${isActiveMonth(k) ? money(due) : "—"}</b></td><td>${!isActiveMonth(k) ? '<span class="pill">প্রযোজ্য নয়</span>' : due === 0 ? '<span class="pill p">পরিশোধিত</span>' : '<span class="pill d">বকেয়া</span>'}</td></tr>`;
}
function nowMonth(y) {
  const n = new Date();
  return y === n.getFullYear()
    ? n.getMonth() + 1
    : y < n.getFullYear()
      ? 12
      : 0;
}
async function login() {
  const code = normalize($("code").value);
  if (!code) {
    showError("ফ্রিজ কোড লিখুন।");
    return;
  }
  try {
    const rows = await api(
      "/customers?select=*&fridge_code=eq." + encodeURIComponent(code),
    );
    if (!rows?.length) {
      showError("এই ফ্রিজ কোডের কোনো কাস্টমার পাওয়া যায়নি।");
      return;
    }
    if (rows.length > 1) {
      showError("এই ফ্রিজ কোড একাধিক কাস্টমারের আছে। Admin থেকে কোড ঠিক করুন।");
      return;
    }
    current = rows[0];
    payments = await api(
      "/payments?select=*&customer_id=eq." +
        encodeURIComponent(current.id) +
        "&order=payment_month.asc",
    );
    $("loginBox").classList.add("hidden");
    $("accountBox").classList.remove("hidden");
    $("logoutBtn").style.display = "block";
    $("error").style.display = "none";
    setupSelectors();
    renderAccount();
  } catch (e) {
    showError("Online Database সংযোগ সমস্যা: " + e.message);
  }
}
$("loginBtn").onclick = login;
$("code").onkeydown = (e) => {
  if (e.key === "Enter") login();
};
$("yearSelect").onchange = renderAccount;
$("monthSelect").onchange = renderAccount;
$("logoutBtn").onclick = () => {
  current = null;
  payments = [];
  $("accountBox").classList.add("hidden");
  $("loginBox").classList.remove("hidden");
  $("logoutBtn").style.display = "none";
  $("code").value = "";
  $("error").style.display = "none";
};
$("printBtn").onclick = () => window.print();
