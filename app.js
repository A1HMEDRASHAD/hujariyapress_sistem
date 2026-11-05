/* ==========================================================================
   حُجرية بريس (Hujariya Press) — المحرك البرمجي لغرفة الأخبار (app.js v6.0)
   [الجزء الأول من 2]:
   - التهيئة السحابية (Firebase Firestore) + محرك رفع الصور الخارجي (ImgBB API)
   - الأزرار التفاعلية الذكية (Loading States) + نافذة التأكيد الزجاجية الآمنة
   - الهوية اللونية الديناميكية + الشعارات الثلاثة + الحساب الآلي للعمر
   - بوابة الدخول المحكمة (ربط الـ PIN بالجهاز الموثق فقط) + التوقيع الثلاثي للميثاق
   - استديو النشر المرحلي المقفل + وضع ملء الشاشة + المعاينة الحية للخبر قبل النشر
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==================== 1. إعدادات Firebase ومفتاح رفع الصور الخارجي (ImgBB API) ====================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAd4Df_Fpp2GlGkRPyvmKuFW68LbL_a4yU",
  authDomain: "rawi-01.firebaseapp.com",
  databaseURL: "https://rawi-01-default-rtdb.firebaseio.com",
  projectId: "rawi-01",
  storageBucket: "rawi-01.firebasestorage.app",
  messagingSenderId: "91203142966",
  appId: "1:91203142966:web:a44f7c06c98529a57a9f97",
  measurementId: "G-2VNWNSZLBJ"
};

// مفتاح ImgBB API لرفع الصور خارجياً وحفظ الروابط النصية فقط في Firestore
const DEFAULT_IMGBB_API_KEY = "6d207e02198a847aa98d0a2a901485a5";

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

// مفاتيح التخزين المحلي السريع والأمان المرتبط بالجهاز
const NR_ACTIVE_SESSION_KEY = "hujariya_nr_session_v6";
const NR_DEVICE_BOUND_KEY = "hujariya_nr_device_bound_v6";
const NR_FAST_CACHE_KEY = "hujariya_nr_fast_cache_v6";
const NR_STUDIO_AUTOSAVE_KEY = "hujariya_nr_studio_autosave_v6";
const NR_LOCAL_NOTES_KEY = "hujariya_nr_local_notes_v6";

const DEFAULT_BRAND_COLOR = "#b80d38";
const ARTICLES_PER_PAGE = 10;

const DEFAULT_COMPASSES = [
  {
    id: "yemen-politics",
    name: "السياسة اليمنية",
    subcategories: ["الشرعية ومؤسسات الدولة", "التحليلات الاستراتيجية", "الشأن المحلي والمحافظات", "كشف زيف الميليشيات"],
    visible: true,
    order: 1
  },
  {
    id: "saudi-politics",
    name: "السياسة السعودية",
    subcategories: ["الأمن القومي المشترك", "الدبلوماسية الإقليمية", "رؤية المملكة 2030", "المشاريع التنموية"],
    visible: true,
    order: 2
  },
  {
    id: "regional-international",
    name: "إقليمي ودولي",
    subcategories: ["الشرق الأوسط", "السياسة الدولية", "أمن البحر الأحمر والممرات"],
    visible: true,
    order: 3
  },
  {
    id: "economy-dev",
    name: "اقتصاد وأسواق",
    subcategories: ["أسواق وعملات", "طاقة ونفط", "إعمار وتنمية", "بورصات عالمية"],
    visible: true,
    order: 4
  },
  {
    id: "sports",
    name: "الرياضة",
    subcategories: ["الكرة اليمنية", "الدوري السعودي", "الكرة العالمية", "بطولات دولية"],
    visible: true,
    order: 5
  },
  {
    id: "health-science",
    name: "صحة وعلوم وفضاء",
    subcategories: ["طب وصحة", "أبحاث الفضاء والفلك", "اكتشافات علمية", "بيئة ومناخ"],
    visible: true,
    order: 6
  },
  {
    id: "tech-future",
    name: "تقنية ومستقبل",
    subcategories: ["الذكاء الاصطناعي", "الأمن السيبراني", "تطبيقات ومنصات", "ابتكارات"],
    visible: true,
    order: 7
  },
  {
    id: "culture-thought",
    name: "ثقافة وفكر",
    subcategories: ["أدب وفكر", "تاريخ وهوية", "قراءات وكتب", "مقالات الرأي"],
    visible: true,
    order: 8
  },
  {
    id: "art-media",
    name: "فن وإعلام",
    subcategories: ["فن ودراما", "إعلام رقمي", "تراث وفنون"],
    visible: true,
    order: 9
  }
];

const DEFAULT_CHARTER_HTML = `
  <h3>أولاً: الالتزام المهني والمصداقية الصحفية</h3>
  <p>يلتزم الصحفي والكاتب في منصة <strong>حُجرية بريس (Hujariya Press)</strong> بتحري الدقة والموضوعية، والتثبت من صحة الأخبار والمصادر قبل صياغتها أو إرسالها للنشر.</p>
  <h3>ثانياً: الثوابت الوطنية والمسؤولية القانونية</h3>
  <p>يلتزم العضو باحترام الثوابت الوطنية والمهنية، والامتناع التام عن نشر الشائعات أو المواد المنتهكة للحقوق، ويتحمل المسؤولية القانونية الكاملة عن صحة بياناته ووثائقه الرسمية المرفقة في ملف هويته الصحفية.</p>
  <h3>ثالثاً: أمان غرفة الأخبار والهوية الصحفية</h3>
  <p>تُعد الهوية الصحفية (HP) وبيانات الدخول عهدة شخصية، ويُعد التوقيع الرقمي الحي أدناه إقراراً رسمياً ملزماً بكافة بنود هذا الميثاق وتحديثاته.</p>
`;

const MASTER_ACCOUNT_FALLBACK = {
  id: "master-admin",
  pressId: "HP10001",
  name: "رئيس التحرير",
  username: "admin",
  email: "admin@hujariyapress.rawi-ye.com",
  password: "admin",
  pinCode: "0000",
  jobTitle: "رئيس التحرير",
  role: "admin",
  isMasterAdmin: true,
  verified: true,
  directPublish: true,
  allowedCategories: ["all"],
  signatureStatus: "approved",
  everApprovedCharter: true,
  signedCharterVersion: 1
};

// ==================== 2. الحالة المركزية للنظام (Central State) ====================
const state = {
  currentUser: null,
  settings: {
    siteName: "حُجرية بريس",
    accentColor: DEFAULT_BRAND_COLOR,
    logoUrl: "",
    headerLogoUrl: "",
    footerLogoUrl: "",
    authLogoUrl: "",
    faviconUrl: "",
    appIconUrl: "",
    imgbbApiKey: DEFAULT_IMGBB_API_KEY,
    charterHtml: DEFAULT_CHARTER_HTML,
    charterVersion: 1,
    masterUsername: "admin",
    masterPassword: "admin",
    masterPin: "0000"
  },
  compasses: structuredClone(DEFAULT_COMPASSES),
  staff: [],
  posts: [],
  notes: [],
  activeView: "view-overview",
  // الفلترة والبحث الذكي والترقيم (Pagination)
  myPostsStatusFilter: "all",
  myPostsSearchQuery: "",
  currentPage: 1,
  // حالة استديو النشر المرحلي المقفل
  studioStep: 1,
  editingPostId: null,
  studioMainImageUrl: "",
  isStudioFullscreen: false,
  isSubmittingArticle: false,
  lastPublishedFingerprint: "",
  // حالة التوقيع الرقمي على ميثاق الشرف
  pledgeMode: "first_time",
  pledgeRequiredCount: 3,
  pledgeSignatures: [],
  isDrawingSig: false,
  hasCurrentStroke: false,
  // مرفقات التوثيق السحابية (روابط URL خفيفة)
  kycFrontUrl: "",
  kycBackUrl: "",
  kycSelfieUrl: ""
};

// ==================== 3. الدوال التفاعلية، نافذة التأكيد الزجاجية، ورفع الصور لـ ImgBB ====================
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCategoryName(name = "") {
  return (
    String(name)
      .replace(/^بوصلة\s+/i, "")
      .replace(/^البوصلة\s+/i, "")
      .trim() || name
  );
}

function normalizePressId(raw = "") {
  return String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function generateUniquePressId(staffList = []) {
  const existing = new Set(
    staffList.map((s) => normalizePressId(s.pressId || "")).filter(Boolean)
  );
  existing.add("HP10001");
  let candidate = 10012 + staffList.length * 9;
  while (existing.has(`HP${candidate}`)) {
    candidate += Math.floor(Math.random() * 7) + 1;
  }
  return `HP${String(candidate).slice(0, 5).padStart(5, "1")}`;
}

function showToast(message) {
  const toast = document.getElementById("nr-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(window.__nrToastTimer);
  window.__nrToastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3500);
}

// تحويل أي زر إلى حالة تفاعلية واضحة (جاري الحفظ / جاري الرفع) ومنع النقر المزدوج
function setButtonLoading(btnOrId, isLoading, loadingText = "جاري التنفيذ...") {
  const btn =
    typeof btnOrId === "string" ? document.getElementById(btnOrId) : btnOrId;
  if (!btn) return;

  const labelEl = btn.querySelector(".nr-btn-label") || btn.querySelector("span:last-child");

  if (isLoading) {
    if (!btn.dataset.originalLabel && labelEl) {
      btn.dataset.originalLabel = labelEl.textContent;
    }
    btn.disabled = true;
    btn.classList.add("is-loading");
    if (labelEl) labelEl.textContent = loadingText;
  } else {
    btn.disabled = false;
    btn.classList.remove("is-loading");
    if (btn.dataset.originalLabel && labelEl) {
      labelEl.textContent = btn.dataset.originalLabel;
    }
  }
}

// نافذة التأكيد الزجاجية الآمنة (تمنع الضغط بالخطأ وتدعم إدخال سبب الحذف)
function askConfirmation({
  title = "تأكيد الإجراء",
  message = "هل أنت متأكد من المتابعة؟",
  confirmText = "نعم، تأكيد",
  icon = "help",
  danger = false,
  requireReason = false,
  reasonPlaceholder = "اكتب السبب هنا..."
} = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById("nr-confirm-modal");
    const titleEl = document.getElementById("confirm-modal-title");
    const msgEl = document.getElementById("confirm-modal-message");
    const iconEl = document.getElementById("confirm-modal-icon");
    const iconBox = document.getElementById("confirm-modal-icon-box");
    const reasonWrap = document.getElementById("confirm-reason-wrap");
    const reasonInput = document.getElementById("confirm-reason-input");
    const acceptBtn = document.getElementById("confirm-accept-btn");
    const acceptLabel = document.getElementById("confirm-accept-label");
    const cancelBtn = document.getElementById("confirm-cancel-btn");

    if (!modal || !acceptBtn || !cancelBtn) {
      const ok = window.confirm(message);
      resolve({ confirmed: ok, reason: "" });
      return;
    }

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (iconEl) iconEl.textContent = icon;
    if (acceptLabel) acceptLabel.textContent = confirmText;

    if (iconBox) {
      iconBox.style.backgroundColor = danger ? "#fef2f2" : "var(--brand-soft)";
      iconBox.style.color = danger ? "var(--danger-red)" : "var(--brand-primary)";
    }

    acceptBtn.className = danger
      ? "nr-btn nr-btn-danger"
      : "nr-btn nr-btn-primary";

    if (reasonWrap && reasonInput) {
      reasonWrap.classList.toggle("hidden", !requireReason);
      reasonInput.value = "";
      reasonInput.placeholder = reasonPlaceholder;
    }

    modal.classList.remove("hidden");
    if (requireReason && reasonInput) {
      setTimeout(() => reasonInput.focus(), 60);
    }

    const cleanup = () => {
      modal.classList.add("hidden");
      acceptBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    cancelBtn.onclick = () => {
      cleanup();
      resolve({ confirmed: false, reason: "" });
    };

    acceptBtn.onclick = () => {
      const reasonVal = reasonInput ? reasonInput.value.trim() : "";
      cleanup();
      resolve({ confirmed: true, reason: reasonVal });
    };
  });
}

// دالة البحث الذكي المؤجل (Debounce) لمنع أي ثقل أثناء الكتابة السريعة
function debounce(fn, delay = 220) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function getTimestampMs(item) {
  if (!item) return 0;
  const t = item.createdAt || item.updatedAt || item.createdTimestamp;
  if (!t) return 0;
  if (typeof t.toMillis === "function") return t.toMillis();
  if (typeof t.seconds === "number") return t.seconds * 1000;
  const parsed = new Date(t).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

function formatArabicDate(msOrItem) {
  const ms = typeof msOrItem === "number" ? msOrItem : getTimestampMs(msOrItem);
  if (!ms) return "منذ قليل";
  return new Date(ms).toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function calculateAutoAge(dobStr) {
  if (!dobStr) return null;
  const birth = new Date(dobStr);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 && age < 120 ? age : null;
}

// ضغط الصورة محلياً ثم رفعها إلى منصة ImgBB الخارجية وإرجاع رابط URL مباشر ونظيف
function compressImageToDataUrl(file, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, maxWidth / (img.width || maxWidth));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round((img.width || maxWidth) * ratio);
        canvas.height = Math.round((img.height || maxWidth) * ratio);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", quality));
      };
      img.onerror = () => reject(new Error("تعذر معالجة الصورة"));
      img.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.readAsDataURL(file);
  });
}

async function uploadImageToImgBB(fileOrDataUrl, maxWidth = 1200, quality = 0.82) {
  let dataUrl = "";
  if (typeof fileOrDataUrl === "string" && fileOrDataUrl.startsWith("data:")) {
    dataUrl = fileOrDataUrl;
  } else if (fileOrDataUrl instanceof File || fileOrDataUrl instanceof Blob) {
    dataUrl = await compressImageToDataUrl(fileOrDataUrl, maxWidth, quality);
  } else {
    throw new Error("ملف الصورة غير صالح");
  }

  const base64String = dataUrl.split(",")[1];
  const apiKey = (state.settings.imgbbApiKey || DEFAULT_IMGBB_API_KEY).trim();

  try {
    const formData = new FormData();
    formData.append("key", apiKey);
    formData.append("image", base64String);

    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData
    });

    if (response.ok) {
      const json = await response.json();
      const directUrl =
        json?.data?.display_url || json?.data?.url || json?.data?. image?.url;
      if (directUrl) {
        return { url: directUrl, host: "imgbb" };
      }
    }
  } catch (err) {
    console.warn("ImgBB upload fallback triggered:", err);
  }

  // صمام أمان احتياطي: إذا تعذر الوصول لـ ImgBB بسبب الشبكة، نضغطها بحجم مصغر جداً لكي لا يتعطل عمل الصحفي أبداً
  if (fileOrDataUrl instanceof File || fileOrDataUrl instanceof Blob) {
    const compactDataUrl = await compressImageToDataUrl(fileOrDataUrl, 680, 0.68);
    return { url: compactDataUrl, host: "compact" };
  }
  return { url: dataUrl, host: "compact" };
}

// ==================== 4. الهوية اللونية الديناميكية والشعارات الثلاثة ====================
function hexToRgbTuple(hex = DEFAULT_BRAND_COLOR) {
  const clean = String(hex).replace("#", "").trim();
  if (clean.length !== 6) return "184, 13, 56";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return "184, 13, 56";
  return `${r}, ${g}, ${b}`;
}

function darkenHexColor(hex = DEFAULT_BRAND_COLOR, factor = 0.76) {
  const clean = String(hex).replace("#", "").trim();
  if (clean.length !== 6) return "#8e0729";
  const r = Math.max(0, Math.floor(parseInt(clean.slice(0, 2), 16) * factor));
  const g = Math.max(0, Math.floor(parseInt(clean.slice(2, 4), 16) * factor));
  const b = Math.max(0, Math.floor(parseInt(clean.slice(4, 6), 16) * factor));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function applyDynamicThemeAndLogos() {
  const s = state.settings;
  const rawColor = (s.accentColor || "").trim();
  const primaryColor =
    !rawColor || rawColor.toLowerCase() === "#ef3327"
      ? DEFAULT_BRAND_COLOR
      : rawColor;
  const rgb = hexToRgbTuple(primaryColor);
  const darkColor = darkenHexColor(primaryColor, 0.76);

  const root = document.documentElement;
  root.style.setProperty("--brand-primary", primaryColor);
  root.style.setProperty("--brand-dark", darkColor);
  root.style.setProperty("--brand-soft", `rgba(${rgb}, 0.08)`);
  root.style.setProperty("--brand-border", `rgba(${rgb}, 0.22)`);
  root.style.setProperty("--brand-shadow", `0 12px 32px -8px rgba(${rgb}, 0.16)`);

  document.getElementById("nr-theme-color")?.setAttribute("content", primaryColor);

  const siteName =
    s.siteName && s.siteName !== "شبكة البوصلة" && s.siteName !== "نبض اليمن"
      ? s.siteName
      : "حُجرية بريس";

  document.title = `غرفة الأخبار | ${siteName}`;
  const authTitle = document.getElementById("auth-site-name");
  if (authTitle) authTitle.textContent = `غرفة الأخبار — ${siteName}`;

  const subTitle = document.getElementById("header-platform-subtitle");
  if (subTitle) subTitle.textContent = siteName;

  const footerSite = document.getElementById("footer-site-name");
  if (footerSite) footerSite.textContent = siteName;

  const mainLogo = (s.headerLogoUrl || s.logoUrl || "").trim();
  const footerLogo = (s.footerLogoUrl || s.logoUrl || "").trim();
  const authLogo = (s.authLogoUrl || s.sidebarLogoUrl || s.logoUrl || "").trim();

  const bindLogo = (imgId, capId, url) => {
    const imgEl = document.getElementById(imgId);
    const capEl = capId ? document.getElementById(capId) : null;
    if (!imgEl) return;
    if (url) {
      imgEl.src = url;
      imgEl.classList.remove("hidden");
      capEl?.classList.remove("hidden");
    } else {
      imgEl.classList.add("hidden");
      capEl?.classList.add("hidden");
    }
  };

  bindLogo("auth-logo-img", "auth-logo-capsule", authLogo);
  bindLogo("header-logo-img", "header-logo-capsule", mainLogo);
  bindLogo("footer-logo-img", null, footerLogo);

  const fav = (s.faviconUrl || s.appIconUrl || mainLogo || "").trim();
  if (fav) {
    document.getElementById("nr-dynamic-favicon")?.setAttribute("href", fav);
    document.getElementById("nr-dynamic-apple-icon")?.setAttribute("href", fav);
  }
}

// ==================== 5. الكاش السريع (0ms Cache) + نظام الدخول وربط الجهاز ====================
function saveFastCache() {
  try {
    const payload = {
      savedAt: Date.now(),
      settings: state.settings,
      compasses: state.compasses,
      staff: state.staff,
      posts: state.posts.slice(0, 80)
    };
    localStorage.setItem(NR_FAST_CACHE_KEY, JSON.stringify(payload));
  } catch (_) {}
}

function restoreFastCache() {
  try {
    const raw = localStorage.getItem(NR_FAST_CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed) return false;

    if (parsed.settings) state.settings = { ...state.settings, ...parsed.settings };
    if (Array.isArray(parsed.compasses) && parsed.compasses.length) {
      state.compasses = parsed.compasses;
    }
    if (Array.isArray(parsed.staff)) state.staff = parsed.staff;
    if (Array.isArray(parsed.posts)) state.posts = parsed.posts;

    applyDynamicThemeAndLogos();
    return true;
  } catch (_) {
    return false;
  }
}

// دالة موحدة لحفظ بيانات العضو في Firestore (تعمل حتى لحساب master-admin دون فشل!)
async function saveStaffRecordToFirestore(staffId, dataPayload) {
  if (!staffId) return;
  await setDoc(doc(db, "staff", staffId), dataPayload, { merge: true });
}

function getDeviceBoundAccount() {
  try {
    const raw = localStorage.getItem(NR_DEVICE_BOUND_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.staffId || !parsed.deviceToken) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function bindCurrentAccountToDevice(userObj) {
  if (!userObj || !userObj.id) return;
  try {
    const existing = getDeviceBoundAccount();
    const token =
      existing?.deviceToken ||
      `NRDEV_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const boundPayload = {
      staffId: userObj.id,
      pressId: normalizePressId(userObj.pressId || "HP10001"),
      name: userObj.name || "صحفي",
      avatar:
        userObj.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          userObj.name || "HP"
        )}&background=b80d38&color=fff`,
      deviceToken: token,
      boundAt: Date.now()
    };
    localStorage.setItem(NR_DEVICE_BOUND_KEY, JSON.stringify(boundPayload));
    refreshPinTabUiState();
  } catch (_) {}
}

function clearDeviceBoundAccount() {
  localStorage.removeItem(NR_DEVICE_BOUND_KEY);
  refreshPinTabUiState();
}

function refreshPinTabUiState() {
  const bound = getDeviceBoundAccount();
  const unboundNotice = document.getElementById("pin-unbound-notice");
  const pinForm = document.getElementById("nr-login-pin-form");

  if (!bound) {
    unboundNotice?.classList.remove("hidden");
    pinForm?.classList.add("hidden");
    return;
  }

  unboundNotice?.classList.add("hidden");
  pinForm?.classList.remove("hidden");

  document.getElementById("pin-bound-avatar")?.setAttribute("src", bound.avatar || "");
  const nameEl = document.getElementById("pin-bound-name");
  if (nameEl) nameEl.textContent = bound.name || "صحفي معتمد";

  const pidEl = document.getElementById("pin-bound-press-id");
  if (pidEl) pidEl.textContent = bound.pressId || "HP10001";
}

function verifyStandardLogin(identifierRaw, passwordRaw) {
  const idClean = String(identifierRaw || "").trim().toLowerCase();
  const pressIdClean = normalizePressId(identifierRaw);
  const passClean = String(passwordRaw || "").trim();

  // البحث أولاً في سجلات الكادر (بما فيها سجل master-admin إن وُجد في Firestore)
  const matchedStaff = state.staff.find((member) => {
    const mUser = String(member.username || "").trim().toLowerCase();
    const mEmail = String(member.email || member.contactEmail || "").trim().toLowerCase();
    const mPressId = normalizePressId(member.pressId || "");

    const idMatches =
      (idClean && (mUser === idClean || mEmail === idClean)) ||
      (pressIdClean && mPressId === pressIdClean);

    return idMatches && String(member.password || "").trim() === passClean;
  });

  if (matchedStaff) return matchedStaff;

  // فحص حساب رئيس التحرير الاحتياطي
  const masterUser = String(state.settings.masterUsername || "admin").toLowerCase();
  const masterPass = String(state.settings.masterPassword || "admin");
  if (
    (idClean === masterUser || idClean === "admin" || pressIdClean === "HP10001") &&
    passClean === masterPass
  ) {
    const savedMasterDoc = state.staff.find((s) => s.id === "master-admin");
    return { ...MASTER_ACCOUNT_FALLBACK, ...(savedMasterDoc || {}) };
  }

  return null;
}

function verifyDeviceBoundPinLogin(enteredPinRaw) {
  const pinClean = String(enteredPinRaw || "").trim();
  if (!pinClean) return { error: "يرجى إدخال رمز الدخول السريع (PIN)" };

  const bound = getDeviceBoundAccount();
  if (!bound || !bound.staffId) {
    return {
      error: "هذا الجهاز غير مرتبط بعد. سجل دخولك أولاً بالهوية الصحفية وكلمة المرور."
    };
  }

  const targetStaff = state.staff.find(
    (s) => s.id === bound.staffId || normalizePressId(s.pressId) === bound.pressId
  );

  if (bound.staffId === "master-admin" || bound.pressId === "HP10001") {
    const masterPin = String(
      targetStaff?.pinCode || state.settings.masterPin || "0000"
    ).trim();
    if (pinClean === masterPin) {
      return { user: { ...MASTER_ACCOUNT_FALLBACK, ...(targetStaff || {}) } };
    }
    return { error: "رمز الدخول السريع (PIN) غير صحيح" };
  }

  if (!targetStaff) {
    return { error: "لم يتم العثور على بيانات الحساب، يرجى الدخول بكلمة المرور." };
  }

  const savedPin = String(targetStaff.pinCode || targetStaff.pin || "").trim();
  if (!savedPin) {
    return {
      error: "لم تقم بتعيين رمز (PIN) لحسابك بعد. ادخل بكلمة المرور ثم عيّنه من (ملفي والهوية)."
    };
  }

  if (pinClean !== savedPin) {
    return { error: "رمز الدخول السريع (PIN) غير مطابق" };
  }

  return { user: targetStaff };
}

function activateJournalistSession(userObj, cameFromPasswordLogin = false) {
  if (!userObj) return;

  if (userObj.accountStatus === "frozen" || userObj.suspended === true) {
    showToast("عذراً، هذا الحساب مجمد مؤقتاً من إدارة المنصة.");
    executeImmediateLogout(false);
    return;
  }

  const cleanPid = normalizePressId(userObj.pressId || "");
  if (!cleanPid.startsWith("HP") || cleanPid.length < 6) {
    userObj.pressId = generateUniquePressId(state.staff);
    if (userObj.id) {
      saveStaffRecordToFirestore(userObj.id, { pressId: userObj.pressId }).catch(() => {});
    }
  } else {
    userObj.pressId = cleanPid;
  }

  state.currentUser = userObj;

  localStorage.setItem(
    NR_ACTIVE_SESSION_KEY,
    JSON.stringify({ id: userObj.id, pressId: userObj.pressId })
  );

  if (cameFromPasswordLogin) {
    bindCurrentAccountToDevice(userObj);
  }

  document.getElementById("nr-auth-gate")?.classList.add("hidden");

  updateHeaderUserBadge();
  if (typeof loadJournalistNotes === "function") loadJournalistNotes();
  populateAllowedCategoriesInStudio();
  evaluateCharterAndSignatureState();
  if (typeof renderOverviewAndMyArticles === "function") renderOverviewAndMyArticles();
  if (typeof populateProfileAndKycView === "function") populateProfileAndKycView();
}

function executeImmediateLogout(showMsg = true) {
  state.currentUser = null;
  localStorage.removeItem(NR_ACTIVE_SESSION_KEY);
  refreshPinTabUiState();
  document.getElementById("nr-auth-gate")?.classList.remove("hidden");
  if (showMsg) showToast("تم تسجيل الخروج الآمن من غرفة الأخبار");
}

async function requestSafeLogout() {
  const { confirmed } = await askConfirmation({
    title: "تأكيد تسجيل الخروج",
    message: "هل تود الخروج الآن من غرفة الأخبار؟ جميع مسوداتك وملاحظاتك محفوظة بأمان.",
    confirmText: "نعم، تسجيل الخروج",
    icon: "logout",
    danger: false
  });
  if (confirmed) {
    executeImmediateLogout(true);
  }
}

function updateHeaderUserBadge() {
  const u = state.currentUser;
  if (!u) return;
  const avatar =
    u.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      u.name || "HP"
    )}&background=b80d38&color=fff`;

  document.getElementById("header-user-avatar")?.setAttribute("src", avatar);
  const nameEl = document.getElementById("header-user-name");
  if (nameEl) nameEl.textContent = u.name || "الصحفي";

  const pidEl = document.getElementById("header-user-press-id");
  if (pidEl) pidEl.textContent = normalizePressId(u.pressId || "HP10001");

  const welcomeTitle = document.getElementById("welcome-journalist-title");
  if (welcomeTitle) {
    welcomeTitle.textContent = `أهلاً بك، ${u.name || "زميلنا الصحفي"}`;
  }
}

// ==================== 6. ميثاق الشرف الصحفي والتوقيع الرقمي الحي (3 توقيعات / تحديث) ====================
function initSignaturePadCanvas() {
  const canvas = document.getElementById("signature-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const setupCanvasDimensions = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0) {
      canvas.width = rect.width;
      canvas.height = rect.height || 165;
      ctx.strokeStyle = "#0c0d0e";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  };

  setTimeout(setupCanvasDimensions, 90);
  window.addEventListener("resize", setupCanvasDimensions);

  const getPointerPos = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (ev) => {
    ev.preventDefault();
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && Math.abs(canvas.width - rect.width) > 12) {
      canvas.width = rect.width;
      canvas.height = rect.height || 165;
    }
    ctx.strokeStyle = "#0c0d0e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    state.isDrawingSig = true;
    state.hasCurrentStroke = true;
    const pos = getPointerPos(ev);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const moveDrawing = (ev) => {
    if (!state.isDrawingSig) return;
    ev.preventDefault();
    const pos = getPointerPos(ev);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    state.isDrawingSig = false;
  };

  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", moveDrawing);
  window.addEventListener("mouseup", stopDrawing);

  canvas.addEventListener("touchstart", startDrawing, { passive: false });
  canvas.addEventListener("touchmove", moveDrawing, { passive: false });
  window.addEventListener("touchend", stopDrawing);
}

function clearSignaturePad() {
  const canvas = document.getElementById("signature-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  state.hasCurrentStroke = false;
}

function evaluateCharterAndSignatureState() {
  const user = state.currentUser;
  if (!user) return;

  const currentCharterVer = Number(state.settings.charterVersion || 1);
  const userSignedVer = Number(user.signedCharterVersion || 0);
  const sigStatus = user.signatureStatus || "none";
  const wasEverApproved = Boolean(
    user.everApprovedCharter || sigStatus === "approved" || user.isMasterAdmin
  );

  const updateBanner = document.getElementById("charter-update-banner");
  const pendingBanner = document.getElementById("signature-pending-banner");

  updateBanner?.classList.add("hidden");
  pendingBanner?.classList.add("hidden");

  if (user.isMasterAdmin) {
    document.getElementById("pledge-overlay")?.classList.add("hidden");
    return;
  }

  if (sigStatus === "none" || sigStatus === "rejected") {
    openCharterModal("first_time");
    return;
  }

  if (sigStatus === "pending" && !wasEverApproved) {
    document.getElementById("pledge-overlay")?.classList.add("hidden");
    pendingBanner?.classList.remove("hidden");
    return;
  }

  if (wasEverApproved && userSignedVer < currentCharterVer) {
    updateBanner?.classList.remove("hidden");
    if (!window.__nrCharterUpdatePromptedOnce) {
      window.__nrCharterUpdatePromptedOnce = true;
      openCharterModal("update");
    }
    return;
  }

  document.getElementById("pledge-overlay")?.classList.add("hidden");
}

function openCharterModal(mode = "first_time") {
  state.pledgeMode = mode;
  state.pledgeRequiredCount = mode === "first_time" ? 3 : 1;
  state.pledgeSignatures = [];

  const overlay = document.getElementById("pledge-overlay");
  const contentBox = document.getElementById("pledge-charter-content");
  const leadText = document.getElementById("pledge-instruction-text");
  const postponeBtn = document.getElementById("postpone-charter-update-btn");
  const slotsWrap = document.getElementById("pledge-captured-slots");
  const padWrap = document.querySelector(".nr-sig-pad-container");
  const footerWrap = document.querySelector("#pledge-overlay .nr-modal-footer");

  if (contentBox) {
    contentBox.innerHTML = state.settings.charterHtml || DEFAULT_CHARTER_HTML;
  }

  if (mode === "read_only") {
    postponeBtn?.classList.remove("hidden");
    if (postponeBtn) {
      postponeBtn.innerHTML = `<span class="material-symbols-rounded" translate="no">close</span><span>إغلاق</span>`;
    }
    if (leadText) {
      leadText.textContent = "نسخة الاطلاع على بنود ميثاق الشرف الصحفي المعتمد في منصة حُجرية بريس.";
    }
    slotsWrap?.classList.add("hidden");
    padWrap?.classList.add("hidden");
    footerWrap?.classList.add("hidden");
    overlay?.classList.remove("hidden");
    return;
  }

  slotsWrap?.classList.toggle("hidden", mode !== "first_time");
  padWrap?.classList.remove("hidden");
  footerWrap?.classList.remove("hidden");

  if (mode === "first_time") {
    postponeBtn?.classList.add("hidden");
    if (leadText) {
      leadText.textContent =
        "يرجى قراءة بنود ميثاق الشرف الصحفي بعناية، ثم رسم توقيعك الشخصي (3 مرات متتالية ومتطابقة) ليتم حفظه في ملفك القانوني وإحالته للاعتماد.";
    }
  } else {
    postponeBtn?.classList.remove("hidden");
    if (postponeBtn) {
      postponeBtn.innerHTML = `<span class="material-symbols-rounded" translate="no">schedule</span><span>تأجيل مؤقت (لدي خبر عاجل)</span>`;
    }
    if (leadText) {
      leadText.textContent =
        "تم تحديث ميثاق الشرف الصحفي للمنصة. يرجى التوقيع (لمرة واحدة فقط) لتأكيد الاطلاع والموافقة، وسيبقى نشرك للأخبار مفعلاً دون أي توقف.";
    }
  }

  overlay?.classList.remove("hidden");
  clearSignaturePad();
  refreshPledgeSlotsAndButtons();
}

function refreshPledgeSlotsAndButtons() {
  const stepCounter = document.getElementById("pledge-step-counter");
  const btnLabel = document.getElementById("submit-signature-btn-label");
  const doneCount = state.pledgeSignatures.length;
  const total = state.pledgeRequiredCount;
  const currentStep = Math.min(total, doneCount + 1);

  if (stepCounter) {
    stepCounter.textContent =
      total === 3
        ? `التوقيع ${currentStep} من 3 (مطابقة التوقيع)`
        : "توقيع تحديث الميثاق (مرة واحدة)";
  }

  if (btnLabel) {
    btnLabel.textContent =
      currentStep < total
        ? `تأكيد التوقيع (${currentStep}/${total}) ورسم المطابق التالي`
        : "أوافق على ميثاق الشرف وأعتمد التوقيع النهائي";
  }

  [1, 2, 3].forEach((idx) => {
    const slotEl = document.getElementById(`sig-slot-${idx}`);
    if (!slotEl) return;
    const imgData = state.pledgeSignatures[idx - 1];
    if (imgData) {
      slotEl.classList.add("filled");
      slotEl.innerHTML = `<img src="${imgData}" alt="توقيع ${idx}">`;
    } else {
      slotEl.classList.remove("filled");
      slotEl.innerHTML = `<span>التوقيع (${idx})</span>`;
    }
  });
}

async function handleConfirmSignatureStep() {
  if (!state.hasCurrentStroke) {
    showToast("يرجى رسم توقيعك الحي داخل المربع أولاً");
    return;
  }

  const canvas = document.getElementById("signature-canvas");
  if (!canvas) return;
  const dataUrl = canvas.toDataURL("image/png");
  state.pledgeSignatures.push(dataUrl);

  if (state.pledgeSignatures.length < state.pledgeRequiredCount) {
    clearSignaturePad();
    refreshPledgeSlotsAndButtons();
    showToast(
      `تم التقاط التوقيع (${state.pledgeSignatures.length}/3) — ارسم الآن التوقيع المطابق التالي`
    );
    return;
  }

  const user = state.currentUser;
  if (!user || !user.id) return;

  setButtonLoading("submit-signature-step-btn", true, "جاري رفع وحفظ التوقيعات...");

  try {
    // رفع التوقيعات إلى ImgBB للحصول على روابط سحابية خفيفة
    const uploadedUrls = [];
    for (const rawSig of state.pledgeSignatures) {
      const uploaded = await uploadImageToImgBB(rawSig, 600, 0.85);
      uploadedUrls.push(uploaded.url);
    }

    const charterVersion = Number(state.settings.charterVersion || 1);
    const isUpdate = state.pledgeMode === "update";

    const payload = {
      signatures: uploadedUrls,
      primarySignature: uploadedUrls[0],
      signedCharterVersion: charterVersion,
      signatureStatus: "pending",
      signatureType: isUpdate ? "update" : "first_time",
      everApprovedCharter: Boolean(user.everApprovedCharter || isUpdate),
      signedAt: Date.now()
    };

    await saveStaffRecordToFirestore(user.id, payload);
    state.currentUser = { ...state.currentUser, ...payload };
    document.getElementById("pledge-overlay")?.classList.add("hidden");
    evaluateCharterAndSignatureState();
    if (typeof populateProfileAndKycView === "function") populateProfileAndKycView();

    showToast(
      isUpdate
        ? "تم إرسال توقيع تحديث الميثاق للمراجعة — يمكنك متابعة النشر كالمعتاد"
        : "تم حفظ وإرسال توقيعاتك الثلاثة لاعتماد الإدارة بنجاح"
    );
  } catch (err) {
    console.error(err);
    showToast("تعذر حفظ التوقيع، يرجى التحقق من الاتصال");
  } finally {
    setButtonLoading("submit-signature-step-btn", false);
  }
}

// ==================== 7. فلترة الأقسام المسموحة + استديو النشر المرحلي المقفل + المعاينة الحية ====================
function getAllowedCompassesForCurrentUser() {
  const visibleCompasses = [...state.compasses]
    .filter((c) => c.visible !== false)
    .sort((a, b) => (a.order || 99) - (b.order || 99));

  const user = state.currentUser;
  if (!user || user.isMasterAdmin) return visibleCompasses;

  let allowedRaw = [];
  if (Array.isArray(user.allowedCategories) && user.allowedCategories.length) {
    allowedRaw = user.allowedCategories;
  } else if (user.assignedCategory && String(user.assignedCategory).trim() !== "") {
    allowedRaw = [String(user.assignedCategory).trim()];
  }

  if (!allowedRaw.length || allowedRaw.includes("all") || allowedRaw.includes("الكل")) {
    return visibleCompasses;
  }

  const normalizedAllowed = allowedRaw.map((x) => cleanCategoryName(x).toLowerCase());
  const filtered = visibleCompasses.filter(
    (c) =>
      normalizedAllowed.includes(String(c.id || "").toLowerCase()) ||
      normalizedAllowed.includes(cleanCategoryName(c.name).toLowerCase())
  );

  // معالجة ذكية لفخ الأقسام المحذوفة: إذا حُذف القسم المخصص للصحفي نعيد الأقسام المتاحة لئلا ينهار الاستديو
  return filtered.length ? filtered : visibleCompasses;
}

function populateAllowedCategoriesInStudio() {
  const catSelect = document.getElementById("post-category");
  const subSelect = document.getElementById("post-subcategory");
  const restrictedNotice = document.getElementById("restricted-category-notice");
  const restrictedText = document.getElementById("restricted-category-text");
  const welcomeHint = document.getElementById("welcome-allowed-cats-hint");

  const allowedList = getAllowedCompassesForCurrentUser();
  const allVisibleCount = state.compasses.filter((c) => c.visible !== false).length;

  if (welcomeHint) {
    if (allowedList.length < allVisibleCount) {
      welcomeHint.textContent = `الأقسام المخصصة لصلاحيتك: ${allowedList
        .map((c) => cleanCategoryName(c.name))
        .join(" ، ")}`;
    } else {
      welcomeHint.textContent = "الأقسام المتاحة للنشر: جميع أقسام المنصة المعتمدة";
    }
  }

  if (!catSelect) return;
  const previousValue = catSelect.value;

  if (allowedList.length === 1) {
    const onlyCat = allowedList[0];
    const cleanName = cleanCategoryName(onlyCat.name);
    catSelect.innerHTML = `<option value="${escapeHtml(cleanName)}" selected>${escapeHtml(
      cleanName
    )}</option>`;
    catSelect.value = cleanName;
    restrictedNotice?.classList.remove("hidden");
    if (restrictedText) {
      restrictedText.textContent = `أنت مخول بالنشر في قسم (${cleanName}) كقسم حصري مخصص لحسابك.`;
    }
  } else {
    catSelect.innerHTML = [
      `<option value="" disabled ${!previousValue ? "selected" : ""}>اختر القسم الرئيسي للخبر...</option>`,
      ...allowedList.map((c) => {
        const cleanName = cleanCategoryName(c.name);
        return `<option value="${escapeHtml(cleanName)}">${escapeHtml(cleanName)}</option>`;
      })
    ].join("");

    if (
      previousValue &&
      allowedList.some((c) => cleanCategoryName(c.name) === cleanCategoryName(previousValue))
    ) {
      catSelect.value = cleanCategoryName(previousValue);
    }

    if (allowedList.length < allVisibleCount) {
      restrictedNotice?.classList.remove("hidden");
      if (restrictedText) {
        restrictedText.textContent = "الأقسام الظاهرة في القائمة هي الأقسام الممنوحة لصلاحيات حسابك.";
      }
    } else {
      restrictedNotice?.classList.add("hidden");
    }
  }

  const refreshSubcategories = () => {
    if (!subSelect) return;
    const chosenCat = catSelect.value;
    const matched = allowedList.find(
      (c) => cleanCategoryName(c.name) === cleanCategoryName(chosenCat) || c.id === chosenCat
    );
    const subs = matched?.subcategories || [];
    const prevSub = subSelect.value;
    subSelect.innerHTML = [
      `<option value="">بدون تصنيف فرعي</option>`,
      ...subs.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
    ].join("");
    if (prevSub && subs.includes(prevSub)) {
      subSelect.value = prevSub;
    }
    updateStudioProgressionLocks();
  };

  catSelect.onchange = () => {
    refreshSubcategories();
    saveStudioDraftToLocal();
  };

  refreshSubcategories();
}

function isStudioStep1Complete() {
  const title = (document.getElementById("post-title")?.value || "").trim();
  const summary = (document.getElementById("post-summary")?.value || "").trim();
  return title.length >= 5 && summary.length >= 10;
}

function isStudioStep2Complete() {
  const cat = (document.getElementById("post-category")?.value || "").trim();
  return isStudioStep1Complete() && Boolean(cat);
}

function updateStudioProgressionLocks() {
  const step1Done = isStudioStep1Complete();
  const step2Done = isStudioStep2Complete();

  const tab1 = document.getElementById("studio-tab-btn-1");
  const tab2 = document.getElementById("studio-tab-btn-2");
  const tab3 = document.getElementById("studio-tab-btn-3");

  const icon1 = document.getElementById("tab-icon-1");
  const icon2 = document.getElementById("tab-icon-2");
  const icon3 = document.getElementById("tab-icon-3");

  tab1?.classList.toggle("completed", step1Done);
  if (icon1) icon1.textContent = step1Done ? "check_circle" : "edit";

  tab2?.classList.toggle("locked", !step1Done);
  tab2?.classList.toggle("completed", step2Done);
  if (icon2) {
    icon2.textContent = !step1Done ? "lock" : step2Done ? "check_circle" : "tune";
  }

  tab3?.classList.toggle("locked", !step2Done);
  if (icon3) {
    icon3.textContent = !step2Done ? "lock" : "edit_note";
  }

  const ctxCat = document.getElementById("editor-context-category");
  const ctxTitle = document.getElementById("editor-context-title");
  if (ctxCat) {
    ctxCat.textContent =
      (document.getElementById("post-category")?.value || "").trim() || "القسم";
  }
  if (ctxTitle) {
    ctxTitle.textContent =
      (document.getElementById("post-title")?.value || "").trim() || "بدون عنوان";
  }
}

function switchStudioTab(targetStepNumber) {
  const step = Number(targetStepNumber) || 1;

  if (step >= 2 && !isStudioStep1Complete()) {
    showToast("يرجى كتابة العنوان الصحفي (5 أحرف فأكثر) والموجز الإخباري أولاً لفتح المرحلة الثانية");
    document.getElementById("post-title")?.focus();
    return;
  }

  if (step === 3 && !isStudioStep2Complete()) {
    showToast("يرجى اختيار القسم الرئيسي للخبر أولاً لفتح غرفة التحرير");
    return;
  }

  state.studioStep = step;

  [1, 2, 3].forEach((n) => {
    document.getElementById(`studio-pane-${n}`)?.classList.toggle("hidden", n !== step);
    const btn = document.getElementById(`studio-tab-btn-${n}`);
    if (btn) {
      btn.classList.toggle("active", n === step);
      btn.setAttribute("aria-selected", n === step ? "true" : "false");
    }
  });

  updateStudioProgressionLocks();
  updateEditorWordCount();
  saveStudioDraftToLocal();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleStudioFullscreenMode() {
  const studioCard = document.getElementById("nr-studio-container");
  const icon = document.getElementById("fullscreen-icon");
  const label = document.getElementById("fullscreen-label");
  if (!studioCard) return;

  state.isStudioFullscreen = !state.isStudioFullscreen;
  studioCard.classList.toggle("is-fullscreen", state.isStudioFullscreen);

  if (icon) {
    icon.textContent = state.isStudioFullscreen ? "close_fullscreen" : "open_in_full";
  }
  if (label) {
    label.textContent = state.isStudioFullscreen ? "إنهاء ملء الشاشة" : "ملء الشاشة";
  }
}

function openLiveArticlePreviewModal() {
  const modal = document.getElementById("nr-preview-modal");
  const body = document.getElementById("nr-preview-article-body");
  if (!modal || !body) return;

  const title = (document.getElementById("post-title")?.value || "").trim() || "عنوان الخبر التجريبي";
  const summary = (document.getElementById("post-summary")?.value || "").trim();
  const category = (document.getElementById("post-category")?.value || "").trim() || "عام";
  const subcategory = (document.getElementById("post-subcategory")?.value || "").trim();
  const imgUrl =
    state.studioMainImageUrl ||
    (document.getElementById("post-main-image-url")?.value || "").trim();
  const contentHtml =
    (document.getElementById("rich-text-editor")?.innerHTML || "").trim() ||
    `<p>${escapeHtml(summary)}</p>`;
  const authorName = state.currentUser?.name || "صحفي في حُجرية بريس";

  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
      <span class="nr-cat-badge">${escapeHtml(category)}</span>
      ${
        subcategory
          ? `<span style="font-size:0.76rem;font-weight:800;color:var(--text-muted);">• ${escapeHtml(
              subcategory
            )}</span>`
          : ""
      }
      <span style="font-size:0.78rem;color:var(--text-muted);margin-right:auto;">
        بقلم: <strong>${escapeHtml(authorName)}</strong> • معاينة قبل النشر
      </span>
    </div>
    <h1>${escapeHtml(title)}</h1>
    ${summary ? `<div class="nr-preview-summary">${escapeHtml(summary)}</div>` : ""}
    ${
      imgUrl
        ? `<img src="${escapeHtml(
            imgUrl
          )}" alt="" style="width:100%;max-height:420px;object-fit:cover;border-radius:10px;margin-bottom:18px;">`
        : ""
    }
    <div class="nr-preview-content">${contentHtml}</div>
  `;

  modal.classList.remove("hidden");
}

function updateTitleAndSummaryCounters() {
  const titleVal = document.getElementById("post-title")?.value || "";
  const sumVal = document.getElementById("post-summary")?.value || "";

  const tCounter = document.getElementById("title-char-counter");
  const sCounter = document.getElementById("summary-char-counter");

  if (tCounter) tCounter.textContent = `${titleVal.length} / 110`;
  if (sCounter) sCounter.textContent = `${sumVal.length} / 240`;
}

function updateEditorWordCount() {
  const editor = document.getElementById("rich-text-editor");
  const counterEl = document.getElementById("editor-word-counter");
  if (!editor || !counterEl) return;

  const plain = stripHtml(editor.innerHTML);
  const words = plain ? plain.split(/\s+/).filter(Boolean).length : 0;
  counterEl.textContent = `${words.toLocaleString("en-US")} كلمة`;
}

function renderMainImagePreview(imgUrl = "", hostType = "imgbb") {
  const wrap = document.getElementById("main-image-preview-wrap");
  const imgEl = document.getElementById("main-image-preview-el");
  const hintEl = document.getElementById("main-image-host-hint");
  if (!wrap || !imgEl) return;

  if (!imgUrl) {
    imgEl.src = "";
    wrap.classList.add("hidden");
    return;
  }

  imgEl.src = imgUrl;
  if (hintEl) {
    hintEl.textContent =
      hostType === "imgbb" || imgUrl.startsWith("http")
        ? "مرفوعة سحابياً برابط مباشر وسريع (ImgBB)"
        : "جاهزة ومضغوطة";
  }
  wrap.classList.remove("hidden");
}

function saveStudioDraftToLocal() {
  try {
    const payload = {
      savedAt: Date.now(),
      editingPostId: state.editingPostId,
      studioStep: state.studioStep,
      title: document.getElementById("post-title")?.value || "",
      summary: document.getElementById("post-summary")?.value || "",
      category: document.getElementById("post-category")?.value || "",
      subcategory: document.getElementById("post-subcategory")?.value || "",
      tags: document.getElementById("post-tags")?.value || "",
      isBreaking: Boolean(document.getElementById("post-is-breaking")?.checked),
      isFeatured: Boolean(document.getElementById("post-is-featured")?.checked),
      isQuickNews: Boolean(document.getElementById("post-is-quick")?.checked),
      imageUrl:
        state.studioMainImageUrl ||
        (document.getElementById("post-main-image-url")?.value || "").trim(),
      videoUrl: (document.getElementById("post-video-url")?.value || "").trim(),
      videoType: document.getElementById("post-video-type")?.value || "none",
      content: document.getElementById("rich-text-editor")?.innerHTML || ""
    };

    localStorage.setItem(NR_STUDIO_AUTOSAVE_KEY, JSON.stringify(payload));

    const textEl = document.getElementById("studio-autosave-text");
    if (textEl) {
      const timeStr = new Date().toLocaleTimeString("ar-YE", {
        hour: "2-digit",
        minute: "2-digit"
      });
      textEl.textContent = `حُفظ تلقائياً ${timeStr}`;
    }
  } catch (_) {}
}

/* === نهاية الجزء الأول من app.js — يُلصق الجزء الثاني تحته مباشرة === */
/* ==========================================================================
   حُجرية بريس (Hujariya Press) — المحرك البرمجي لغرفة الأخبار (app.js v6.0)
   [الجزء الثاني من 2 — يُلصق مباشرة أسفل الجزء الأول]:
   - استعادة المسودات + منع تكرار النشر + الاعتماد التفاعلي الآمن
   - الدرج الزجاجي المنزلق لدفتر الملاحظات الذكي + التحويل الفوري إلى منشور
   - سجل أخبار الكاتب + البحث الذكي الفوري (Debounced) + الترقيم الذكي (Pagination)
   - نظام الحذف الناعم (Soft Delete) مع طلب سبب الحذف وإحالته لغرفة التحكم
   - الملف الشخصي المدمج + رفع الصورة الشخصية والوثائق عبر ImgBB API + المزامنة الحية
   ========================================================================== */

