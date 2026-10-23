"use strict";
const SUPABASE_URL = "https://olryjrwplydbyjeaetoo.supabase.co";
const SUPABASE_KEY = "sb_publishable_z0WIb54qmBpkI1izjbXy6A_Z8j_vAdV";
const API = SUPABASE_URL + "/rest/v1";
let customers = [],
  payments = [],
  editId = null,
  accountId = null;
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
function todayKey() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function keyLabel(k) {
  const [y, m] = k.split("-").map(Number);
  return monthNames[m - 1] + " " + y;
}
function showStatus(t, error = false) {
  $("status").textContent = t;
  $("status").style.display = "block";
  $("status").classList.toggle("show", true);
  $("status").style.background = error ? "#fff0ef" : "#e9f8f1";
  $("status").style.color = error ? "#a42318" : "#075d46";
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
  let data = null;
  try {
    data = txt ? JSON.parse(txt) : null;
  } catch (e) {}
  if (!r.ok)
    throw new Error(data?.message || data?.hint || txt || "HTTP " + r.status);
  return data;
}
async function loadOnline() {
  showStatus("ডেটা লোড হচ্ছে...");
  try {
    customers = await api("/customers?select=*&order=created_at.asc");
    payments = await api("/payments?select=*&order=payment_date.asc");
    customers = Array.isArray(customers) ? customers : [];
    payments = Array.isArray(payments) ? payments : [];
    setupMonths();
    render();
    showStatus("✅ Supabase Online Database সংযুক্ত আছে");
  } catch (e) {
    showStatus("❌ Database সংযোগ/লোড সমস্যা: " + e.message, true);
    customers = [];
    payments = [];
    setupMonths();
    render();
  }
}
function allMonthKeys() {
  const s = {};
  const now = new Date();
  for (let i = -12; i <= 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    s[d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")] = 1;
  }
  payments.forEach((p) => {
    if (p.payment_month) s[p.payment_month] = 1;
  });
  customers.forEach((c) => {
    if (c.start) {
      const d = new Date(c.start + "T00:00:00");
      s[d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")] = 1;
    }
  });
  return Object.keys(s).sort();
}
function setupMonths() {
  const sel = $("monthSelect"),
    old = sel.value,
    keys = allMonthKeys();
  sel.innerHTML = keys
    .map(
      (k) =>
        `<option value="${k}">${keyLabel(k)}${k === todayKey() ? " — এই মাস" : ""}</option>`,
    )
    .join("");
  sel.value = keys.includes(old)
    ? old
    : keys.includes(todayKey())
      ? todayKey()
      : keys[keys.length - 1];
}
function selectedKey() {
  return $("monthSelect").value || todayKey();
}
function paidFor(c, k) {
  return payments
    .filter((p) => p.customer_id === c.id && p.payment_month === k)
    .reduce((s, p) => s + Number(p.amount || 0), 0);
}
function rentFor(c) {
  return Number(c.monthly_rent ?? c.rent ?? 0);
}
function customerStartKey(c) {
  if (!c.start) return null;
  const d = new Date(c.start + "T00:00:00");
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function isActiveMonth(c, k) {
  const startKey = customerStartKey(c);
  return !startKey || k >= startKey;
}
function dueFor(c, k) {
  if (!isActiveMonth(c, k)) return 0;
  return Math.max(rentFor(c) - paidFor(c, k), 0);
}
function totalPaid(c) {
  return payments
    .filter((p) => p.customer_id === c.id)
    .reduce((s, p) => s + Number(p.amount || 0), 0);
}
function dueForYear(c, y) {
  const rent = rentFor(c);
  if (!rent) return 0;
  let due = 0;
  for (let m = 0; m < 12; m++) {
    due += dueFor(c, y + "-" + String(m + 1).padStart(2, "0"));
  }
  return due;
}
function render() {
  const k = selectedKey();
  $("printHead").textContent =
    "Limon Refrigerator — " + keyLabel(k) + " — কাস্টমার হিসাব";
  const q = $("search").value.trim().toLowerCase(),
    f = $("filter").value;
  const activeCustomers = customers.filter((c) => isActiveMonth(c, k));
  let arr =
    f === "new"
      ? activeCustomers.filter((c) => customerStartKey(c) === k)
      : activeCustomers;
  arr = arr.filter((c) =>
    (
      c.name +
      " " +
      (c.phone || "") +
      " " +
      (c.address || "") +
      " " +
      (c.brand || "") +
      " " +
      (c.fridge_code || "")
    )
      .toLowerCase()
      .includes(q),
  );
  if (f === "paid") arr = arr.filter((c) => paidFor(c, k) > 0);
  if (f === "due") arr = arr.filter((c) => dueFor(c, k) > 0);
  $("sCustomers").textContent = activeCustomers.length;
  $("sFridges").textContent = activeCustomers.reduce(
    (s, c) => s + Number(c.fridge || 0),
    0,
  );
  $("paidLabel").textContent = keyLabel(k) + " আদায়";
  $("sPaid").textContent = money(
    activeCustomers.reduce((s, c) => s + paidFor(c, k), 0),
  );
  $("dueLabel").textContent = keyLabel(k) + " বকেয়া আদায়";
  $("sDue").textContent = money(
    activeCustomers.reduce((s, c) => s + dueFor(c, k), 0),
  );
  $("list").innerHTML = arr.length
    ? arr
        .map((c) => {
          const p = paidFor(c, k),
            active = isActiveMonth(c, k);
          return `<tr><td><b>${esc(c.name)}</b><br><small>${esc(c.address)}</small></td><td>${esc(c.phone)}</td><td><b>${esc(c.fridge_code || "")}</b></td><td>${Number(c.fridge || 0)}</td><td>${money(rentFor(c))}</td><td>${!active ? '<span class="pill">প্রযোজ্য নয়</span>' : p ? '<span class="pill p">আদায় ' + money(p) + "</span>" : '<span class="pill d">বকেয়া</span>'}</td><td><b>${money(totalPaid(c))}</b></td><td><b>${money(dueForYear(c, Number(k.slice(0, 4))))}</b></td><td><div class="actions"><button type="button" data-action="account" data-id="${c.id}">হিসাব</button><button type="button" class="alt" data-action="edit" data-id="${c.id}">এডিট</button><button type="button" class="red" data-action="delete" data-id="${c.id}">মুছুন</button></div></td></tr>`;
        })
        .join("")
    : '<tr><td colspan="9" class="empty">কোনো কাস্টমার নেই</td></tr>';
}
function openCustomer(c) {
  editId = c ? c.id : null;
  $("customerTitle").textContent = c ? "কাস্টমার এডিট" : "নতুন কাস্টমার";
  $("name").value = c?.name || "";
  $("phone").value = c?.phone || "";
  $("fridgeCode").value = c?.fridge_code || "";
  $("fridge").value = c?.fridge || 1;
  $("rent").value = rentFor(c || {});
  $("brand").value = c?.brand || "";
  $("start").value = c?.start || "";
  $("advance").value = c?.advance || 0;
  $("address").value = c?.address || "";
  $("customerModal").classList.add("show");
}
function closeCustomer() {
  $("customerModal").classList.remove("show");
}
async function saveCustomer() {
  const n = $("name").value.trim(),
    code = $("fridgeCode").value.trim();
  if (!n) {
    alert("কাস্টমারের নাম লিখুন");
    return;
  }
  if (!code) {
    alert("ফ্রিজ কোড লিখুন");
    return;
  }
  const obj = {
    name: n,
    phone: $("phone").value.trim(),
    fridge_code: code,
    fridge: Number($("fridge").value) || 1,
    monthly_rent: Number($("rent").value) || 0,
    brand: $("brand").value.trim(),
    start: $("start").value || null,
    advance: Number($("advance").value) || 0,
    address: $("address").value.trim(),
  };
  try {
    if (editId)
      await api("/customers?id=eq." + encodeURIComponent(editId), {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(obj),
      });
    else
      await api("/customers", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(obj),
      });
    closeCustomer();
    await loadOnline();
    alert("কাস্টমার সফলভাবে সংরক্ষণ হয়েছে");
  } catch (e) {
    alert("সংরক্ষণ হয়নি: " + e.message);
  }
}
function openMonths(id) {
  accountId = id;
  const c = customers.find((x) => x.id === id);
  if (!c) return;
  const y = Number(selectedKey().slice(0, 4));
  $("monthsTitle").innerHTML = esc(c.name) + " — " + y + " সালের হিসাব";
  $("accountSummary").innerHTML =
    "<b>মোট আদায়: " +
    money(totalPaid(c)) +
    "</b><b>এই বছরে বকেয়া: " +
    money(dueForYear(c, y)) +
    "</b>";
  $("months").innerHTML = Array.from({ length: 12 }, (_, i) => {
    const k = y + "-" + String(i + 1).padStart(2, "0"),
      active = isActiveMonth(c, k),
      ps = payments.filter(
        (p) => p.customer_id === c.id && p.payment_month === k,
      ),
      p = ps[ps.length - 1];
    return `<div class="month"><b>${monthNames[i]} ${y}</b>${!active ? '<span class="pill">প্রযোজ্য নয়</span>' : p ? `<span class="pill p">আদায় ${money(p.amount)}</span><br><small>${esc(p.payment_date || "")}</small><br><button class="red" type="button" data-pay="clear" data-key="${k}" style="margin-top:7px">বাতিল</button>` : `<span class="pill d">বকেয়া</span><br><button type="button" data-pay="take" data-key="${k}" style="margin-top:7px">আদায়</button>`}</div>`;
  }).join("");
  $("monthsModal").classList.add("show");
}
async function takePayment(k) {
  const c = customers.find((x) => x.id === accountId);
  if (!c) return;
  if (!isActiveMonth(c, k)) {
    alert("কাস্টমারের শুরু তারিখের আগের মাসে আদায় করা যাবে না");
    return;
  }
  let a = prompt("আদায়ের টাকা লিখুন:", String(rentFor(c)));
  if (a === null) return;
  a = Number(a);
  if (!Number.isFinite(a) || a < 0) {
    alert("সঠিক টাকা লিখুন");
    return;
  }
  try {
    const old = payments.find(
      (p) => p.customer_id === c.id && p.payment_month === k,
    );
    const obj = {
      customer_id: c.id,
      amount: a,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_month: k,
    };
    if (old)
      await api("/payments?id=eq." + encodeURIComponent(old.id), {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(obj),
      });
    else
      await api("/payments", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(obj),
      });
    await loadOnline();
    openMonths(accountId);
  } catch (e) {
    alert("পেমেন্ট সংরক্ষণ হয়নি: " + e.message);
  }
}
async function clearPayment(k) {
  if (!confirm("এই মাসের আদায় বাতিল করবেন?")) return;
  try {
    await api(
      "/payments?customer_id=eq." +
        encodeURIComponent(accountId) +
        "&payment_month=eq." +
        encodeURIComponent(k),
      { method: "DELETE", headers: { Prefer: "return=minimal" } },
    );
    await loadOnline();
    openMonths(accountId);
  } catch (e) {
    alert("আদায় বাতিল হয়নি: " + e.message);
  }
}
async function deleteCustomer(id) {
  if (!confirm("এই কাস্টমার এবং তার পেমেন্ট হিসাব মুছে ফেলবেন?")) return;
  try {
    await api("/customers?id=eq." + encodeURIComponent(id), {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    await loadOnline();
    alert("কাস্টমার মুছে ফেলা হয়েছে");
  } catch (e) {
    alert("মুছতে সমস্যা: " + e.message);
  }
}
function downloadBackup() {
  const payload = {
    app: "Limon Refrigerator",
    source: "Supabase Online",
    created: new Date().toISOString(),
    customers,
    payments,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download =
    "limon-refrigerator-online-backup-" +
    new Date().toISOString().slice(0, 10) +
    ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$("addBtn").onclick = () => openCustomer(null);
$("customerBtn").onclick = () => (location.href = "customer.html");
$("cancelCustomer").onclick = closeCustomer;
$("saveCustomerBtn").onclick = saveCustomer;
$("search").oninput = render;
$("monthSelect").onchange = render;
$("filter").onchange = render;
$("backupBtn").onclick = downloadBackup;
$("refreshBtn").onclick = loadOnline;
$("printBtn").onclick = () => window.print();
$("closeMonths").onclick = () => $("monthsModal").classList.remove("show");
$("list").onclick = (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  if (b.dataset.action === "account") openMonths(b.dataset.id);
  if (b.dataset.action === "edit")
    openCustomer(customers.find((c) => c.id === b.dataset.id));
  if (b.dataset.action === "delete") deleteCustomer(b.dataset.id);
};
$("months").onclick = (e) => {
  const b = e.target.closest("[data-pay]");
  if (!b) return;
  b.dataset.pay === "take"
    ? takePayment(b.dataset.key)
    : clearPayment(b.dataset.key);
};
loadOnline();
