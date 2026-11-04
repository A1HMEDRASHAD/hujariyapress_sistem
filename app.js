/* ==========================================================================
   حُجرية بريس (Hujariya Press) — المحرك البرمجي الشامل لغرفة الأخبار (app.js)
   مخصص لبيئة عمل الصحفيين والكتّاب (مستقل، فائق السرعة، ومحكم الأمان):
   1. الهوية اللونية الديناميكية + دعم الشعارات الثلاثة والأيقونات الحية من قاعدة البيانات
   2. أمان الدخول: الهوية الصحفية (HP#####) أو المعرف + كلمة المرور، مع ربط رمز (PIN) بالجهاز الموثق فقط
   3. ميثاق الشرف الصحفي والتوقيع الرقمي: 3 توقيعات متطابقة لأول مرة، وتوقيع واحد غير معطل عند التحديث
   4. تقييد الأقسام (Category Permissions): إظهار الأقسام المسموحة للصحفي فقط (أو قسمه الوحيد إجبارياً)
   5. استديو النشر بنظام التبويبات المقفلة (Locked Step Tabs) + الحفظ التلقائي الفوري + الصور بين الفقرات
   6. دفتر الملاحظات الذكي + زر التحويل الفوري من ملاحظة إلى مشروع مقال مكتمل في الاستديو
   7. بطاقة الهوية الصحفية الثابتة (HP#####) + العمر التلقائي البارز + نموذج التوثيق الرسمي (KYC)
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==================== 1. إعدادات الاتصال بقاعدة بيانات Firebase ====================
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

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

// مفاتيح التخزين المحلي والأمان المرتبط بالجهاز
const NR_ACTIVE_SESSION_KEY = "hujariya_nr_active_session_v5";
const NR_DEVICE_BOUND_KEY = "hujariya_nr_device_bound_v5";
const NR_FAST_CACHE_KEY = "hujariya_nr_fast_cache_v5";
const NR_STUDIO_AUTOSAVE_KEY = "hujariya_nr_studio_autosave_v5";
const NR_LOCAL_NOTES_KEY = "hujariya_nr_local_notes_v5";

const DEFAULT_BRAND_COLOR = "#b80d38";

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

// ==================== 2. الحالة المركزية لغرفة الأخبار (State) ====================
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
  myPostsStatusFilter: "all",
  myPostsSearchQuery: "",
  // حالة استديو النشر المرحلي المقفل
  studioStep: 1,
  editingPostId: null,
  studioMainImageData: "",
  // حالة التوقيع الرقمي على ميثاق الشرف
  pledgeMode: "first_time", // "first_time" | "update" | "read_only"
  pledgeRequiredCount: 3,
  pledgeSignatures: [],
  isDrawingSig: false,
  hasCurrentStroke: false,
  // مرفقات التوثيق المؤقتة
  kycFrontData: "",
  kycBackData: "",
  kycSelfieData: ""
};

// ==================== 3. الدوال المساعدة، الهوية اللونية، وحساب العمر ====================
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
  let candidateNum = 10012 + staffList.length * 9;
  while (existing.has(`HP${candidateNum}`)) {
    candidateNum += Math.floor(Math.random() * 7) + 1;
  }
  return `HP${String(candidateNum).slice(0, 5).padStart(5, "1")}`;
}

function showToast(msg) {
  const toast = document.getElementById("nr-toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(window.__nrToastTimer);
  window.__nrToastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3300);
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

// حساب العمر الفعلي تلقائياً من تاريخ الميلاد (يتحدث آلياً مع الزمن)
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

// تحويل اللون السداسي إلى قيم RGB لتوليد الظلال والخلفيات الناعمة ديناميكياً مهما تغير لون الهوية
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

// تطبيق الهوية اللونية الديناميكية والشعارات الثلاثة
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
  root.style.setProperty("--brand-border", `rgba(${rgb}, 0.24)`);
  root.style.setProperty("--brand-shadow", `0 8px 26px rgba(${rgb}, 0.14)`);

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

  // الشعارات الثلاثة (شعار الهيدر، شعار الفوتر، وشعار بوابة الدخول/القائمة)
  const mainLogo = (s.headerLogoUrl || s.logoUrl || "").trim();
  const footerLogo = (s.footerLogoUrl || s.logoUrl || "").trim();
  const authLogo = (s.authLogoUrl || s.sidebarLogoUrl || s.logoUrl || "").trim();

  const bindLogoSlot = (imgId, capsuleId, url) => {
    const imgEl = document.getElementById(imgId);
    const capEl = capsuleId ? document.getElementById(capsuleId) : null;
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

  bindLogoSlot("auth-logo-img", "auth-logo-capsule", authLogo);
  bindLogoSlot("header-logo-img", "header-logo-capsule", mainLogo);
  bindLogoSlot("footer-logo-img", null, footerLogo);

  const fav = (s.faviconUrl || s.appIconUrl || mainLogo || "").trim();
  if (fav) {
    document.getElementById("nr-dynamic-favicon")?.setAttribute("href", fav);
    document.getElementById("nr-dynamic-apple-icon")?.setAttribute("href", fav);
  }
}

// ضغط الصور إلى WebP خفيف وسريع يناسب الإنترنت الضعيف
function compressImageToWebp(file, maxWidth = 1100, quality = 0.78) {
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

// ==================== 4. التخزين المؤقت الفوري (0ms Fast Cache) ====================
function saveFastCache() {
  try {
    const cacheData = {
      savedAt: Date.now(),
      settings: state.settings,
      compasses: state.compasses,
      staff: state.staff,
      posts: state.posts.slice(0, 70)
    };
    localStorage.setItem(NR_FAST_CACHE_KEY, JSON.stringify(cacheData));
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

// ==================== 5. نظام الدخول المحكم والرمز السريع المرتبط بالجهاز فقط ====================
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
  if (pidEl) pidEl.textContent = bound.pressId || "HP";
}

function verifyStandardLogin(identifierRaw, passwordRaw) {
  const idClean = String(identifierRaw || "").trim().toLowerCase();
  const pressIdClean = normalizePressId(identifierRaw);
  const passClean = String(passwordRaw || "").trim();

  // فحص حساب رئيس التحرير الاحتياطي
  const masterUser = String(state.settings.masterUsername || "admin").toLowerCase();
  const masterPass = String(state.settings.masterPassword || "admin");
  if (
    (idClean === masterUser || pressIdClean === "HP10001") &&
    passClean === masterPass
  ) {
    return { ...MASTER_ACCOUNT_FALLBACK };
  }

  // البحث في الكادر بالهوية الصحفية (HP10042) أو اسم المستخدم أو البريد الإلكتروني
  return (
    state.staff.find((member) => {
      const mUser = String(member.username || "").trim().toLowerCase();
      const mEmail = String(member.email || member.contactEmail || "").trim().toLowerCase();
      const mPressId = normalizePressId(member.pressId || "");

      const idMatches =
        (idClean && (mUser === idClean || mEmail === idClean)) ||
        (pressIdClean && mPressId === pressIdClean);

      return idMatches && String(member.password || "").trim() === passClean;
    }) || null
  );
}

// التحقق من الـ PIN يعمل حصرياً للحساب المربوط مسبقاً بهذا المتصفح/الجهاز!
function verifyDeviceBoundPinLogin(enteredPinRaw) {
  const pinClean = String(enteredPinRaw || "").trim();
  if (!pinClean) return { error: "يرجى إدخال رمز الدخول السريع (PIN)" };

  const bound = getDeviceBoundAccount();
  if (!bound || !bound.staffId) {
    return {
      error: "هذا الجهاز غير مرتبط بعد. سجل دخولك أولاً بالهوية الصحفية وكلمة المرور."
    };
  }

  if (bound.staffId === "master-admin" || bound.pressId === "HP10001") {
    const masterPin = String(state.settings.masterPin || "0000").trim();
    if (pinClean === masterPin) return { user: { ...MASTER_ACCOUNT_FALLBACK } };
    return { error: "رمز الدخول السريع (PIN) غير صحيح" };
  }

  const targetStaff = state.staff.find(
    (s) => s.id === bound.staffId || normalizePressId(s.pressId) === bound.pressId
  );

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
    handleLogout(false);
    return;
  }

  // ضمان وجود هوية صحفية ثابتة (HP#####) بدون شرطة
  const cleanPid = normalizePressId(userObj.pressId || "");
  if (!cleanPid.startsWith("HP") || cleanPid.length < 6) {
    userObj.pressId = generateUniquePressId(state.staff);
    if (userObj.id && userObj.id !== "master-admin") {
      updateDoc(doc(db, "staff", userObj.id), { pressId: userObj.pressId }).catch(() => {});
    }
  } else {
    userObj.pressId = cleanPid;
  }

  state.currentUser = userObj;

  // حفظ الجلسة النشطة
  localStorage.setItem(
    NR_ACTIVE_SESSION_KEY,
    JSON.stringify({ id: userObj.id, pressId: userObj.pressId })
  );

  // إذا دخل بكلمة المرور، نوثق هذا الجهاز فوراً ليسمح له مستقبلاً بالدخول السريع عبر PIN
  if (cameFromPasswordLogin) {
    bindCurrentAccountToDevice(userObj);
  }

  document.getElementById("nr-auth-gate")?.classList.add("hidden");

  updateHeaderUserBadge();
  loadJournalistNotes();
  populateAllowedCategoriesInStudio();
  evaluateCharterAndSignatureState();
  renderOverviewAndMyArticles();
  populateProfileAndKycView();
}

function handleLogout(showMsg = true) {
  state.currentUser = null;
  localStorage.removeItem(NR_ACTIVE_SESSION_KEY);
  refreshPinTabUiState();
  document.getElementById("nr-auth-gate")?.classList.remove("hidden");
  if (showMsg) showToast("تم تسجيل الخروج من غرفة الأخبار");
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
    welcomeTitle.textContent = `مرحباً بك، ${u.name || "زميلنا الصحفي"}`;
  }
}

// ==================== 6. ميثاق الشرف الصحفي والتوقيع الرقمي الحي (3 توقيعات / تحديث غير معطل) ====================
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
    setupCanvasDimensionsIfNeeded(canvas, ctx);
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

function setupCanvasDimensionsIfNeeded(canvas, ctx) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width > 0 && Math.abs(canvas.width - rect.width) > 12) {
    canvas.width = rect.width;
    canvas.height = rect.height || 165;
  }
  ctx.strokeStyle = "#0c0d0e";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
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
  const sigStatus = user.signatureStatus || "none"; // "none" | "pending" | "approved" | "rejected"
  const wasEverApproved = Boolean(
    user.everApprovedCharter || sigStatus === "approved" || user.isMasterAdmin
  );

  const updateBanner = document.getElementById("charter-update-banner");
  const pendingBanner = document.getElementById("signature-pending-banner");

  // إخفاء الأشرطة افتراضياً
  updateBanner?.classList.add("hidden");
  pendingBanner?.classList.add("hidden");

  if (user.isMasterAdmin) {
    document.getElementById("pledge-overlay")?.classList.add("hidden");
    return;
  }

  // الحالة 1: صحفي جديد لم يوقع بعد، أو تم رفض توقيعه من الإدارة -> نافذة إجبارية (3 توقيعات متطابقة)
  if (sigStatus === "none" || sigStatus === "rejected") {
    openCharterModal("first_time");
    return;
  }

  // الحالة 2: صحفي جديد وقّع 3 مرات وينتظر اعتماد الإدارة الأول
  if (sigStatus === "pending" && !wasEverApproved) {
    document.getElementById("pledge-overlay")?.classList.add("hidden");
    pendingBanner?.classList.remove("hidden");
    return;
  }

  // الحالة 3: صحفي معتمد سابقاً، ولكن الإدارة قامت بتحديث ميثاق الشرف الصحفي
  // يظهر له تنبيه غير معطل للعمل، ويُطلب منه توقيع واحد فقط دون إيقاف قدرته على النشر العاجل
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
  const padWrap = document.querySelector(".nr-signature-pad-wrap");
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

  // إذا كان مطلوباً 3 توقيعات ولم تكتمل بعد
  if (state.pledgeSignatures.length < state.pledgeRequiredCount) {
    clearSignaturePad();
    refreshPledgeSlotsAndButtons();
    showToast(
      `تم حفظ التوقيع (${state.pledgeSignatures.length}/3) — ارسم الآن التوقيع المطابق التالي`
    );
    return;
  }

  const user = state.currentUser;
  if (!user || !user.id) return;

  const charterVersion = Number(state.settings.charterVersion || 1);
  const isUpdate = state.pledgeMode === "update";

  const payload = {
    signatures: state.pledgeSignatures,
    primarySignature: state.pledgeSignatures[0],
    signedCharterVersion: charterVersion,
    signatureStatus: "pending",
    signatureType: isUpdate ? "update" : "first_time",
    everApprovedCharter: Boolean(user.everApprovedCharter || isUpdate),
    signedAt: Date.now()
  };

  try {
    if (user.id !== "master-admin") {
      await updateDoc(doc(db, "staff", user.id), payload);
    }
    state.currentUser = { ...state.currentUser, ...payload };
    document.getElementById("pledge-overlay")?.classList.add("hidden");
    evaluateCharterAndSignatureState();
    populateProfileAndKycView();

    if (isUpdate) {
      showToast("تم إرسال توقيع تحديث الميثاق للمراجعة — يمكنك متابعة النشر كالمعتاد");
    } else {
      showToast("تم إرسال توقيعاتك الثلاثة لاعتماد الإدارة بنجاح");
    }
  } catch (err) {
    console.error(err);
    showToast("تعذر حفظ التوقيع، يرجى التحقق من الاتصال");
  }
}

// ==================== 7. تقييد الأقسام المسموحة لكل صحفي (Category Permissions) ====================
function getAllowedCompassesForCurrentUser() {
  const visibleCompasses = [...state.compasses]
    .filter((c) => c.visible !== false)
    .sort((a, b) => (a.order || 99) - (b.order || 99));

  const user = state.currentUser;
  if (!user || user.isMasterAdmin) return visibleCompasses;

  // فحص الأقسام المحددة للصحفي من لوحة التحكم (allowedCategories أو assignedCategory)
  let allowedRaw = [];
  if (Array.isArray(user.allowedCategories) && user.allowedCategories.length) {
    allowedRaw = user.allowedCategories;
  } else if (user.assignedCategory && String(user.assignedCategory).trim() !== "") {
    allowedRaw = [String(user.assignedCategory).trim()];
  }

  if (
    !allowedRaw.length ||
    allowedRaw.includes("all") ||
    allowedRaw.includes("الكل")
  ) {
    return visibleCompasses;
  }

  const normalizedAllowed = allowedRaw.map((x) => cleanCategoryName(x).toLowerCase());
  const filtered = visibleCompasses.filter(
    (c) =>
      normalizedAllowed.includes(String(c.id || "").toLowerCase()) ||
      normalizedAllowed.includes(cleanCategoryName(c.name).toLowerCase())
  );

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
      welcomeHint.textContent = `الأقسام المخصصة لك للنشر: ${allowedList
        .map((c) => cleanCategoryName(c.name))
        .join(" ، ")}`;
    } else {
      welcomeHint.textContent = "الأقسام المتاحة للنشر: جميع أقسام المنصة المعتمدة";
    }
  }

  if (!catSelect) return;
  const previousValue = catSelect.value;

  // إذا كان للصحفي قسم واحد فقط مخصص له، يتم اختياره إجبارياً وتلقائياً
  if (allowedList.length === 1) {
    const onlyCat = allowedList[0];
    const cleanName = cleanCategoryName(onlyCat.name);
    catSelect.innerHTML = `<option value="${escapeHtml(cleanName)}" selected>${escapeHtml(
      cleanName
    )}</option>`;
    catSelect.value = cleanName;
    restrictedNotice?.classList.remove("hidden");
    if (restrictedText) {
      restrictedText.textContent = `أنت مخول بالنشر المباشر في قسم (${cleanName}) كقسم حصري لحسابك.`;
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
        restrictedText.textContent = `الأقسام الظاهرة أمامك هي الأقسام الممنوحة لصلاحيات حسابك فقط.`;
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

// ==================== 8. استديو النشر بنظام التبويبات المقفلة (Locked Step Tabs) ====================
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

  // تحديث شريط معلومات المقال أعلى المحرر في التبويب الثالث
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
    showToast("يرجى إكمال (العنوان الصحفي والموجز الإخباري) أولاً لفتح المرحلة الثانية");
    document.getElementById("post-title")?.focus();
    return;
  }

  if (step === 3 && !isStudioStep2Complete()) {
    showToast("يرجى اختيار (القسم الرئيسي) في المرحلة الثانية أولاً لفتح غرفة التحرير");
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

function renderMainImagePreview(imgUrl = "") {
  const wrap = document.getElementById("main-image-preview-wrap");
  const imgEl = document.getElementById("main-image-preview-el");
  if (!wrap || !imgEl) return;

  if (!imgUrl) {
    imgEl.src = "";
    wrap.classList.add("hidden");
    return;
  }

  imgEl.src = imgUrl;
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
        state.studioMainImageData ||
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
      textEl.textContent = `محفوظ تلقائياً ${timeStr}`;
    }
  } catch (_) {}
}

function restoreStudioDraftFromLocal() {
  try {
    const raw = localStorage.getItem(NR_STUDIO_AUTOSAVE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved || (!saved.title && !saved.summary && !saved.content)) return;

    state.editingPostId = saved.editingPostId || null;
    state.studioMainImageData = saved.imageUrl || "";

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

function resetStudioCompletely(showConfirm = false) {
  if (
    showConfirm &&
    !confirm("هل تريد تفريغ الحقول الحالية وبدء صياغة مقال جديد؟")
  ) {
    return;
  }

  state.editingPostId = null;
  state.studioMainImageData = "";
  state.studioStep = 1;
  localStorage.removeItem(NR_STUDIO_AUTOSAVE_KEY);

  document.getElementById("nr-article-studio-form")?.reset();
  const editor = document.getElementById("rich-text-editor");
  if (editor) editor.innerHTML = "";

  const heading = document.getElementById("studio-mode-heading");
  if (heading) heading.textContent = "استديو صياغة ونشر الأخبار";

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
  state.studioMainImageData = post.imageUrl || "";

  switchMainView("view-studio");
  populateAllowedCategoriesInStudio();

  const heading = document.getElementById("studio-mode-heading");
  if (heading) heading.textContent = `تعديل المادة الصحفية: ${post.title}`;

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

async function submitArticleFromStudio(asDraft = false) {
  const user = state.currentUser;
  if (!user) return;

  // فحص اعتماد الميثاق قبل النشر الفعلي للصحفي الجديد
  const sigStatus = user.signatureStatus || "none";
  const wasEverApproved = Boolean(
    user.everApprovedCharter || sigStatus === "approved" || user.isMasterAdmin
  );

  if (!asDraft && !wasEverApproved) {
    showToast(
      "توقيعك على ميثاق الشرف قيد مراجعة الإدارة. يمكنك حفظ المقال كمسودة الآن ريثما يُعتمد حسابك."
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

  if (!title) {
    switchStudioTab(1);
    showToast("يرجى كتابة العنوان الرئيسي للخبر");
    return;
  }

  if (!asDraft && !summary) {
    switchStudioTab(1);
    showToast("يرجى كتابة الموجز الإخباري للخبر");
    return;
  }

  // التحقق من أن القسم المختار ضمن الأقسام المسموحة للصحفي
  const allowedCompasses = getAllowedCompassesForCurrentUser();
  const finalCategory =
    category || cleanCategoryName(allowedCompasses[0]?.name || "السياسة اليمنية");

  if (!asDraft && !stripHtml(editorHtml) && !summary) {
    switchStudioTab(3);
    showToast("يرجى كتابة محتوى الخبر في غرفة التحرير قبل النشر");
    return;
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
    state.studioMainImageData ||
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

  const publishBtn = document.getElementById("submit-article-publish-btn");
  if (publishBtn) publishBtn.disabled = true;

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
    }

    resetStudioCompletely(false);
    switchMainView("view-overview");

    if (targetStatus === "draft") {
      showToast("تم حفظ المادة الصحفية في المسودات المؤقتة بنجاح");
    } else if (targetStatus === "pending") {
      showToast("تم إرسال المادة الصحفية إلى الإدارة للاعتماد والنشر");
    } else {
      showToast("تم نشر الخبر مباشرة على الموقع العام بنجاح");
    }
  } catch (err) {
    console.error(err);
    showToast("حدث خطأ أثناء إرسال الخبر، يرجى المحاولة مرة أخرى");
  } finally {
    if (publishBtn) publishBtn.disabled = false;
  }
}

// ==================== 9. دفتر الملاحظات الذكي + التحويل الفوري إلى منشور في الاستديو ====================
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

    // دمج الملاحظات السحابية والمحلية دون تكرار
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
    if (user && user.id && user.id !== "master-admin") {
      await updateDoc(doc(db, "staff", user.id), { notes: state.notes });
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

// الميزة الذكية: تحويل أي ملاحظة مباشرة إلى مشروع مقال في استديو النشر
function convertNoteToStudioArticle(noteTitleRaw, noteBodyRaw, noteIdToDelete = "") {
  const cleanTitle = String(noteTitleRaw || "").trim();
  const cleanBody = String(noteBodyRaw || "").trim();

  if (!cleanTitle && !cleanBody) {
    showToast("اكتب فكرة أو ملاحظة أولاً لتحويلها إلى منشور");
    return;
  }

  const derivedTitle = (cleanTitle || cleanBody.split("\n")[0] || "").slice(0, 110);
  // توليد موجز ذكي تلقائي من أول 220 حرفاً لفتح المرحلة الثانية فوراً للصحفي
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
  state.studioMainImageData = "";

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

  // إذا كان القسم محدداً تلقائياً، يمكنه الانتقال مباشرة؛ ونضعه في التبويب الأول الجاهز أو الثاني
  switchStudioTab(1);

  if (noteIdToDelete) {
    // نحتفظ بالملاحظة في الدفتر للأمان، لكن نعلم الصحفي بنجاح التحويل
  }

  showToast("تم تحويل الملاحظة وتعبئة حقول الاستديو تلقائياً — راجع العنوان واختر القسم للنشر");
}

function renderSavedNotesList() {
  const countBadge = document.getElementById("nav-notes-count");
  if (countBadge) {
    countBadge.textContent = String(state.notes.length);
    countBadge.classList.toggle("hidden", state.notes.length === 0);
  }

  const grid = document.getElementById("saved-notes-grid");
  if (!grid) return;

  if (!state.notes.length) {
    grid.innerHTML = `
      <div class="nr-empty-box">
        <span class="material-symbols-rounded" translate="no">sticky_note_2</span>
        <p>دفتر ملاحظاتك فارغ حالياً. دوّن أفكارك ومسوداتك السريعة هنا.</p>
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
        <div class="nr-note-card-footer">
          <small style="color:var(--text-muted);font-weight:700;">${formatArabicDate(
            n.updatedAt || n.createdAt
          )}</small>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button type="button" class="nr-btn nr-btn-primary nr-btn-sm" data-convert-note="${escapeHtml(
              n.id
            )}">
              <span class="material-symbols-rounded" style="font-size:16px;" translate="no">transform</span>
              <span>تحويل إلى منشور</span>
            </button>
            <button type="button" class="nr-btn nr-btn-secondary nr-btn-sm" data-edit-note="${escapeHtml(
              n.id
            )}">
              <span class="material-symbols-rounded" style="font-size:16px;" translate="no">edit</span>
              <span>تعديل</span>
            </button>
            <button type="button" class="nr-btn nr-btn-ghost nr-btn-sm" style="color:var(--danger-red);" data-delete-note="${escapeHtml(
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
      if (note) convertNoteToStudioArticle(note.title, note.body, note.id);
    });
  });

  grid.querySelectorAll("[data-edit-note]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const note = state.notes.find((x) => x.id === btn.getAttribute("data-edit-note"));
      if (!note) return;
      document.getElementById("editing-note-id").value = note.id;
      document.getElementById("note-title-input").value = note.title || "";
      document.getElementById("note-body-input").value = note.body || "";
      const heading = document.getElementById("note-editor-heading");
      if (heading) heading.textContent = "تعديل الملاحظة المحفوظة";
      document.getElementById("note-title-input")?.focus();
    });
  });

  grid.querySelectorAll("[data-delete-note]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-delete-note");
      state.notes = state.notes.filter((x) => x.id !== id);
      persistJournalistNotes();
      renderSavedNotesList();
      showToast("تم حذف الملاحظة");
    });
  });
}

// ==================== 10. عرض إحصائيات الصحفي ومواده في غرفة الأخبار ====================
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
    return `<span class="nr-status-badge st-published"><span class="material-symbols-rounded" style="font-size:15px;" translate="no">check_circle</span>منشور ومفعل</span>`;
  }
  if (st === "pending") {
    return `<span class="nr-status-badge st-pending"><span class="material-symbols-rounded" style="font-size:15px;" translate="no">schedule</span>بانتظار الاعتماد</span>`;
  }
  if (st === "rejected") {
    return `<span class="nr-status-badge st-rejected"><span class="material-symbols-rounded" style="font-size:15px;" translate="no">error</span>معاد للمراجعة</span>`;
  }
  return `<span class="nr-status-badge st-draft"><span class="material-symbols-rounded" style="font-size:15px;" translate="no">edit_note</span>مسودة مؤقتة</span>`;
}

function renderOverviewAndMyArticles() {
  const myPosts = getJournalistOwnPosts();

  const publishedCount = myPosts.filter((p) => !p.status || p.status === "published").length;
  const pendingCount = myPosts.filter((p) => p.status === "pending").length;
  const draftsCount = myPosts.filter((p) => p.status === "draft" || p.status === "rejected").length;
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

  if (state.myPostsSearchQuery) {
    const q = state.myPostsSearchQuery.toLowerCase();
    filtered = filtered.filter((p) =>
      `${p.title || ""} ${p.summary || ""} ${p.category || ""}`.toLowerCase().includes(q)
    );
  }

  if (!filtered.length) {
    listEl.innerHTML = `
      <div class="nr-empty-box">
        <span class="material-symbols-rounded" translate="no">article</span>
        <p>لا توجد مواد صحفية في هذا التصنيف حالياً.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered
    .slice(0, 35)
    .map((post) => {
      const cat = cleanCategoryName(
        (Array.isArray(post.categories) && post.categories[0]) || post.category || "عام"
      );
      const views = Number(post.views || 0).toLocaleString("en-US");

      return `
        <article class="nr-article-item">
          <div style="flex:1;min-width:220px;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px;">
              ${getStatusBadgeMarkup(post.status)}
              <span style="font-size:0.75rem;font-weight:800;color:var(--brand-primary);background:var(--brand-soft);padding:2px 8px;border-radius:5px;">
                ${escapeHtml(cat)}
              </span>
              <span style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">
                ${formatArabicDate(post)} • ${views} قراءة
              </span>
            </div>
            <h3 style="font-size:0.98rem;font-weight:900;color:var(--text-main);">
              ${escapeHtml(post.title || "بدون عنوان")}
            </h3>
          </div>

          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <button type="button" class="nr-btn nr-btn-secondary nr-btn-sm" data-edit-article="${escapeHtml(
              post.id
            )}">
              <span class="material-symbols-rounded" style="font-size:17px;" translate="no">edit</span>
              <span>تعديل</span>
            </button>
            ${
              post.status === "draft" || post.status === "pending"
                ? `<button type="button" class="nr-btn nr-btn-ghost nr-btn-sm" style="color:var(--danger-red);" data-delete-article="${escapeHtml(
                    post.id
                  )}" title="حذف المسودة">
                    <span class="material-symbols-rounded" style="font-size:17px;" translate="no">delete</span>
                  </button>`
                : ""
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

  listEl.querySelectorAll("[data-delete-article]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delete-article");
      if (!id || !confirm("هل أنت متأكد من حذف هذه المسودة؟")) return;
      try {
        await deleteDoc(doc(db, "posts", id));
        showToast("تم حذف المسودة بنجاح");
      } catch (_) {
        showToast("تعذر حذف المسودة");
      }
    });
  });
}

// ==================== 11. الملف الشخصي، الهوية الصحفية (HP)، العمر التلقائي البارز، والتوثيق (KYC) ====================
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

  // حالة ميثاق الشرف والتوثيق
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

  // تعبئة نموذج بيانات الدخول الشخصية
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };

  setVal("my-account-username", u.username || "");
  setVal("my-account-password", u.password || "");
  setVal("my-account-pin", u.pinCode || u.pin || "");
  setVal("my-account-bio", u.bio || "");

  // تعبئة نموذج التوثيق (KYC)
  setVal("kyc-contact-email", u.contactEmail || u.email || "");
  setVal("kyc-whatsapp-number", u.whatsapp || "");
  setVal("kyc-legal-name", u.legalName || u.name || "");
  setVal("kyc-doc-type", u.docType || "id_card");
  setVal("kyc-doc-number", u.docNumber || "");
  setVal("kyc-issue-date", u.docIssueDate || "");
  setVal("kyc-dob", u.dob || "");

  state.kycFrontData = u.docFrontImg || "";
  state.kycBackData = u.docBackImg || "";
  state.kycSelfieData = u.selfieImg || "";

  renderKycThumbPreview("kyc-front-preview", state.kycFrontData);
  renderKycThumbPreview("kyc-back-preview", state.kycBackData);
  renderKycThumbPreview("kyc-selfie-preview", state.kycSelfieData);

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
    if (prominentAgeEl) prominentAgeEl.textContent = `${age} سنة (تحديث آلي من تاريخ الميلاد)`;
    if (liveKycAgeEl) liveKycAgeEl.textContent = `${age} سنة — مطابق لتاريخ الميلاد المدخل`;
  } else {
    if (prominentAgeEl) prominentAgeEl.textContent = "يُحسب تلقائياً عند إدخال تاريخ الميلاد";
    if (liveKycAgeEl) liveKycAgeEl.textContent = "أدخل تاريخ الميلاد ليظهر العمر تلقائياً";
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

function renderKycThumbPreview(containerId, dataUrl) {
  const box = document.getElementById(containerId);
  if (!box) return;
  if (!dataUrl) {
    box.innerHTML = "";
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  box.innerHTML = `<img src="${dataUrl}" alt="معاينة المرفق">`;
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

  // التأكد من عدم تكرار اسم المستخدم مع صحفي آخر
  const duplicate = state.staff.find(
    (s) =>
      s.id !== user.id &&
      String(s.username || "").trim().toLowerCase() === username.toLowerCase()
  );
  if (duplicate) {
    showToast("اسم المستخدم هذا مستخدم بالفعل، اختر اسماً آخر");
    return;
  }

  const updatePayload = {
    username,
    password,
    pinCode,
    bio,
    updatedAt: Date.now()
  };

  try {
    if (user.id !== "master-admin") {
      await updateDoc(doc(db, "staff", user.id), updatePayload);
    }
    state.currentUser = { ...state.currentUser, ...updatePayload };
    bindCurrentAccountToDevice(state.currentUser);
    showToast("تم حفظ بيانات الدخول وتفعيل الرمز السريع (PIN) على جهازك هذا بنجاح");
  } catch (err) {
    console.error(err);
    showToast("تعذر حفظ بيانات الدخول");
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

  if (!state.kycFrontData || !state.kycSelfieData) {
    showToast("يرجى إرفاق صورة الوثيقة الرسمية وصورة السيلفي الواضحة للتحقق");
    return;
  }

  if (docType === "id_card" && !state.kycBackData) {
    showToast("يرجى إرفاق صورة ظهر البطاقة الشخصية");
    return;
  }

  const calculatedAge = calculateAutoAge(dob);
  const submitBtn = document.getElementById("submit-kyc-btn");
  if (submitBtn) submitBtn.disabled = true;

  const kycPayload = {
    contactEmail,
    email: contactEmail || user.email || "",
    whatsapp,
    legalName,
    docType,
    docNumber,
    docIssueDate,
    dob,
    calculatedAge,
    docFrontImg: state.kycFrontData,
    docBackImg: docType === "passport" ? "" : state.kycBackData,
    selfieImg: state.kycSelfieData,
    kycStatus: "pending",
    kycSubmittedAt: Date.now()
  };

  try {
    if (user.id !== "master-admin") {
      await updateDoc(doc(db, "staff", user.id), kycPayload);
    }
    state.currentUser = { ...state.currentUser, ...kycPayload };
    populateProfileAndKycView();
    showToast("تم حفظ بيانات الهوية الرسمية وإرسال طلب التوثيق والشارة الزرقاء للإدارة");
  } catch (err) {
    console.error(err);
    showToast("حدث خطأ أثناء رفع الوثائق");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ==================== 12. إدارة التنقل بين الواجهات وربط جميع الأحداث ====================
function switchMainView(viewId) {
  state.activeView = viewId;

  ["view-overview", "view-studio", "view-notes", "view-profile"].forEach((id) => {
    document.getElementById(id)?.classList.toggle("hidden", id !== viewId);
  });

  document.querySelectorAll("#nr-main-nav .nr-nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-view") === viewId);
  });

  if (viewId === "view-overview") {
    renderOverviewAndMyArticles();
  } else if (viewId === "view-studio") {
    populateAllowedCategoriesInStudio();
    updateStudioProgressionLocks();
  } else if (viewId === "view-notes") {
    renderSavedNotesList();
  } else if (viewId === "view-profile") {
    populateProfileAndKycView();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindAllEvents() {
  // 1. تبويبات بوابة تسجيل الدخول
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
    if (!inp) return;
    inp.type = inp.type === "password" ? "text" : "password";
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

  // 2. التنقل الرئيسي والهيدر
  document.querySelectorAll("#nr-main-nav .nr-nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchMainView(btn.getAttribute("data-view") || "view-overview");
    });
  });

  document.getElementById("header-user-pill")?.addEventListener("click", () => {
    switchMainView("view-profile");
  });

  document.getElementById("header-logout-btn")?.addEventListener("click", () => {
    handleLogout(true);
  });

  // 3. أحداث ميثاق الشرف والتوقيع
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

  // 4. أحداث اللوحة الرئيسية والمفكرة السريعة
  document.getElementById("quick-start-article-btn")?.addEventListener("click", () => {
    switchMainView("view-studio");
  });

  document.getElementById("quick-start-note-btn")?.addEventListener("click", () => {
    document.getElementById("quick-note-title")?.focus();
  });

  document.getElementById("open-full-notes-view-btn")?.addEventListener("click", () => {
    switchMainView("view-notes");
  });

  document.querySelectorAll("#my-posts-status-filters .nr-filter-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      state.myPostsStatusFilter = pill.getAttribute("data-status-filter") || "all";
      document
        .querySelectorAll("#my-posts-status-filters .nr-filter-pill")
        .forEach((p) => p.classList.toggle("active", p === pill));
      renderOverviewAndMyArticles();
    });
  });

  document.getElementById("my-posts-search-input")?.addEventListener("input", (e) => {
    state.myPostsSearchQuery = (e.target.value || "").trim();
    renderOverviewAndMyArticles();
  });

  document.getElementById("save-quick-note-btn")?.addEventListener("click", () => {
    const t = document.getElementById("quick-note-title")?.value || "";
    const b = document.getElementById("quick-note-body")?.value || "";
    const saved = saveNoteEntry(t, b);
    if (saved) {
      document.getElementById("quick-note-title").value = "";
      document.getElementById("quick-note-body").value = "";
      showToast("تم حفظ الفكرة في دفتر ملاحظاتك");
    }
  });

  document.getElementById("convert-quick-note-to-post-btn")?.addEventListener("click", () => {
    const t = document.getElementById("quick-note-title")?.value || "";
    const b = document.getElementById("quick-note-body")?.value || "";
    if (!t.trim() && !b.trim()) {
      showToast("اكتب عنواناً أو فكرة في المفكرة السريعة أولاً لتحويلها إلى منشور");
      return;
    }
    saveNoteEntry(t, b);
    document.getElementById("quick-note-title").value = "";
    document.getElementById("quick-note-body").value = "";
    convertNoteToStudioArticle(t, b);
  });

  // 5. أحداث استديو النشر المرحلي المقفل (Locked Step Tabs)
  document.querySelectorAll(".nr-studio-tab[data-studio-tab]").forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => {
      const targetStep = Number(tabBtn.getAttribute("data-studio-tab") || 1);
      switchStudioTab(targetStep);
    });
  });

  document.getElementById("to-step-2-btn")?.addEventListener("click", () => switchStudioTab(2));
  document.getElementById("back-to-step-1-btn")?.addEventListener("click", () => switchStudioTab(1));
  document.getElementById("to-step-3-btn")?.addEventListener("click", () => switchStudioTab(3));
  document.getElementById("back-to-step-2-btn")?.addEventListener("click", () => switchStudioTab(2));

  document.getElementById("studio-reset-new-btn")?.addEventListener("click", () => {
    resetStudioCompletely(true);
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
    document.getElementById(id)?.addEventListener("change", () => {
      saveStudioDraftToLocal();
    });
  });

  // الصورة البارزة (رفع ملف أو رابط)
  document.getElementById("post-main-image-file")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast("جاري ضغط وتجهيز الصورة البارزة...");
      const webpData = await compressImageToWebp(file, 1150, 0.8);
      state.studioMainImageData = webpData;
      renderMainImagePreview(webpData);
      saveStudioDraftToLocal();
      showToast("تم تجهيز الصورة البارزة بنجاح");
    } catch (_) {
      showToast("تعذر معالجة ملف الصورة");
    }
  });

  document.getElementById("post-main-image-url")?.addEventListener("input", (e) => {
    const url = (e.target.value || "").trim();
    state.studioMainImageData = "";
    renderMainImagePreview(url);
    saveStudioDraftToLocal();
  });

  document.getElementById("clear-main-image-btn")?.addEventListener("click", () => {
    state.studioMainImageData = "";
    const fInp = document.getElementById("post-main-image-file");
    const uInp = document.getElementById("post-main-image-url");
    if (fInp) fInp.value = "";
    if (uInp) uInp.value = "";
    renderMainImagePreview("");
    saveStudioDraftToLocal();
  });

  // الوسوم المقترحة الذكية
  document.querySelectorAll("#suggested-tags-bar .nr-tag-suggestion").forEach((btn) => {
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
        showToast("الحد الأقصى المسموح به هو 3 وسوم لكل خبر");
        return;
      }
      existing.push(tagToAdd);
      tagInput.value = existing.join(" ");
      saveStudioDraftToLocal();
    });
  });

  // شريط أدوات محرر المقال الواسع
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
    try {
      showToast("جاري ضغط وإدراج الصورة بين الفقرات...");
      const webpData = await compressImageToWebp(file, 1000, 0.78);
      const caption = prompt("أدخل وصفاً توضيحياً يظهر أسفل الصورة (اختياري):") || "";
      const figureHtml = `
        <figure class="inline-article-figure">
          <img src="${webpData}" alt="${escapeHtml(caption)}">
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
    } catch (_) {
      showToast("تعذر إدراج الصورة");
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

  // 6. أحداث صفحة دفتر الملاحظات الذكي
  document.getElementById("clear-note-form-btn")?.addEventListener("click", () => {
    document.getElementById("editing-note-id").value = "";
    document.getElementById("nr-note-form")?.reset();
    const heading = document.getElementById("note-editor-heading");
    if (heading) heading.textContent = "تدوين ملاحظة أو مسودة فكرة";
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
      const heading = document.getElementById("note-editor-heading");
      if (heading) heading.textContent = "تدوين ملاحظة أو مسودة فكرة";
      showToast("تم حفظ الملاحظة في دفترك الشخصي");
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

  // 7. أحداث الملف الشخصي، الهوية الصحفية (HP)، والعمر التلقائي
  document.getElementById("copy-press-id-btn")?.addEventListener("click", async () => {
    const pid = document.getElementById("profile-card-press-id")?.textContent || "";
    if (!pid) return;
    try {
      await navigator.clipboard.writeText(pid.trim());
      showToast(`تم نسخ رقم الهوية الصحفية: ${pid}`);
    } catch (_) {}
  });

  document.getElementById("profile-avatar-file")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    const user = state.currentUser;
    if (!file || !user || !user.id) return;
    try {
      showToast("جاري تحديث صورتك الشخصية...");
      const webpAvatar = await compressImageToWebp(file, 500, 0.82);
      if (user.id !== "master-admin") {
        await updateDoc(doc(db, "staff", user.id), { avatar: webpAvatar });
      }
      state.currentUser.avatar = webpAvatar;
      bindCurrentAccountToDevice(state.currentUser);
      updateHeaderUserBadge();
      populateProfileAndKycView();
      showToast("تم تحديث الصورة الشخصية بنجاح");
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

  // رفع مرفقات التوثيق الثلاثة
  const bindKycFileUpload = (inputId, stateKey, previewId) => {
    document.getElementById(inputId)?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        showToast("جاري ضغط وتجهيز صورة الوثيقة...");
        const compressed = await compressImageToWebp(file, 950, 0.78);
        state[stateKey] = compressed;
        renderKycThumbPreview(previewId, compressed);
        showToast("تم إرفاق الصورة بنجاح");
      } catch (_) {
        showToast("تعذر قراءة ملف الصورة");
      }
    });
  };

  bindKycFileUpload("kyc-front-file", "kycFrontData", "kyc-front-preview");
  bindKycFileUpload("kyc-back-file", "kycBackData", "kyc-back-preview");
  bindKycFileUpload("kyc-selfie-file", "kycSelfieData", "kyc-selfie-preview");

  document.getElementById("nr-kyc-form")?.addEventListener("submit", handleSubmitKycForm);
}

// ==================== 13. استعادة الجلسة والمزامنة الفورية مع Firestore ====================
function tryRestoreActiveSession() {
  try {
    const raw = localStorage.getItem(NR_ACTIVE_SESSION_KEY);
    if (!raw) {
      document.getElementById("nr-auth-gate")?.classList.remove("hidden");
      return;
    }
    const saved = JSON.parse(raw);
    if (saved?.id === "master-admin" || saved?.pressId === "HP10001") {
      activateJournalistSession({ ...MASTER_ACCOUNT_FALLBACK }, false);
      return;
    }

    const found = state.staff.find(
      (s) =>
        s.id === saved?.id ||
        (saved?.pressId && normalizePressId(s.pressId) === normalizePressId(saved.pressId))
    );

    if (found) {
      activateJournalistSession(found, false);
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

    if (state.currentUser && state.currentUser.id !== "master-admin") {
      const freshMe = state.staff.find((s) => s.id === state.currentUser.id);
      if (freshMe) {
        if (freshMe.accountStatus === "frozen" || freshMe.suspended === true) {
          handleLogout(false);
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
    } else if (!state.currentUser) {
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

// ==================== 14. نقطة الانطلاق الفورية (0ms Instant Boot) ====================
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