function restoreStudioDraftFromLocal() {
  try {
    const raw = localStorage.getItem(NR_STUDIO_AUTOSAVE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved || (!saved.title && !saved.summary && !saved.content)) return;

    state.editingPostId = saved.editingPostId || null;
    state.studioMainImageUrl = saved.imageUrl || "";

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || "";
    };

    setVal("post-title", saved.title);
    setVal("post-summary", saved.summary);
    populateAllowedCategoriesInStudio();

    if (saved.category) {
      const catEl = document.getElementById("post-category");
      if (
        catEl &&
        Array.from(catEl.options).some((opt) => opt.value === saved.category)
      ) {
        catEl.value = saved.category;
        if (catEl.onchange) catEl.onchange();
      }
    }
    setVal("post-subcategory", saved.subcategory);
    setVal("post-tags", saved.tags);
    setVal("post-video-url", saved.videoUrl);
    setVal("post-video-type", saved.videoType || "none");

    if (saved.imageUrl && !saved.imageUrl.startsWith("data:")) {
      setVal("post-main-image-url", saved.imageUrl);
    }
    renderMainImagePreview(saved.imageUrl || "");

    const brk = document.getElementById("post-is-breaking");
    const feat = document.getElementById("post-is-featured");
    const qck = document.getElementById("post-is-quick");
    if (brk) brk.checked = Boolean(saved.isBreaking);
    if (feat) feat.checked = Boolean(saved.isFeatured);
    if (qck) qck.checked = Boolean(saved.isQuickNews);

    const editor = document.getElementById("rich-text-editor");
    if (editor && saved.content) {
      editor.innerHTML = saved.content;
    }

    updateTitleAndSummaryCounters();
    updateStudioProgressionLocks();
    updateEditorWordCount();

    if (saved.studioStep && saved.studioStep <= 3) {
      switchStudioTab(saved.studioStep);
    }
  } catch (_) {}
}

async function resetStudioCompletely(askUserFirst = false) {
  if (askUserFirst) {
    const hasContent =
      (document.getElementById("post-title")?.value || "").trim() ||
      stripHtml(document.getElementById("rich-text-editor")?.innerHTML || "");

    if (hasContent) {
      const { confirmed } = await askConfirmation({
        title: "بدء مقال جديد",
        message: "هل تريد تفريغ الحقول الحالية وبدء صياغة خبر جديد؟",
        confirmText: "نعم، تفريغ وبدء جديد",
        icon: "restart_alt",
        danger: true
      });
      if (!confirmed) return;
    }
  }

  state.editingPostId = null;
  state.studioMainImageUrl = "";
  state.studioStep = 1;
  localStorage.removeItem(NR_STUDIO_AUTOSAVE_KEY);

  document.getElementById("nr-article-studio-form")?.reset();
  const editor = document.getElementById("rich-text-editor");
  if (editor) editor.innerHTML = "";

  const heading = document.getElementById("studio-mode-heading");
  if (heading) heading.textContent = "استديو صياغة ونشر الأخبار";

  const pubLabel = document.getElementById("publish-btn-label");
  if (pubLabel) pubLabel.textContent = "إرسال ونشر الخبر";

  if (state.isStudioFullscreen) {
    toggleStudioFullscreenMode();
  }

  renderMainImagePreview("");
  populateAllowedCategoriesInStudio();
  updateTitleAndSummaryCounters();
  updateEditorWordCount();
  switchStudioTab(1);
}

function loadExistingArticleIntoStudio(postId) {
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return;

  state.editingPostId = post.id;
  state.studioMainImageUrl = post.imageUrl || "";

  switchMainView("view-studio");
  populateAllowedCategoriesInStudio();

  const heading = document.getElementById("studio-mode-heading");
  if (heading) heading.textContent = `تعديل الخبر: ${post.title}`;

  const pubLabel = document.getElementById("publish-btn-label");
  if (pubLabel) pubLabel.textContent = "حفظ التعديلات وإرسال";

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };

  setVal("post-title", post.title || "");
  setVal("post-summary", post.summary || "");

  const mainCat = cleanCategoryName(
    (Array.isArray(post.categories) && post.categories[0]) || post.category || ""
  );
  const catEl = document.getElementById("post-category");
  if (catEl && mainCat) {
    catEl.value = mainCat;
    if (catEl.onchange) catEl.onchange();
  }
  setVal("post-subcategory", post.subcategory || "");
  setVal(
    "post-tags",
    Array.isArray(post.tags)
      ? post.tags.map((t) => `#${String(t).replace(/^#+/, "")}`).join(" ")
      : ""
  );
  setVal("post-video-url", post.videoUrl || "");
  setVal("post-video-type", post.videoType || "none");

  if (post.imageUrl && !post.imageUrl.startsWith("data:")) {
    setVal("post-main-image-url", post.imageUrl);
  }
  renderMainImagePreview(post.imageUrl || "");

  const brk = document.getElementById("post-is-breaking");
  const feat = document.getElementById("post-is-featured");
  const qck = document.getElementById("post-is-quick");
  if (brk) brk.checked = Boolean(post.isBreaking);
  if (feat) feat.checked = Boolean(post.isFeatured);
  if (qck) qck.checked = Boolean(post.isQuickNews);

  const editor = document.getElementById("rich-text-editor");
  if (editor) editor.innerHTML = post.content || "";

  updateTitleAndSummaryCounters();
  updateStudioProgressionLocks();
  updateEditorWordCount();
  switchStudioTab(1);
  showToast("تم فتح المادة الصحفية في الاستديو للتعديل");
}

async function submitArticleFromStudio(asDraft = false, skipConfirmModal = false) {
  if (state.isSubmittingArticle) return;

  const user = state.currentUser;
  if (!user) return;

  const sigStatus = user.signatureStatus || "none";
  const wasEverApproved = Boolean(
    user.everApprovedCharter || sigStatus === "approved" || user.isMasterAdmin
  );

  if (!asDraft && !wasEverApproved) {
    showToast(
      "توقيعك على ميثاق الشرف قيد مراجعة الإدارة. يمكنك حفظ الخبر كمسودة الآن ريثما يُعتمد حسابك."
    );
    return;
  }

  const title = (document.getElementById("post-title")?.value || "").trim();
  const summary = (document.getElementById("post-summary")?.value || "").trim();
  const category = cleanCategoryName(
    (document.getElementById("post-category")?.value || "").trim()
  );
  const subcategory = (document.getElementById("post-subcategory")?.value || "").trim();
  const rawTags = (document.getElementById("post-tags")?.value || "").trim();
  const editorHtml = (document.getElementById("rich-text-editor")?.innerHTML || "").trim();

  if (title.length < 5) {
    switchStudioTab(1);
    showToast("يرجى كتابة عنوان صحفي واضح (5 أحرف على الأقل)");
    return;
  }

  if (!asDraft && summary.length < 10) {
    switchStudioTab(1);
    showToast("يرجى كتابة الموجز الإخباري للخبر");
    return;
  }

  const allowedCompasses = getAllowedCompassesForCurrentUser();
  const finalCategory =
    category || cleanCategoryName(allowedCompasses[0]?.name || "السياسة اليمنية");

  if (!asDraft && !stripHtml(editorHtml) && !summary) {
    switchStudioTab(3);
    showToast("يرجى كتابة تفاصيل الخبر في غرفة التحرير قبل النشر");
    return;
  }

  // نظام منع تكرار نشر نفس المنشور مرتين بالخطأ
  const currentFingerprint = `${title.toLowerCase()}__${stripHtml(editorHtml).slice(0, 120)}`;
  if (!asDraft && !state.editingPostId) {
    const duplicateInDb = state.posts.find(
      (p) =>
        String(p.title || "").trim().toLowerCase() === title.toLowerCase() &&
        p.status !== "delete_request"
    );
    if (duplicateInDb || state.lastPublishedFingerprint === currentFingerprint) {
      showToast("هذا الخبر منشور بالفعل بنفس العنوان! يرجى تعديل العنوان أو المحتوى لمنع التكرار.");
      return;
    }
  }

  // نافذة تأكيد تفاعلية قبل الإرسال النهائي للنشر
  if (!asDraft && !skipConfirmModal) {
    const { confirmed } = await askConfirmation({
      title: state.editingPostId ? "تأكيد حفظ وتحديث الخبر" : "تأكيد إرسال ونشر الخبر",
      message: `سيتم إرسال الخبر بعنوان: «${title}» في قسم (${finalCategory}). هل تود المتابعة؟`,
      confirmText: "نعم، اعتمد وأرسل الآن",
      icon: "send",
      danger: false
    });
    if (!confirmed) return;
  }

  const tagsList = rawTags
    .split(/[\s,،]+/)
    .map((t) => t.replace(/^#+/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  const hasDirectPublishPrivilege = Boolean(
    user.isMasterAdmin ||
      user.directPublish === true ||
      user.role === "admin" ||
      user.role === "trusted_writer"
  );

  const targetStatus = asDraft
    ? "draft"
    : hasDirectPublishPrivilege
    ? "published"
    : "pending";

  const isBreaking = Boolean(document.getElementById("post-is-breaking")?.checked);
  const imageUrl =
    state.studioMainImageUrl ||
    (document.getElementById("post-main-image-url")?.value || "").trim();

  const postData = {
    title,
    summary,
    category: finalCategory,
    categories: [finalCategory],
    subcategory,
    tags: tagsList,
    content: editorHtml || `<p>${escapeHtml(summary)}</p>`,
    imageUrl,
    videoUrl: (document.getElementById("post-video-url")?.value || "").trim(),
    videoType: document.getElementById("post-video-type")?.value || "none",
    isBreaking,
    breakingExpiresAt: isBreaking ? Date.now() + 6 * 3600 * 1000 : null,
    isFeatured: Boolean(document.getElementById("post-is-featured")?.checked),
    isQuickNews: Boolean(document.getElementById("post-is-quick")?.checked),
    status: targetStatus,
    updatedAt: Date.now()
  };

  state.isSubmittingArticle = true;
  const activeBtnId = asDraft ? "save-article-draft-btn" : "submit-article-publish-btn";
  setButtonLoading(
    activeBtnId,
    true,
    asDraft ? "جاري حفظ المسودة..." : "جاري الإرسال والنشر..."
  );

  try {
    if (state.editingPostId) {
      await updateDoc(doc(db, "posts", state.editingPostId), postData);
    } else {
      await addDoc(collection(db, "posts"), {
        ...postData,
        author: user.name || "صحفي في حُجرية بريس",
        authorId: user.id || "",
        authorPressId: normalizePressId(user.pressId || ""),
        authorUsername: user.username || "",
        authorAvatar: user.avatar || "",
        authorVerified: Boolean(user.verified || user.isMasterAdmin),
        views: 0,
        createdAt: Date.now(),
        createdTimestamp: serverTimestamp()
      });
      state.lastPublishedFingerprint = currentFingerprint;
    }

    document.getElementById("nr-preview-modal")?.classList.add("hidden");
    await resetStudioCompletely(false);
    switchMainView("view-overview");

    if (targetStatus === "draft") {
      showToast("تم حفظ المادة الصحفية في المسودات المؤقتة بنجاح ✓");
    } else if (targetStatus === "pending") {
      showToast("تم إرسال الخبر إلى غرفة التحكم للاعتماد والنشر ✓");
    } else {
      showToast("تم نشر الخبر مباشرة على الموقع العام بنجاح ✓");
    }
  } catch (err) {
    console.error(err);
    showToast("حدث خطأ أثناء حفظ الخبر، يرجى التحقق من اتصال الإنترنت");
  } finally {
    state.isSubmittingArticle = false;
    setButtonLoading(activeBtnId, false);
  }
}

// ==================== 8. الدرج الزجاجي المنزلق لدفتر الملاحظات الذكي + التحويل الفوري ====================
function openNotesDrawer() {
  document.getElementById("nr-notes-drawer-backdrop")?.classList.remove("hidden");
  document.getElementById("nr-notes-drawer")?.classList.remove("hidden");
  renderSavedNotesList();
}

function closeNotesDrawer() {
  document.getElementById("nr-notes-drawer-backdrop")?.classList.add("hidden");
  document.getElementById("nr-notes-drawer")?.classList.add("hidden");
}

function getStorageKeyForUserNotes() {
  const uid = state.currentUser?.id || state.currentUser?.pressId || "default";
  return `${NR_LOCAL_NOTES_KEY}_${uid}`;
}

function loadJournalistNotes() {
  try {
    const localRaw = localStorage.getItem(getStorageKeyForUserNotes());
    const localNotes = localRaw ? JSON.parse(localRaw) : [];
    const cloudNotes = Array.isArray(state.currentUser?.notes)
      ? state.currentUser.notes
      : [];

    const mergedMap = new Map();
    [...cloudNotes, ...localNotes].forEach((n) => {
      if (n && n.id) mergedMap.set(n.id, n);
    });

    state.notes = Array.from(mergedMap.values()).sort(
      (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
    );
    renderSavedNotesList();
  } catch (_) {
    state.notes = [];
    renderSavedNotesList();
  }
}

async function persistJournalistNotes() {
  try {
    localStorage.setItem(getStorageKeyForUserNotes(), JSON.stringify(state.notes));
    const user = state.currentUser;
    if (user && user.id) {
      await saveStaffRecordToFirestore(user.id, { notes: state.notes });
    }
  } catch (_) {}
}

function saveNoteEntry(titleRaw, bodyRaw, existingId = "") {
  const title = String(titleRaw || "").trim();
  const body = String(bodyRaw || "").trim();
  if (!title && !body) {
    showToast("يرجى كتابة عنوان أو نص الملاحظة أولاً");
    return null;
  }

  const finalTitle = title || body.slice(0, 55);
  const now = Date.now();

  if (existingId) {
    state.notes = state.notes.map((n) =>
      n.id === existingId ? { ...n, title: finalTitle, body, updatedAt: now } : n
    );
  } else {
    const newNote = {
      id: `note_${now}_${Math.random().toString(36).slice(2, 6)}`,
      title: finalTitle,
      body,
      createdAt: now,
      updatedAt: now
    };
    state.notes.unshift(newNote);
  }

  persistJournalistNotes();
  renderSavedNotesList();
  return { title: finalTitle, body };
}

function convertNoteToStudioArticle(noteTitleRaw, noteBodyRaw) {
  const cleanTitle = String(noteTitleRaw || "").trim();
  const cleanBody = String(noteBodyRaw || "").trim();

  if (!cleanTitle && !cleanBody) {
    showToast("اكتب فكرة أو ملاحظة أولاً لتحويلها إلى منشور");
    return;
  }

  const derivedTitle = (cleanTitle || cleanBody.split("\n")[0] || "").slice(0, 110);
  const summarySource = cleanBody || cleanTitle;
  const derivedSummary = summarySource
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 230);

  const paragraphsHtml = cleanBody
    ? cleanBody
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join("")
    : `<p>${escapeHtml(derivedTitle)}</p>`;

  state.editingPostId = null;
  state.studioMainImageUrl = "";

  closeNotesDrawer();
  switchMainView("view-studio");
  populateAllowedCategoriesInStudio();

  const titleInput = document.getElementById("post-title");
  const summaryInput = document.getElementById("post-summary");
  const editor = document.getElementById("rich-text-editor");

  if (titleInput) titleInput.value = derivedTitle;
  if (summaryInput) {
    summaryInput.value =
      derivedSummary.length >= 10
        ? derivedSummary
        : `${derivedSummary} — تفاصيل الخبر عبر منصة حُجرية بريس.`;
  }
  if (editor) editor.innerHTML = paragraphsHtml;

  updateTitleAndSummaryCounters();
  updateStudioProgressionLocks();
  updateEditorWordCount();
  saveStudioDraftToLocal();
  switchStudioTab(1);

  showToast("تم تحويل الملاحظة وتعبئة حقول الاستديو تلقائياً ✓");
}

function renderSavedNotesList() {
  const totalNotes = state.notes.length;

  ["desktop-notes-badge", "mobile-notes-badge"].forEach((id) => {
    const badge = document.getElementById(id);
    if (badge) {
      badge.textContent = String(totalNotes);
      badge.classList.toggle("hidden", totalNotes === 0);
    }
  });

  const countLabel = document.getElementById("drawer-notes-count-label");
  if (countLabel) countLabel.textContent = `${totalNotes} ملاحظة`;

  const grid = document.getElementById("saved-notes-grid");
  if (!grid) return;

  if (!totalNotes) {
    grid.innerHTML = `
      <div class="nr-empty-state">
        <span class="material-symbols-rounded" translate="no">sticky_note_2</span>
        <p>لا توجد ملاحظات محفوظة بعد. دوّن أفكارك هنا وحوّلها لمنشور بضغطة زر.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = state.notes
    .map(
      (n) => `
      <article class="nr-note-card">
        <h3>${escapeHtml(n.title)}</h3>
        <p>${escapeHtml(n.body)}</p>
        <div class="nr-note-card-foot">
          <small style="color:var(--text-muted);font-weight:700;font-size:0.74rem;">
            ${formatArabicDate(n.updatedAt || n.createdAt)}
          </small>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button type="button" class="nr-btn nr-btn-primary nr-btn-sm" data-convert-note="${escapeHtml(
              n.id
            )}">
              <span class="material-symbols-rounded" style="font-size:16px;" translate="no">transform</span>
              <span>تحويل لمنشور</span>
            </button>
            <button type="button" class="nr-btn nr-btn-secondary nr-btn-sm" data-edit-note="${escapeHtml(
              n.id
            )}">
              <span class="material-symbols-rounded" style="font-size:16px;" translate="no">edit</span>
            </button>
            <button type="button" class="nr-btn nr-btn-danger nr-btn-sm" data-delete-note="${escapeHtml(
              n.id
            )}">
              <span class="material-symbols-rounded" style="font-size:16px;" translate="no">delete</span>
            </button>
          </div>
        </div>
      </article>
    `
    )
    .join("");

  grid.querySelectorAll("[data-convert-note]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const note = state.notes.find((x) => x.id === btn.getAttribute("data-convert-note"));
      if (note) convertNoteToStudioArticle(note.title, note.body);
    });
  });

  grid.querySelectorAll("[data-edit-note]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const note = state.notes.find((x) => x.id === btn.getAttribute("data-edit-note"));
      if (!note) return;
      document.getElementById("editing-note-id").value = note.id;
      document.getElementById("note-title-input").value = note.title || "";
      document.getElementById("note-body-input").value = note.body || "";
      document.getElementById("note-title-input")?.focus();
    });
  });

  grid.querySelectorAll("[data-delete-note]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delete-note");
      const { confirmed } = await askConfirmation({
        title: "حذف الملاحظة",
        message: "هل أنت متأكد من حذف هذه الملاحظة من دفترك؟",
        confirmText: "نعم، حذف",
        icon: "delete",
        danger: true
      });
      if (!confirmed) return;
      state.notes = state.notes.filter((x) => x.id !== id);
      persistJournalistNotes();
      renderSavedNotesList();
      showToast("تم حذف الملاحظة");
    });
  });
}

// ==================== 9. سجل أخبار الكاتب + البحث الذكي + الترقيم + الحذف الناعم (Soft Delete) ====================
function getJournalistOwnPosts() {
  const u = state.currentUser;
  if (!u) return [];
  const myPid = normalizePressId(u.pressId || "");

  return state.posts.filter((p) => {
    if (u.id && p.authorId && p.authorId === u.id) return true;
    if (myPid && p.authorPressId && normalizePressId(p.authorPressId) === myPid) return true;
    if (
      u.username &&
      p.authorUsername &&
      String(p.authorUsername).toLowerCase() === String(u.username).toLowerCase()
    ) {
      return true;
    }
    if (u.name && p.author && String(p.author).trim() === String(u.name).trim()) {
      return true;
    }
    return false;
  });
}

function getStatusBadgeMarkup(status) {
  const st = status || "published";
  if (st === "published") {
    return `<span class="nr-status-pill st-published"><span class="material-symbols-rounded" style="font-size:15px;" translate="no">check_circle</span>منشور ومفعل</span>`;
  }
  if (st === "pending") {
    return `<span class="nr-status-pill st-pending"><span class="material-symbols-rounded" style="font-size:15px;" translate="no">schedule</span>قيد المراجعة</span>`;
  }
  if (st === "delete_request") {
    return `<span class="nr-status-pill st-rejected"><span class="material-symbols-rounded" style="font-size:15px;" translate="no">auto_delete</span>مطلوب حذفه (مخفي مؤقتاً)</span>`;
  }
  if (st === "rejected") {
    return `<span class="nr-status-pill st-rejected"><span class="material-symbols-rounded" style="font-size:15px;" translate="no">error</span>معاد للتعديل</span>`;
  }
  return `<span class="nr-status-pill st-draft"><span class="material-symbols-rounded" style="font-size:15px;" translate="no">edit_note</span>مسودة مؤقتة</span>`;
}

function renderOverviewAndMyArticles() {
  const myPosts = getJournalistOwnPosts();

  const publishedCount = myPosts.filter((p) => !p.status || p.status === "published").length;
  const pendingCount = myPosts.filter((p) => p.status === "pending").length;
  const draftsCount = myPosts.filter(
    (p) => p.status === "draft" || p.status === "rejected"
  ).length;
  const totalViews = myPosts.reduce((acc, p) => acc + Number(p.views || 0), 0);

  const setNum = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = Number(val || 0).toLocaleString("en-US");
  };

  setNum("stat-my-published", publishedCount);
  setNum("stat-my-pending", pendingCount);
  setNum("stat-my-drafts", draftsCount);
  setNum("stat-my-views", totalViews);

  const listEl = document.getElementById("my-articles-list");
  const paginationBar = document.getElementById("my-articles-pagination");
  if (!listEl) return;

  let filtered = [...myPosts];
  if (state.myPostsStatusFilter !== "all") {
    if (state.myPostsStatusFilter === "published") {
      filtered = filtered.filter((p) => !p.status || p.status === "published");
    } else if (state.myPostsStatusFilter === "draft") {
      filtered = filtered.filter((p) => p.status === "draft" || p.status === "rejected");
    } else {
      filtered = filtered.filter((p) => p.status === state.myPostsStatusFilter);
    }
  }

  // البحث الذكي الفوري في العنوان، الملخص، القسم، والوسوم
  if (state.myPostsSearchQuery) {
    const terms = state.myPostsSearchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    filtered = filtered.filter((p) => {
      const haystack = `${p.title || ""} ${p.summary || ""} ${p.category || ""} ${
        Array.isArray(p.tags) ? p.tags.join(" ") : ""
      }`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }

  if (!filtered.length) {
    listEl.innerHTML = `
      <div class="nr-empty-state">
        <span class="material-symbols-rounded" translate="no">article</span>
        <p>لا توجد مواد صحفية مطابقة في هذا التصنيف حالياً.</p>
      </div>
    `;
    paginationBar?.classList.add("hidden");
    return;
  }

  // حساب ترقيم الصفحات الذكي (Smart Pagination)
  const totalPages = Math.max(1, Math.ceil(filtered.length / ARTICLES_PER_PAGE));
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  if (state.currentPage < 1) state.currentPage = 1;

  const startIdx = (state.currentPage - 1) * ARTICLES_PER_PAGE;
  const pageItems = filtered.slice(startIdx, startIdx + ARTICLES_PER_PAGE);

  if (paginationBar) {
    paginationBar.classList.toggle("hidden", totalPages <= 1);
    const pageInfo = document.getElementById("page-info-label");
    const prevBtn = document.getElementById("page-prev-btn");
    const nextBtn = document.getElementById("page-next-btn");

    if (pageInfo) {
      pageInfo.textContent = `صفحة ${state.currentPage} من ${totalPages} (إجمالي ${filtered.length} خبر)`;
    }
    if (prevBtn) prevBtn.disabled = state.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = state.currentPage >= totalPages;
  }

  listEl.innerHTML = pageItems
    .map((post) => {
      const cat = cleanCategoryName(
        (Array.isArray(post.categories) && post.categories[0]) || post.category || "عام"
      );
      const views = Number(post.views || 0).toLocaleString("en-US");
      const isDeleteRequested = post.status === "delete_request";

      return `
        <article class="nr-article-row">
          <div style="flex:1;min-width:220px;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px;">
              ${getStatusBadgeMarkup(post.status)}
              <span style="font-size:0.74rem;font-weight:800;color:var(--brand-primary);background:var(--brand-soft);padding:2px 8px;border-radius:5px;">
                ${escapeHtml(cat)}
              </span>
              <span style="font-size:0.74rem;color:var(--text-muted);font-weight:700;">
                ${formatArabicDate(post)} • ${views} قراءة
              </span>
            </div>
            <h3 style="font-size:0.96rem;font-weight:900;color:var(--text-main);">
              ${escapeHtml(post.title || "بدون عنوان")}
            </h3>
            ${
              isDeleteRequested && post.deleteReason
                ? `<small style="display:block;color:var(--danger-red);font-weight:700;margin-top:3px;">سبب طلب الحذف: ${escapeHtml(
                    post.deleteReason
                  )}</small>`
                : ""
            }
          </div>

          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <button type="button" class="nr-btn nr-btn-secondary nr-btn-sm" data-edit-article="${escapeHtml(
              post.id
            )}">
              <span class="material-symbols-rounded" style="font-size:17px;" translate="no">edit</span>
              <span>تعديل</span>
            </button>

            ${
              isDeleteRequested
                ? `<button type="button" class="nr-btn nr-btn-ghost nr-btn-sm" data-cancel-delete-req="${escapeHtml(
                    post.id
                  )}" title="إلغاء طلب الحذف واستعادة المنشور">
                    <span class="material-symbols-rounded" style="font-size:17px;" translate="no">restore</span>
                    <span>تراجع عن الحذف</span>
                  </button>`
                : `<button type="button" class="nr-btn nr-btn-danger nr-btn-sm" data-soft-delete-article="${escapeHtml(
                    post.id
                  )}" title="${post.status === "draft" ? "حذف المسودة" : "طلب حذف الخبر وإحالته للإدارة"}">
                    <span class="material-symbols-rounded" style="font-size:17px;" translate="no">auto_delete</span>
                    <span>${post.status === "draft" ? "حذف المسودة" : "طلب حذف"}</span>
                  </button>`
            }
          </div>
        </article>
      `;
    })
    .join("");

  listEl.querySelectorAll("[data-edit-article]").forEach((btn) => {
    btn.addEventListener("click", () => {
      loadExistingArticleIntoStudio(btn.getAttribute("data-edit-article"));
    });
  });

  // إلغاء طلب الحذف من طرف الكاتب قبل بتّ الإدارة فيه
  listEl.querySelectorAll("[data-cancel-delete-req]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-cancel-delete-req");
      const post = state.posts.find((x) => x.id === id);
      if (!post) return;
      const previousStatus = post.previousStatusBeforeDelete || "published";
      try {
        await updateDoc(doc(db, "posts", id), {
          status: previousStatus,
          deleteReason: ""
        });
        showToast("تم التراجع عن طلب الحذف واستعادة حالة الخبر ✓");
      } catch (_) {
        showToast("تعذر استعادة الخبر");
      }
    });
  });

  // نظام الحذف الناعم (Soft Delete): المسودة تُحذف بتأكيد، أما المنشور فيُخفى فوراً من الموقع العام ويُحال لمراجعات الإدارة
  listEl.querySelectorAll("[data-soft-delete-article]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-soft-delete-article");
      const post = state.posts.find((x) => x.id === id);
      if (!post) return;

      if (post.status === "draft") {
        const { confirmed } = await askConfirmation({
          title: "حذف المسودة المؤقتة",
          message: `هل أنت متأكد من حذف المسودة «${post.title}»؟`,
          confirmText: "نعم، حذف المسودة",
          icon: "delete",
          danger: true
        });
        if (!confirmed) return;
        try {
          await deleteDoc(doc(db, "posts", id));
          showToast("تم حذف المسودة بنجاح");
        } catch (_) {
          showToast("تعذر حذف المسودة");
        }
        return;
      }

      // إذا كان الخبر منشوراً أو معلقاً -> نطلب سبب الحذف ونحيله لغرفة التحكم مع إخفائه الفوري من الموقع العام
      const { confirmed, reason } = await askConfirmation({
        title: "طلب حذف منشور وإحالته للإدارة",
        message: `سيختفي الخبر «${post.title}» فوراً من الموقع العام، وسيتم إشعار الإدارة في غرفة التحكم بمراجعة طلب الحذف.`,
        confirmText: "تأكيد طلب الحذف",
        icon: "auto_delete",
        danger: true,
        requireReason: true,
        reasonPlaceholder: "اذكر سبب طلب حذف هذا الخبر للإدارة..."
      });

      if (!confirmed) return;

      try {
        await updateDoc(doc(db, "posts", id), {
          previousStatusBeforeDelete: post.status || "published",
          status: "delete_request",
          deleteReason: reason || "طلب حذف من الكاتب",
          deleteRequestedAt: Date.now()
        });
        showToast("تم إخفاء الخبر من الموقع العام وإحالة طلب الحذف إلى غرفة التحكم ✓");
      } catch (_) {
        showToast("تعذر إرسال طلب الحذف");
      }
    });
  });
}

// ==================== 10. الملف الشخصي المدمج، الهوية الصحفية (HP)، ورفع الوثائق لـ ImgBB ====================
function populateProfileAndKycView() {
  const u = state.currentUser;
  if (!u) return;

  const avatarUrl =
    u.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      u.name || "HP"
    )}&background=b80d38&color=fff`;
  const pressId = normalizePressId(u.pressId || "HP10001");
  const isVer = Boolean(u.verified || u.isMasterAdmin);

  document.getElementById("profile-card-avatar")?.setAttribute("src", avatarUrl);
  const nameEl = document.getElementById("profile-card-name");
  if (nameEl) nameEl.textContent = u.name || "صحفي في حُجرية بريس";

  document.getElementById("profile-verified-icon")?.classList.toggle("hidden", !isVer);

  const roleEl = document.getElementById("profile-card-role");
  if (roleEl) roleEl.textContent = u.jobTitle || "صحفي ومحرر إخباري";

  const pidEl = document.getElementById("profile-card-press-id");
  if (pidEl) pidEl.textContent = pressId;

  const charterSt = document.getElementById("profile-charter-status");
  if (charterSt) {
    if (u.signatureStatus === "approved" || u.everApprovedCharter || u.isMasterAdmin) {
      charterSt.textContent = `معتمد (الإصدار ${u.signedCharterVersion || 1})`;
      charterSt.style.color = "var(--success-green)";
    } else if (u.signatureStatus === "pending") {
      charterSt.textContent = "بانتظار اعتماد الإدارة";
      charterSt.style.color = "var(--warning-amber)";
    } else {
      charterSt.textContent = "يتطلب التوقيع";
      charterSt.style.color = "var(--danger-red)";
    }
  }

  const kycSt = document.getElementById("profile-kyc-status");
  if (kycSt) {
    if (isVer) {
      kycSt.textContent = "موثق بالشارة الزرقاء";
      kycSt.style.color = "var(--verified-blue)";
    } else if (u.kycStatus === "pending") {
      kycSt.textContent = "الوثائق قيد مراجعة الإدارة";
      kycSt.style.color = "var(--warning-amber)";
    } else {
      kycSt.textContent = "غير موثق بعد";
      kycSt.style.color = "var(--text-muted)";
    }
  }

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };

  setVal("my-account-username", u.username || "");
  setVal("my-account-password", u.password || "");
  setVal("my-account-pin", u.pinCode || u.pin || "");
  setVal("my-account-bio", u.bio || "");

  setVal("kyc-contact-email", u.contactEmail || u.email || "");
  setVal("kyc-whatsapp-number", u.whatsapp || "");
  setVal("kyc-legal-name", u.legalName || u.name || "");
  setVal("kyc-doc-type", u.docType || "id_card");
  setVal("kyc-doc-number", u.docNumber || "");
  setVal("kyc-issue-date", u.docIssueDate || "");
  setVal("kyc-dob", u.dob || "");

  state.kycFrontUrl = u.docFrontImg || "";
  state.kycBackUrl = u.docBackImg || "";
  state.kycSelfieUrl = u.selfieImg || "";

  renderKycThumbPreview("kyc-front-preview", "kyc-front-status-text", state.kycFrontUrl);
  renderKycThumbPreview("kyc-back-preview", "kyc-back-status-text", state.kycBackUrl);
  renderKycThumbPreview("kyc-selfie-preview", "kyc-selfie-status-text", state.kycSelfieUrl);

  updateDocumentTypeFieldsVisibility();
  updateProminentAndLiveAge(u.dob || "");
  updateDirectContactButtons(u.contactEmail || u.email || "", u.whatsapp || "");
}

function updateDocumentTypeFieldsVisibility() {
  const docType = document.getElementById("kyc-doc-type")?.value || "id_card";
  const backCard = document.getElementById("kyc-back-upload-card");
  const frontTitle = document.getElementById("kyc-front-label-title");

  if (docType === "passport") {
    backCard?.classList.add("hidden");
    if (frontTitle) frontTitle.textContent = "صورة جواز السفر (صفحة البيانات)";
  } else {
    backCard?.classList.remove("hidden");
    if (frontTitle) frontTitle.textContent = "صورة وجه البطاقة الشخصية";
  }
}

function updateProminentAndLiveAge(dobValue) {
  const age = calculateAutoAge(dobValue);
  const prominentAgeEl = document.getElementById("profile-prominent-age");
  const liveKycAgeEl = document.getElementById("kyc-live-age-text");

  if (age !== null) {
    if (prominentAgeEl) prominentAgeEl.textContent = `${age} سنة (محدث آلياً من تاريخ الميلاد)`;
    if (liveKycAgeEl) liveKycAgeEl.textContent = `${age} سنة — مطابق لتاريخ الميلاد المدخل`;
  } else {
    if (prominentAgeEl) prominentAgeEl.textContent = "يُحسب تلقائياً عند إدخال تاريخ الميلاد";
    if (liveKycAgeEl) liveKycAgeEl.textContent = "أدخل تاريخ الميلاد لحساب العمر تلقائياً";
  }
}

function updateDirectContactButtons(emailRaw, whatsappRaw) {
  const emailClean = String(emailRaw || "").trim();
  const waDigits = String(whatsappRaw || "").replace(/[^\d]/g, "");

  const mailBtn = document.getElementById("kyc-email-direct-btn");
  const waBtn = document.getElementById("kyc-whatsapp-direct-btn");
  const cardContactsBox = document.getElementById("profile-direct-contacts");

  if (mailBtn) {
    if (emailClean) {
      mailBtn.href = `mailto:${encodeURIComponent(emailClean)}`;
      mailBtn.classList.remove("hidden");
    } else {
      mailBtn.classList.add("hidden");
    }
  }

  if (waBtn) {
    if (waDigits.length >= 7) {
      waBtn.href = `https://wa.me/${waDigits}`;
      waBtn.classList.remove("hidden");
    } else {
      waBtn.classList.add("hidden");
    }
  }

  if (cardContactsBox) {
    const buttons = [];
    if (waDigits.length >= 7) {
      buttons.push(`
        <a href="https://wa.me/${waDigits}" target="_blank" rel="noopener" class="nr-btn nr-btn-secondary nr-btn-sm" style="flex:1;color:#15803d;border-color:#86efac;background:#f0fdf4;text-decoration:none;">
          <span class="material-symbols-rounded" style="font-size:17px;" translate="no">chat</span>
          <span>واتساب مباشر</span>
        </a>
      `);
    }
    if (emailClean) {
      buttons.push(`
        <a href="mailto:${encodeURIComponent(emailClean)}" class="nr-btn nr-btn-secondary nr-btn-sm" style="flex:1;text-decoration:none;">
          <span class="material-symbols-rounded" style="font-size:17px;" translate="no">mail</span>
          <span>بريد مباشر</span>
        </a>
      `);
    }
    cardContactsBox.innerHTML = buttons.join("");
  }
}

function renderKycThumbPreview(containerId, statusTextId, imgUrl) {
  const box = document.getElementById(containerId);
  const statusEl = statusTextId ? document.getElementById(statusTextId) : null;
  if (!box) return;

  if (!imgUrl) {
    box.innerHTML = "";
    box.classList.add("hidden");
    if (statusEl) statusEl.textContent = "اضغط لرفع الصورة";
    return;
  }

  box.classList.remove("hidden");
  box.innerHTML = `<img src="${escapeHtml(imgUrl)}" alt="مرفق الهوية">`;
  if (statusEl) statusEl.textContent = "تم الرفع بنجاح ✓ (اضغط للتغيير)";
}

async function handleSaveCredentialsAndPin(e) {
  e.preventDefault();
  const user = state.currentUser;
  if (!user || !user.id) return;

  const username = (document.getElementById("my-account-username")?.value || "").trim();
  const password = (document.getElementById("my-account-password")?.value || "").trim();
  const pinCode = (document.getElementById("my-account-pin")?.value || "").trim();
  const bio = (document.getElementById("my-account-bio")?.value || "").trim();

  if (!username || !password) {
    showToast("اسم المستخدم وكلمة المرور حقول أساسية لا يمكن تركها فارغة");
    return;
  }

  const duplicate = state.staff.find(
    (s) =>
      s.id !== user.id &&
      String(s.username || "").trim().toLowerCase() === username.toLowerCase()
  );
  if (duplicate) {
    showToast("اسم المستخدم هذا مستخدم بالفعل، يرجى اختيار اسم آخر");
    return;
  }

  setButtonLoading("save-credentials-btn", true, "جاري الحفظ وتوثيق الجهاز...");

  const updatePayload = {
    pressId: normalizePressId(user.pressId || "HP10001"),
    name: user.name || "صحفي",
    username,
    password,
    pinCode,
    bio,
    updatedAt: Date.now()
  };

  try {
    await saveStaffRecordToFirestore(user.id, updatePayload);
    state.currentUser = { ...state.currentUser, ...updatePayload };
    bindCurrentAccountToDevice(state.currentUser);
    showToast("تم حفظ بيانات الدخول وتفعيل الرمز السريع (PIN) على جهازك هذا بنجاح ✓");
  } catch (err) {
    console.error(err);
    showToast("تعذر حفظ بيانات الدخول");
  } finally {
    setButtonLoading("save-credentials-btn", false);
  }
}

async function handleSubmitKycForm(e) {
  e.preventDefault();
  const user = state.currentUser;
  if (!user || !user.id) return;

  if (user.signatureStatus === "none" || !user.signatureStatus) {
    showToast("يجب التوقيع على ميثاق الشرف الصحفي أولاً لربطه بطلب توثيق الهوية والشارة الزرقاء");
    openCharterModal("first_time");
    return;
  }

  const contactEmail = (document.getElementById("kyc-contact-email")?.value || "").trim();
  const whatsapp = (document.getElementById("kyc-whatsapp-number")?.value || "").trim();
  const legalName = (document.getElementById("kyc-legal-name")?.value || "").trim();
  const docType = document.getElementById("kyc-doc-type")?.value || "id_card";
  const docNumber = (document.getElementById("kyc-doc-number")?.value || "").trim();
  const docIssueDate = document.getElementById("kyc-issue-date")?.value || "";
  const dob = document.getElementById("kyc-dob")?.value || "";

  if (!legalName || !docNumber || !docIssueDate || !dob) {
    showToast("يرجى إكمال كافة بيانات الوثيقة وتاريخ الإصدار وتاريخ الميلاد");
    return;
  }

  if (!state.kycFrontUrl || !state.kycSelfieUrl) {
    showToast("يرجى رفع صورة الوثيقة الرسمية وصورة السيلفي الواضحة للتحقق");
    return;
  }

  if (docType === "id_card" && !state.kycBackUrl) {
    showToast("يرجى رفع صورة ظهر البطاقة الشخصية");
    return;
  }

  setButtonLoading("submit-kyc-btn", true, "جاري حفظ الوثائق وإرسال الطلب...");

  const calculatedAge = calculateAutoAge(dob);
  const kycPayload = {
    pressId: normalizePressId(user.pressId || "HP10001"),
    name: user.name || legalName,
    contactEmail,
    email: contactEmail || user.email || "",
    whatsapp,
    legalName,
    docType,
    docNumber,
    docIssueDate,
    dob,
    calculatedAge,
    docFrontImg: state.kycFrontUrl,
    docBackImg: docType === "passport" ? "" : state.kycBackUrl,
    selfieImg: state.kycSelfieUrl,
    kycStatus: "pending",
    kycSubmittedAt: Date.now()
  };

  try {
    await saveStaffRecordToFirestore(user.id, kycPayload);
    state.currentUser = { ...state.currentUser, ...kycPayload };
    populateProfileAndKycView();
    showToast("تم حفظ بيانات الهوية الرسمية وإرسال طلب التوثيق للإدارة بنجاح ✓");
  } catch (err) {
    console.error(err);
    showToast("حدث خطأ أثناء حفظ بيانات التوثيق");
  } finally {
    setButtonLoading("submit-kyc-btn", false);
  }
}

// ==================== 11. إدارة التنقل وربط جميع الأحداث التفاعلية ====================
function switchMainView(viewId) {
  state.activeView = viewId;

  ["view-overview", "view-studio", "view-profile"].forEach((id) => {
    document.getElementById(id)?.classList.toggle("hidden", id !== viewId);
  });

  document.querySelectorAll(".nr-nav-btn[data-view], .nr-mob-nav-item[data-view]").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-view") === viewId);
  });

  if (viewId === "view-overview") {
    renderOverviewAndMyArticles();
  } else if (viewId === "view-studio") {
    populateAllowedCategoriesInStudio();
    updateStudioProgressionLocks();
  } else if (viewId === "view-profile") {
    populateProfileAndKycView();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindAllEvents() {
  // 1. بوابة الدخول
  const tabCred = document.getElementById("auth-tab-credentials");
  const tabPin = document.getElementById("auth-tab-pin");
  const formCred = document.getElementById("nr-login-credentials-form");
  const boxPin = document.getElementById("nr-login-pin-container");

  tabCred?.addEventListener("click", () => {
    tabCred.classList.add("active");
    tabPin?.classList.remove("active");
    formCred?.classList.remove("hidden");
    boxPin?.classList.add("hidden");
  });

  tabPin?.addEventListener("click", () => {
    tabPin.classList.add("active");
    tabCred?.classList.remove("active");
    boxPin?.classList.remove("hidden");
    formCred?.classList.add("hidden");
    refreshPinTabUiState();
    document.getElementById("login-pin-code")?.focus();
  });

  document.getElementById("toggle-login-pass-btn")?.addEventListener("click", () => {
    const inp = document.getElementById("login-password");
    if (inp) inp.type = inp.type === "password" ? "text" : "password";
  });

  document.getElementById("switch-bound-account-btn")?.addEventListener("click", () => {
    clearDeviceBoundAccount();
    tabCred?.click();
    showToast("تم إلغاء ربط الجهاز، يمكنك الدخول بحساب آخر عبر كلمة المرور");
  });

  formCred?.addEventListener("submit", (e) => {
    e.preventDefault();
    const idVal = document.getElementById("login-identifier")?.value || "";
    const passVal = document.getElementById("login-password")?.value || "";
    const matched = verifyStandardLogin(idVal, passVal);
    if (!matched) {
      showToast("بيانات الدخول غير صحيحة. تأكد من الهوية الصحفية (HP) أو اسم المستخدم وكلمة المرور.");
      return;
    }
    activateJournalistSession(matched, true);
    showToast(`أهلاً بك في غرفة الأخبار: ${matched.name}`);
  });

  document.getElementById("nr-login-pin-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const pinVal = document.getElementById("login-pin-code")?.value || "";
    const result = verifyDeviceBoundPinLogin(pinVal);
    if (result.error) {
      showToast(result.error);
      return;
    }
    activateJournalistSession(result.user, false);
    const pinInput = document.getElementById("login-pin-code");
    if (pinInput) pinInput.value = "";
    showToast(`مرحباً بعودتك: ${result.user.name}`);
  });

  // 2. التنقل العلوي والسفلي وفتح درج الملاحظات الذكي
  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchMainView(btn.getAttribute("data-view") || "view-overview");
    });
  });

  document.querySelectorAll("[data-open-notes]").forEach((btn) => {
    btn.addEventListener("click", openNotesDrawer);
  });

  document.getElementById("header-user-pill")?.addEventListener("click", () => {
    switchMainView("view-profile");
  });

  document.getElementById("header-logout-btn")?.addEventListener("click", requestSafeLogout);

  // 3. ميثاق الشرف والتوقيع
  document.getElementById("clear-signature-btn")?.addEventListener("click", clearSignaturePad);
  document
    .getElementById("submit-signature-step-btn")
    ?.addEventListener("click", handleConfirmSignatureStep);

  document.getElementById("postpone-charter-update-btn")?.addEventListener("click", () => {
    document.getElementById("pledge-overlay")?.classList.add("hidden");
    if (state.pledgeMode === "update") {
      document.getElementById("charter-update-banner")?.classList.remove("hidden");
      showToast("يمكنك إنجاز خبرك العاجل الآن والتوقيع لاحقاً من الشريط العلوي");
    }
  });

  document.getElementById("banner-open-charter-btn")?.addEventListener("click", () => {
    openCharterModal("update");
  });

  document.getElementById("footer-read-charter-btn")?.addEventListener("click", () => {
    openCharterModal("read_only");
  });

  // 4. اللوحة الرئيسية، الفلاتر، البحث الذكي الفوري، وترقيم الصفحات
  document.getElementById("hero-new-article-btn")?.addEventListener("click", () => {
    switchMainView("view-studio");
  });

  document.getElementById("hero-open-notes-btn")?.addEventListener("click", openNotesDrawer);

  document.querySelectorAll("#my-posts-status-filters .nr-filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.myPostsStatusFilter = chip.getAttribute("data-status-filter") || "all";
      state.currentPage = 1;
      document
        .querySelectorAll("#my-posts-status-filters .nr-filter-chip")
        .forEach((c) => c.classList.toggle("active", c === chip));
      renderOverviewAndMyArticles();
    });
  });

  const searchInp = document.getElementById("my-posts-search-input");
  const clearSearchBtn = document.getElementById("clear-posts-search-btn");

  const runDebouncedSearch = debounce((val) => {
    state.myPostsSearchQuery = val;
    state.currentPage = 1;
    renderOverviewAndMyArticles();
  }, 200);

  searchInp?.addEventListener("input", (e) => {
    const val = (e.target.value || "").trim();
    clearSearchBtn?.classList.toggle("hidden", !val);
    runDebouncedSearch(val);
  });

  clearSearchBtn?.addEventListener("click", () => {
    if (searchInp) searchInp.value = "";
    clearSearchBtn.classList.add("hidden");
    state.myPostsSearchQuery = "";
    state.currentPage = 1;
    renderOverviewAndMyArticles();
  });

  document.getElementById("page-prev-btn")?.addEventListener("click", () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderOverviewAndMyArticles();
    }
  });

  document.getElementById("page-next-btn")?.addEventListener("click", () => {
    state.currentPage++;
    renderOverviewAndMyArticles();
  });

  // 5. استديو النشر المرحلي، رفع الصور لـ ImgBB، المعاينة الحية، ووضع ملء الشاشة
  document.querySelectorAll(".nr-step-tab[data-studio-tab]").forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => {
      switchStudioTab(Number(tabBtn.getAttribute("data-studio-tab") || 1));
    });
  });

  document.getElementById("to-step-2-btn")?.addEventListener("click", () => switchStudioTab(2));
  document.getElementById("back-to-step-1-btn")?.addEventListener("click", () => switchStudioTab(1));
  document.getElementById("to-step-3-btn")?.addEventListener("click", () => switchStudioTab(3));
  document.getElementById("back-to-step-2-btn")?.addEventListener("click", () => switchStudioTab(2));

  document.getElementById("studio-open-notes-btn")?.addEventListener("click", openNotesDrawer);
  document.getElementById("studio-reset-new-btn")?.addEventListener("click", () => {
    resetStudioCompletely(true);
  });

  document
    .getElementById("toggle-fullscreen-editor-btn")
    ?.addEventListener("click", toggleStudioFullscreenMode);

  document
    .getElementById("preview-article-btn")
    ?.addEventListener("click", openLiveArticlePreviewModal);

  document.getElementById("close-preview-modal-btn")?.addEventListener("click", () => {
    document.getElementById("nr-preview-modal")?.classList.add("hidden");
  });

  document.getElementById("preview-close-back-btn")?.addEventListener("click", () => {
    document.getElementById("nr-preview-modal")?.classList.add("hidden");
  });

  document.getElementById("preview-publish-now-btn")?.addEventListener("click", () => {
    submitArticleFromStudio(false, true);
  });

  ["post-title", "post-summary", "post-tags", "post-video-url", "post-video-type"].forEach(
    (id) => {
      document.getElementById(id)?.addEventListener("input", () => {
        updateTitleAndSummaryCounters();
        updateStudioProgressionLocks();
        saveStudioDraftToLocal();
      });
    }
  );

  ["post-is-breaking", "post-is-featured", "post-is-quick", "post-subcategory"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", saveStudioDraftToLocal);
  });

  // رفع الصورة البارزة عبر ImgBB API مع مؤشر تفاعلي واضح
  document.getElementById("post-main-image-file")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const labelEl = document.getElementById("main-img-upload-label");
    const iconEl = document.getElementById("main-img-upload-icon");
    try {
      if (labelEl) labelEl.textContent = "جاري رفع الصورة إلى سحابة ImgBB...";
      if (iconEl) iconEl.textContent = "hourglass_top";
      const uploaded = await uploadImageToImgBB(file, 1200, 0.82);
      state.studioMainImageUrl = uploaded.url;
      if (!uploaded.url.startsWith("data:")) {
        const urlInput = document.getElementById("post-main-image-url");
        if (urlInput) urlInput.value = uploaded.url;
      }
      renderMainImagePreview(uploaded.url, uploaded.host);
      saveStudioDraftToLocal();
      showToast("تم رفع الصورة البارزة وتوليد رابطها المباشر بنجاح ✓");
    } catch (_) {
      showToast("تعذر رفع ملف الصورة");
    } finally {
      if (labelEl) labelEl.textContent = "اضغط لرفع صورة من جهازك";
      if (iconEl) iconEl.textContent = "cloud_upload";
    }
  });

  document.getElementById("post-main-image-url")?.addEventListener("input", (e) => {
    const url = (e.target.value || "").trim();
    state.studioMainImageUrl = url;
    renderMainImagePreview(url, "url");
    saveStudioDraftToLocal();
  });

  document.getElementById("clear-main-image-btn")?.addEventListener("click", () => {
    state.studioMainImageUrl = "";
    const fInp = document.getElementById("post-main-image-file");
    const uInp = document.getElementById("post-main-image-url");
    if (fInp) fInp.value = "";
    if (uInp) uInp.value = "";
    renderMainImagePreview("");
    saveStudioDraftToLocal();
  });

  // الوسوم المقترحة الذكية
  document.querySelectorAll("#suggested-tags-bar .nr-tag-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tagToAdd = btn.getAttribute("data-tag") || "";
      const tagInput = document.getElementById("post-tags");
      if (!tagInput || !tagToAdd) return;
      const existing = tagInput.value
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (existing.includes(tagToAdd)) return;
      if (existing.length >= 3) {
        showToast("الحد الأقصى هو 3 وسوم لكل خبر");
        return;
      }
      existing.push(tagToAdd);
      tagInput.value = existing.join(" ");
      saveStudioDraftToLocal();
    });
  });

  // أدوات تنسيق محرر المقال + رفع الصور بين الفقرات إلى ImgBB
  document.querySelectorAll(".nr-editor-toolbar .nr-tool-btn[data-cmd]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cmd = btn.getAttribute("data-cmd");
      const val = btn.getAttribute("data-val") || null;
      document.execCommand(cmd, false, val);
      document.getElementById("rich-text-editor")?.focus();
      updateEditorWordCount();
      saveStudioDraftToLocal();
    });
  });

  document.getElementById("insert-inline-image-btn")?.addEventListener("click", () => {
    document.getElementById("inline-image-hidden-input")?.click();
  });

  document.getElementById("inline-image-hidden-input")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const btnText = document.getElementById("inline-img-btn-text");
    try {
      if (btnText) btnText.textContent = "جاري الرفع...";
      const uploaded = await uploadImageToImgBB(file, 1050, 0.8);
      const caption = prompt("أدخل وصفاً توضيحياً يظهر أسفل الصورة (اختياري):") || "";
      const figureHtml = `
        <figure class="inline-article-figure">
          <img src="${uploaded.url}" alt="${escapeHtml(caption)}">
          ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
        </figure><p><br></p>
      `;
      const editor = document.getElementById("rich-text-editor");
      if (editor) {
        editor.focus();
        document.execCommand("insertHTML", false, figureHtml);
        saveStudioDraftToLocal();
      }
      e.target.value = "";
      showToast("تم رفع وإدراج الصورة داخل المقال بنجاح ✓");
    } catch (_) {
      showToast("تعذر إدراج الصورة");
    } finally {
      if (btnText) btnText.textContent = "صورة بين الفقرات";
    }
  });

  document.getElementById("insert-editor-link-btn")?.addEventListener("click", () => {
    const url = prompt("أدخل الرابط الكامل (https://...):", "https://");
    if (url && url !== "https://") {
      document.execCommand("createLink", false, url.trim());
      saveStudioDraftToLocal();
    }
  });

  document.getElementById("rich-text-editor")?.addEventListener("input", () => {
    updateEditorWordCount();
    saveStudioDraftToLocal();
  });

  document.getElementById("save-article-draft-btn")?.addEventListener("click", () => {
    submitArticleFromStudio(true);
  });

  document.getElementById("submit-article-publish-btn")?.addEventListener("click", () => {
    submitArticleFromStudio(false);
  });

  // 6. أحداث الدرج الزجاجي المنزلق لدفتر الملاحظات الذكي
  document.getElementById("close-notes-drawer-btn")?.addEventListener("click", closeNotesDrawer);
  document
    .getElementById("nr-notes-drawer-backdrop")
    ?.addEventListener("click", closeNotesDrawer);

  document.getElementById("clear-note-form-btn")?.addEventListener("click", () => {
    document.getElementById("editing-note-id").value = "";
    document.getElementById("nr-note-form")?.reset();
  });

  document.getElementById("nr-note-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const editId = document.getElementById("editing-note-id")?.value || "";
    const t = document.getElementById("note-title-input")?.value || "";
    const b = document.getElementById("note-body-input")?.value || "";
    const saved = saveNoteEntry(t, b, editId);
    if (saved) {
      document.getElementById("editing-note-id").value = "";
      document.getElementById("nr-note-form")?.reset();
      showToast("تم حفظ الملاحظة في دفترك الشخصي ✓");
    }
  });

  document.getElementById("convert-current-note-btn")?.addEventListener("click", () => {
    const editId = document.getElementById("editing-note-id")?.value || "";
    const t = document.getElementById("note-title-input")?.value || "";
    const b = document.getElementById("note-body-input")?.value || "";
    if (!t.trim() && !b.trim()) {
      showToast("اكتب عنوان أو نص الملاحظة أولاً لتحويلها إلى منشور");
      return;
    }
    saveNoteEntry(t, b, editId);
    document.getElementById("editing-note-id").value = "";
    document.getElementById("nr-note-form")?.reset();
    convertNoteToStudioArticle(t, b);
  });

  // 7. أحداث الملف الشخصي، التبويبات المدمجة، ورفع الصور والوثائق إلى ImgBB
  document.querySelectorAll("[data-profile-tab]").forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => {
      const targetId = tabBtn.getAttribute("data-profile-tab");
      document
        .querySelectorAll("[data-profile-tab]")
        .forEach((b) => b.classList.toggle("active", b === tabBtn));
      ["prof-pane-kyc", "prof-pane-security"].forEach((id) => {
        document.getElementById(id)?.classList.toggle("hidden", id !== targetId);
      });
    });
  });

  document.getElementById("copy-press-id-btn")?.addEventListener("click", async () => {
    const pid = document.getElementById("profile-card-press-id")?.textContent || "";
    if (!pid) return;
    try {
      await navigator.clipboard.writeText(pid.trim());
      showToast(`تم نسخ رقم الهوية الصحفية: ${pid}`);
    } catch (_) {}
  });

  // رفع وتحديث الصورة الشخصية عبر ImgBB وحفظها في Firestore لجميع الحسابات (بما فيها master-admin)
  document.getElementById("profile-avatar-file")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    const user = state.currentUser;
    if (!file || !user || !user.id) return;
    try {
      showToast("جاري رفع صورتك الشخصية سحابياً...");
      const uploaded = await uploadImageToImgBB(file, 520, 0.84);
      await saveStaffRecordToFirestore(user.id, {
        pressId: normalizePressId(user.pressId || "HP10001"),
        name: user.name || "رئيس التحرير",
        avatar: uploaded.url,
        updatedAt: Date.now()
      });
      state.currentUser.avatar = uploaded.url;
      bindCurrentAccountToDevice(state.currentUser);
      updateHeaderUserBadge();
      populateProfileAndKycView();
      showToast("تم رفع وتثبيت صورتك الشخصية بنجاح ✓");
    } catch (_) {
      showToast("تعذر رفع الصورة الشخصية");
    }
  });

  document
    .getElementById("nr-credentials-update-form")
    ?.addEventListener("submit", handleSaveCredentialsAndPin);

  document.getElementById("kyc-doc-type")?.addEventListener("change", () => {
    updateDocumentTypeFieldsVisibility();
  });

  document.getElementById("kyc-dob")?.addEventListener("change", (e) => {
    updateProminentAndLiveAge(e.target.value);
  });

  document.getElementById("kyc-contact-email")?.addEventListener("input", (e) => {
    updateDirectContactButtons(
      e.target.value,
      document.getElementById("kyc-whatsapp-number")?.value || ""
    );
  });

  document.getElementById("kyc-whatsapp-number")?.addEventListener("input", (e) => {
    updateDirectContactButtons(
      document.getElementById("kyc-contact-email")?.value || "",
      e.target.value
    );
  });

  const bindKycCloudUpload = (inputId, stateKey, previewId, statusTextId) => {
    document.getElementById(inputId)?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const statusEl = document.getElementById(statusTextId);
      try {
        if (statusEl) statusEl.textContent = "جاري الرفع إلى ImgBB...";
        const uploaded = await uploadImageToImgBB(file, 1000, 0.82);
        state[stateKey] = uploaded.url;
        renderKycThumbPreview(previewId, statusTextId, uploaded.url);
        showToast("تم رفع صورة الوثيقة بنجاح ✓");
      } catch (_) {
        if (statusEl) statusEl.textContent = "فشل الرفع، حاول مجدداً";
        showToast("تعذر رفع صورة الوثيقة");
      }
    });
  };

  bindKycCloudUpload(
    "kyc-front-file",
    "kycFrontUrl",
    "kyc-front-preview",
    "kyc-front-status-text"
  );
  bindKycCloudUpload(
    "kyc-back-file",
    "kycBackUrl",
    "kyc-back-preview",
    "kyc-back-status-text"
  );
  bindKycCloudUpload(
    "kyc-selfie-file",
    "kycSelfieUrl",
    "kyc-selfie-preview",
    "kyc-selfie-status-text"
  );

  document.getElementById("nr-kyc-form")?.addEventListener("submit", handleSubmitKycForm);
}

// ==================== 12. استعادة الجلسة والمزامنة الحية مع Firestore ====================
function tryRestoreActiveSession() {
  try {
    const raw = localStorage.getItem(NR_ACTIVE_SESSION_KEY);
    if (!raw) {
      document.getElementById("nr-auth-gate")?.classList.remove("hidden");
      return;
    }
    const saved = JSON.parse(raw);

    const foundInStaff = state.staff.find(
      (s) =>
        s.id === saved?.id ||
        (saved?.pressId && normalizePressId(s.pressId) === normalizePressId(saved.pressId))
    );

    if (saved?.id === "master-admin" || saved?.pressId === "HP10001") {
      activateJournalistSession(
        { ...MASTER_ACCOUNT_FALLBACK, ...(foundInStaff || {}) },
        false
      );
      return;
    }

    if (foundInStaff) {
      activateJournalistSession(foundInStaff, false);
    } else if (state.staff.length > 0) {
      document.getElementById("nr-auth-gate")?.classList.remove("hidden");
    }
  } catch (_) {
    document.getElementById("nr-auth-gate")?.classList.remove("hidden");
  }
}

function startFirestoreRealtimeSync() {
  onSnapshot(doc(db, "settings", "general"), (snap) => {
    if (snap.exists()) {
      state.settings = { ...state.settings, ...snap.data() };
      applyDynamicThemeAndLogos();
      saveFastCache();
      if (state.currentUser) {
        evaluateCharterAndSignatureState();
      }
    }
  });

  onSnapshot(collection(db, "categories"), (snap) => {
    if (!snap.empty) {
      const dbCats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const merged = [...DEFAULT_COMPASSES];
      dbCats.forEach((cat) => {
        const idx = merged.findIndex(
          (m) =>
            m.id === cat.id ||
            cleanCategoryName(m.name) === cleanCategoryName(cat.name)
        );
        if (idx >= 0) merged[idx] = { ...merged[idx], ...cat };
        else merged.push(cat);
      });
      state.compasses = merged;
      saveFastCache();
      if (state.currentUser) {
        populateAllowedCategoriesInStudio();
      }
    }
  });

  onSnapshot(collection(db, "staff"), (snap) => {
    state.staff = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    saveFastCache();
    refreshPinTabUiState();

    if (state.currentUser) {
      const freshMe = state.staff.find((s) => s.id === state.currentUser.id);
      if (freshMe) {
        if (freshMe.accountStatus === "frozen" || freshMe.suspended === true) {
          executeImmediateLogout(false);
          showToast("تم إيقاف الحساب من قِبل إدارة المنصة");
          return;
        }
        state.currentUser = { ...state.currentUser, ...freshMe };
        updateHeaderUserBadge();
        populateAllowedCategoriesInStudio();
        evaluateCharterAndSignatureState();
        if (state.activeView === "view-profile") {
          populateProfileAndKycView();
        }
      }
    } else {
      tryRestoreActiveSession();
    }
  });

  onSnapshot(collection(db, "posts"), (snap) => {
    state.posts = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => getTimestampMs(b) - getTimestampMs(a));

    saveFastCache();
    if (state.currentUser) {
      renderOverviewAndMyArticles();
    }
  });
}

// ==================== 13. نقطة الانطلاق الفورية لغرفة الأخبار (0ms Instant Boot) ====================
document.addEventListener("DOMContentLoaded", () => {
  restoreFastCache();
  applyDynamicThemeAndLogos();
  refreshPinTabUiState();
  initSignaturePadCanvas();
  bindAllEvents();
  tryRestoreActiveSession();
  restoreStudioDraftFromLocal();
  startFirestoreRealtimeSync();
});
