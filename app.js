/* ==========================================================================
   البوابة التحريرية الذكية — حُجرية بريس (Hujariya Press Editorial Portal)
   المحرك البرمجي الشامل والمُحسّن بالكامل (app.js):
   - فحص متزامن فوري للجلسة (Zero-Flicker Auth) يمنع ظهور شاشة الدخول العادية بالخطأ
   - شريط تنقل سفلي عائم (Bottom Dock) + بوابة موحدة لحسابي والإعدادات والكادر
   - أداة إدراج صور متعددة بين فقرات المقال (Inline Multi-Image Uploader) مع وصف توضيحي
   - كبسولة بحث ذكي فوري بالمنشورات والمسودات مع عداد نتائج حي
   - حفظ تلقائي بالذاكرة المؤقتة (Auto-Save) + عدادات العنوان (110) والملخص (220)
   - اقتراح تلقائي للهاشتاجات المحفوظة بحد أقصى 3 وسوم + شفافية الشعار المفرغ + إحصائيات الإعلانات
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
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

// مفاتيح التخزين المحلي والجلسات
const SESSION_STORAGE_KEY = "hujariya_portal_session_v2";
const CACHED_USER_STORAGE_KEY = "hujariya_portal_user_cache_v2";
const TRUSTED_DEVICE_KEY = "hujariya_trusted_device_v2";
const AUTOSAVE_DRAFT_PREFIX = "hujariya_autosave_draft_";
const DEFAULT_IMGBB_FALLBACK_KEY = "6d207e02198a847aa98d0a2a901485a5";

const MAX_TITLE_CHARS = 110;
const MAX_SUMMARY_CHARS = 220;
const MAX_POST_TAGS = 3;
const DEFAULT_CRIMSON_COLOR = "#b80d38";

// بيانات الأدمن الرئيسي السيادي
const MASTER_ADMIN_SEED = {
  id: "master_chief_hujariya",
  name: "رئيس التحرير — حُجرية بريس",
  username: "hujariya_admin",
  password: "Hujariya#2026@Master",
  pinCode: "2026",
  jobTitle: "المدير العام ورئيس التحرير",
  role: "admin",
  isMasterAdmin: true,
  verified: true,
  suspended: false,
  requireReview: false,
  permissions: {
    canEditOwn: true,
    canDeleteOwn: true,
    managePosts: true,
    manageStaff: true,
    manageSettings: true
  }
};

// الأقسام الافتراضية المطابقة للموقع العام
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

const DEFAULT_CORE_TAGS = [
  "اليمن",
  "السعودية",
  "حجرية_بريس",
  "تعز",
  "عدن",
  "الرياض",
  "عاجل",
  "اقتصاد",
  "الشرعية_اليمنية",
  "رؤية_السعودية_2030",
  "البحر_الأحمر",
  "الرياضة",
  "تقنية"
];

// ==================== 2. حالة البوابة التحريرية (State) ====================
const state = {
  currentUser: null,
  pinBuffer: "",
  activeTab: "posts",
  postFilter: "all",
  postSearchQuery: "",
  selectedEditorCategories: ["السياسة اليمنية"],
  selectedEditorTags: [],
  savedSelectionRange: null,
  settings: {
    siteName: "حُجرية بريس",
    siteDescription: "حُجرية بريس — منصة إخبارية وتحليلية شاملة تندرج تحت مظلة مؤسسة RAWI-YE.COM الإعلامية الرقمية.",
    accentColor: DEFAULT_CRIMSON_COLOR,
    logoUrl: "",
    hideSiteName: false,
    defaultPostImageUrl: "",
    coverImageUrl: "",
    faviconUrl: "",
    appIconUrl: "",
    imgbbApiKey: "",
    aboutHtml: "",
    charterHtml: "",
    privacyHtml: "",
    socials: {}
  },
  compasses: [...DEFAULT_COMPASSES],
  posts: [],
  staff: [],
  notes: [],
  staffRequests: [],
  ads: []
};

// ==================== 3. الدوال المساعدة ومعالجة الصور المفرغة الشفافة ====================
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getCleanCategoryLabel(name = "") {
  return (
    String(name)
      .replace(/^بوصلة\s+/i, "")
      .replace(/^البوصلة\s+/i, "")
      .trim() || name
  );
}

function resolveEffectiveCrimsonColor(savedColor = "") {
  const clean = String(savedColor || "").trim().toLowerCase();
  if (!clean || clean === "#ef3327") {
    return DEFAULT_CRIMSON_COLOR;
  }
  return savedColor;
}

function showPortalToast(msg) {
  const toast = document.getElementById("portal-toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(window.__portalToastTimer);
  window.__portalToastTimer = setTimeout(() => toast.classList.add("hidden"), 3400);
}

function setButtonLoading(btn, isLoading, loadingText = "جاري التنفيذ...") {
  if (!btn) return;
  const textSpan = btn.querySelector(".btn-text") || btn;
  if (isLoading) {
    if (!btn.dataset.originalText) {
      btn.dataset.originalText = textSpan.textContent;
    }
    btn.disabled = true;
    btn.classList.add("is-loading");
    textSpan.textContent = loadingText;
  } else {
    btn.disabled = false;
    btn.classList.remove("is-loading");
    if (btn.dataset.originalText) {
      textSpan.textContent = btn.dataset.originalText;
    }
  }
}

function getItemTimestampMs(item) {
  if (!item) return 0;
  const t = item.createdAt || item.updatedAt;
  if (!t) return 0;
  if (typeof t.toMillis === "function") return t.toMillis();
  if (typeof t.seconds === "number") return t.seconds * 1000;
  const parsed = new Date(t).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

function formatArabicDateTime(timestamp) {
  const ms = typeof timestamp === "number" ? timestamp : getItemTimestampMs({ createdAt: timestamp });
  if (!ms) return "الآن";
  return new Date(ms).toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// محرك رفع وضغط الصور: يحافظ 100% على شفافية الشعار المفرغ (PNG / WebP / SVG)
async function uploadImageFileToCloud(file, preserveTransparency = false) {
  if (!file) throw new Error("لم يتم اختيار ملف صورة");

  const mime = String(file.type || "").toLowerCase();
  const isTransparentFormat =
    preserveTransparency ||
    mime.includes("png") ||
    mime.includes("webp") ||
    mime.includes("svg") ||
    mime.includes("gif");

  const apiKey = (state.settings.imgbbApiKey || DEFAULT_IMGBB_FALLBACK_KEY).trim();

  if (apiKey) {
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        body: formData
      });
      if (response.ok) {
        const result = await response.json();
        const uploadedUrl =
          result?.data?.image?.url ||
          result?.data?.url ||
          result?.data?.display_url;
        if (uploadedUrl) return uploadedUrl;
      }
    } catch (err) {
      console.warn("ImgBB upload fallback notice:", err);
    }
  }

  return await compressImagePreservingAlpha(file, isTransparentFormat ? 900 : 960, isTransparentFormat);
}

function compressImagePreservingAlpha(file, maxWidth = 960, keepAlpha = false) {
  return new Promise((resolve, reject) => {
    const mime = String(file.type || "").toLowerCase();
    const reader = new FileReader();

    reader.onload = (e) => {
      if (mime.includes("svg")) {
        resolve(e.target.result);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (keepAlpha || mime.includes("png") || mime.includes("webp")) {
          resolve(canvas.toDataURL("image/png"));
        } else {
          resolve(canvas.toDataURL("image/jpeg", 0.84));
        }
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function bindImageFileUploader(
  fileInputId,
  urlInputId,
  previewBoxId = null,
  previewImgId = null,
  preserveTransparency = false,
  onUploadedCallback = null
) {
  const fileInput = document.getElementById(fileInputId);
  const urlInput = document.getElementById(urlInputId);
  if (!fileInput || !urlInput) return;

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    const labelSpan = fileInput.parentElement?.querySelector("span:not(.material-symbols-rounded)");
    const origText = labelSpan ? labelSpan.textContent : "رفع";
    if (labelSpan) labelSpan.textContent = "جاري الرفع...";

    try {
      const url = await uploadImageFileToCloud(file, preserveTransparency);
      urlInput.value = url;
      showPortalToast("تم رفع الصورة بنجاح ✓");

      if (previewBoxId && previewImgId) {
        const box = document.getElementById(previewBoxId);
        const img = document.getElementById(previewImgId);
        if (box && img) {
          img.src = url;
          box.classList.remove("hidden");
        }
      }
      if (typeof onUploadedCallback === "function") {
        onUploadedCallback(url);
      }
    } catch (_) {
      showPortalToast("تعذر رفع الصورة، حاول مرة أخرى");
    } finally {
      if (labelSpan) labelSpan.textContent = origText;
      fileInput.value = "";
    }
  });
}

// ==================== 4. الصلاحيات الدقيقة وعزل البيانات ====================
function isMasterAdminUser(user = state.currentUser) {
  if (!user) return false;
  return Boolean(
    user.isMasterAdmin ||
      user.id === MASTER_ADMIN_SEED.id ||
      String(user.username || "").toLowerCase() === MASTER_ADMIN_SEED.username
  );
}

function canManageAllPosts(user = state.currentUser) {
  if (!user) return false;
  if (isMasterAdminUser(user) || user.role === "admin") return true;
  return Boolean(user.permissions?.managePosts);
}

function canManageStaffAndReviews(user = state.currentUser) {
  if (!user) return false;
  if (isMasterAdminUser(user) || user.role === "admin") return true;
  return Boolean(user.permissions?.manageStaff || user.permissions?.managePosts);
}

function canManageSovereignSettings(user = state.currentUser) {
  if (!user) return false;
  return Boolean(
    isMasterAdminUser(user) || user.role === "admin" || user.permissions?.manageSettings
  );
}

function doesPostBelongToUser(post, user = state.currentUser) {
  if (!post || !user) return false;
  const uId = String(user.id || "").toLowerCase();
  const uName = String(user.username || "").toLowerCase();
  const displayName = String(user.name || "").trim().toLowerCase();

  if (uId && String(post.authorId || "").toLowerCase() === uId) return true;
  if (
    uName &&
    String(post.authorUsername || post.authorEmail || "").toLowerCase() === uName
  )
    return true;
  if (displayName && String(post.author || "").trim().toLowerCase() === displayName)
    return true;
  return false;
}

function getScopedPostsForCurrentUser() {
  if (!state.currentUser) return [];
  if (canManageAllPosts(state.currentUser)) {
    return state.posts;
  }
  return state.posts.filter((p) => doesPostBelongToUser(p, state.currentUser));
}

// ==================== 5. نظام التحقق اللحظي من الجلسة ورمز PIN (بدون أي وميض أو تأخير) ====================
async function ensureMasterAdminSeeded() {
  try {
    const masterRef = doc(db, "staff", MASTER_ADMIN_SEED.id);
    const snap = await getDoc(masterRef);
    if (!snap.exists()) {
      await setDoc(masterRef, {
        ...MASTER_ADMIN_SEED,
        createdAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.warn("Master admin seed check notice:", err);
  }
}

function setAuthGateSubView(mode) {
  // mode: 'loader' | 'pin' | 'login'
  const loaderEl = document.getElementById("auth-session-loader");
  const pinEl = document.getElementById("pin-unlock-panel");
  const loginEl = document.getElementById("standard-login-form");

  loaderEl?.classList.toggle("hidden", mode !== "loader");
  pinEl?.classList.toggle("hidden", mode !== "pin");
  loginEl?.classList.toggle("hidden", mode !== "login");
}

// فحص متزامن فوري (0ms) عند فتح الصفحة يمنع ظهور نموذج تسجيل الدخول لمن لديه جلسة أو جهاز موثوق
function bootstrapInstantAuthStateOnLoad() {
  // 1. إذا كانت الجلسة نشطة ومفتوحة، ندخل فوراً للغرفة الذكية دون انتظار الشبكة
  try {
    const activeSessionRaw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const cachedUserRaw = localStorage.getItem(CACHED_USER_STORAGE_KEY);

    if (activeSessionRaw && cachedUserRaw) {
      const sessionData = JSON.parse(activeSessionRaw);
      const cachedUser = JSON.parse(cachedUserRaw);
      if (
        cachedUser &&
        (cachedUser.id === sessionData.userId || cachedUser.username === sessionData.username) &&
        (!cachedUser.suspended || isMasterAdminUser(cachedUser))
      ) {
        completePortalLogin(cachedUser, false, true);
        return true;
      }
    }
  } catch (_) {}

  // 2. إذا كان الجهاز موثوقاً برمز PIN، نظهر لوحة الـ PIN فوراً في اللحظة الأولى دون أي وميض لنموذج الدخول
  try {
    const trustedRaw = localStorage.getItem(TRUSTED_DEVICE_KEY);
    if (trustedRaw) {
      const trusted = JSON.parse(trustedRaw);
      if (trusted && trusted.username) {
        showPinUnlockScreen(trusted);
        return true;
      }
    }
  } catch (_) {}

  // 3. غير ذلك: تبقى شاشة "جاري التحقق من الجلسة النشطة..." لبضع أجزاء من الثانية حتى يصل أول Snapshot من السحابة
  setAuthGateSubView("loader");
  return false;
}

function findMatchingStaffAccount(usernameInput, passwordInput = null) {
  const cleanUser = String(usernameInput || "").trim().toLowerCase();
  if (!cleanUser) return null;

  let member = state.staff.find(
    (s) =>
      String(s.username || "").trim().toLowerCase() === cleanUser ||
      String(s.email || "").trim().toLowerCase() === cleanUser
  );

  if (!member && cleanUser === MASTER_ADMIN_SEED.username.toLowerCase()) {
    member = { ...MASTER_ADMIN_SEED };
  }

  if (!member) return null;
  if (passwordInput !== null && String(member.password || "") !== String(passwordInput)) {
    return null;
  }
  return member;
}

async function handleStandardLoginSubmit(e) {
  e.preventDefault();
  const userInp = document.getElementById("login-username");
  const passInp = document.getElementById("login-password");
  const trustChk = document.getElementById("login-trust-device");
  const errBox = document.getElementById("login-error-box");
  const submitBtn = document.getElementById("login-submit-btn");

  errBox?.classList.add("hidden");
  setButtonLoading(submitBtn, true, "جاري التحقق من الهوية...");

  try {
    await ensureMasterAdminSeeded();

    const username = (userInp?.value || "").trim();
    const password = passInp?.value || "";
    const matched = findMatchingStaffAccount(username, password);

    if (!matched) {
      if (errBox) {
        errBox.textContent = "اسم المستخدم أو كلمة المرور غير صحيحة.";
        errBox.classList.remove("hidden");
      }
      return;
    }

    if (matched.suspended && !isMasterAdminUser(matched)) {
      if (errBox) {
        errBox.textContent = "تم إيقاف صلاحية النشر والدخول لهذا الحساب من قِبل الإدارة.";
        errBox.classList.remove("hidden");
      }
      return;
    }

    completePortalLogin(matched, Boolean(trustChk?.checked), false);
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

function completePortalLogin(staffMember, trustThisDevice = true, isSilentRestore = false) {
  state.currentUser = staffMember;

  try {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ userId: staffMember.id, username: staffMember.username })
    );
    localStorage.setItem(CACHED_USER_STORAGE_KEY, JSON.stringify(staffMember));

    if (trustThisDevice) {
      localStorage.setItem(
        TRUSTED_DEVICE_KEY,
        JSON.stringify({
          userId: staffMember.id,
          username: staffMember.username,
          name: staffMember.name,
          avatar: staffMember.avatar || "",
          pinCode: staffMember.pinCode || "2026"
        })
      );
    }
  } catch (_) {}

  document.getElementById("auth-gate-screen")?.classList.add("hidden");
  document.getElementById("portal-app-shell")?.classList.remove("hidden");

  applyPortalIdentityAndPermissions();
  checkAndShowAutosaveRestoreBanner();
  renderAllPortalViews();

  if (!isSilentRestore) {
    showPortalToast(`مرحباً بك في غرفة العمليات، ${staffMember.name}`);
  }
}

function checkTrustedDeviceOrSessionAfterCloudSync() {
  if (state.currentUser) return;

  const activeSessionRaw = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (activeSessionRaw) {
    try {
      const parsed = JSON.parse(activeSessionRaw);
      const user =
        state.staff.find((s) => s.id === parsed.userId || s.username === parsed.username) ||
        (parsed.username === MASTER_ADMIN_SEED.username ? { ...MASTER_ADMIN_SEED } : null);

      if (user && (!user.suspended || isMasterAdminUser(user))) {
        completePortalLogin(user, false, true);
        return;
      }
    } catch (_) {}
  }

  const trustedRaw = localStorage.getItem(TRUSTED_DEVICE_KEY);
  if (trustedRaw) {
    try {
      const trusted = JSON.parse(trustedRaw);
      if (trusted && trusted.username) {
        showPinUnlockScreen(trusted);
        return;
      }
    } catch (_) {}
  }

  showStandardLoginForm();
}

function showStandardLoginForm() {
  setAuthGateSubView("login");
}

function showPinUnlockScreen(trustedData) {
  state.pinBuffer = "";
  updatePinDotsUI();
  setAuthGateSubView("pin");
  document.getElementById("pin-error-box")?.classList.add("hidden");

  const nameEl = document.getElementById("pin-user-name");
  if (nameEl) nameEl.textContent = trustedData.name || trustedData.username;

  const avEl = document.getElementById("pin-user-avatar");
  if (avEl) {
    avEl.src =
      trustedData.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        trustedData.name || "H"
      )}&background=b80d38&color=fff`;
  }
}

function updatePinDotsUI() {
  const dots = document.querySelectorAll("#pin-dots-display .pin-dot");
  dots.forEach((dot, idx) => {
    dot.classList.toggle("filled", idx < state.pinBuffer.length);
  });
}

function handlePinDigitPress(digit) {
  if (state.pinBuffer.length >= 4) return;
  state.pinBuffer += String(digit);
  updatePinDotsUI();

  if (state.pinBuffer.length === 4) {
    verifyEnteredPinCode();
  }
}

function verifyEnteredPinCode() {
  const errBox = document.getElementById("pin-error-box");
  errBox?.classList.add("hidden");

  try {
    const trustedRaw = localStorage.getItem(TRUSTED_DEVICE_KEY);
    const trusted = trustedRaw ? JSON.parse(trustedRaw) : null;
    if (!trusted) {
      showStandardLoginForm();
      return;
    }

    let cachedMember = null;
    try {
      const rawCache = localStorage.getItem(CACHED_USER_STORAGE_KEY);
      if (rawCache) cachedMember = JSON.parse(rawCache);
    } catch (_) {}

    const liveMember =
      state.staff.find((s) => s.id === trusted.userId || s.username === trusted.username) ||
      (cachedMember &&
      (cachedMember.id === trusted.userId || cachedMember.username === trusted.username)
        ? cachedMember
        : null) ||
      (trusted.username === MASTER_ADMIN_SEED.username ? { ...MASTER_ADMIN_SEED } : null);

    if (!liveMember) {
      showStandardLoginForm();
      return;
    }

    if (liveMember.suspended && !isMasterAdminUser(liveMember)) {
      if (errBox) {
        errBox.textContent = "تم إيقاف صلاحية الدخول لهذا الحساب.";
        errBox.classList.remove("hidden");
      }
      state.pinBuffer = "";
      updatePinDotsUI();
      return;
    }

    const expectedPin = String(liveMember.pinCode || trusted.pinCode || "2026").trim();
    if (state.pinBuffer === expectedPin) {
      completePortalLogin(liveMember, true, false);
    } else {
      if (errBox) {
        errBox.textContent = "رمز PIN غير صحيح، حاول مرة أخرى.";
        errBox.classList.remove("hidden");
      }
      state.pinBuffer = "";
      updatePinDotsUI();
    }
  } catch (_) {
    showStandardLoginForm();
  }
}

function lockPortalToPinScreen() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  state.currentUser = null;
  document.getElementById("portal-app-shell")?.classList.add("hidden");
  document.getElementById("auth-gate-screen")?.classList.remove("hidden");
  checkTrustedDeviceOrSessionAfterCloudSync();
}

function logoutFromPortalCompletely() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(CACHED_USER_STORAGE_KEY);
  state.currentUser = null;
  document.getElementById("portal-app-shell")?.classList.add("hidden");
  document.getElementById("auth-gate-screen")?.classList.remove("hidden");
  showStandardLoginForm();
}

// ==================== 6. تطبيق الهوية القرمزية والحاضنة الذكية للشعار المفرغ ====================
function applyPortalIdentityAndPermissions() {
  const s = state.settings;
  const siteName =
    s.siteName && s.siteName !== "شبكة البوصلة" && s.siteName !== "نبض اليمن"
      ? s.siteName
      : "حُجرية بريس";
  const brandColor = resolveEffectiveCrimsonColor(s.accentColor);

  document.documentElement.style.setProperty("--brand-red", brandColor);
  document.getElementById("portal-theme-color")?.setAttribute("content", brandColor);

  const authTitle = document.getElementById("auth-site-name");
  if (authTitle) authTitle.textContent = siteName;

  const headerTitle = document.getElementById("header-site-name");
  if (headerTitle) headerTitle.textContent = siteName;

  const hasLogo = Boolean(s.logoUrl && s.logoUrl.trim() !== "");
  const authLogo = document.getElementById("auth-logo-img");
  const authCapsule = document.getElementById("auth-logo-capsule");
  const headerLogo = document.getElementById("header-logo-img");
  const headerCapsule = document.getElementById("header-logo-capsule");
  const headerTextBrand = document.getElementById("header-text-brand");

  [authLogo, headerLogo].forEach((img) => {
    if (!img) return;
    if (hasLogo) {
      img.src = s.logoUrl.trim();
      img.classList.remove("hidden");
    } else {
      img.classList.add("hidden");
    }
  });

  authCapsule?.classList.toggle("hidden", !hasLogo);
  headerCapsule?.classList.toggle("hidden", !hasLogo);

  if (headerTextBrand) {
    headerTextBrand.classList.toggle("hidden", hasLogo && Boolean(s.hideSiteName));
  }

  const favUrl = (s.faviconUrl || s.appIconUrl || s.logoUrl || "").trim();
  if (favUrl) {
    const favEl = document.getElementById("portal-favicon");
    if (favEl) favEl.href = favUrl;
    const appleEl = document.getElementById("portal-apple-icon");
    if (appleEl) appleEl.href = favUrl;
  }

  const u = state.currentUser;
  if (!u) return;

  const uAv =
    u.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      u.name || "H"
    )}&background=b80d38&color=fff`;
  const headerAv = document.getElementById("header-user-avatar");
  if (headerAv) headerAv.src = uAv;

  const headerName = document.getElementById("header-user-name");
  if (headerName) headerName.textContent = u.name;

  const isVer = Boolean(u.verified || isMasterAdminUser(u) || u.role === "admin");
  document.getElementById("header-user-verified")?.classList.toggle("hidden", !isVer);

  const roleLabel = document.getElementById("header-user-role-label");
  if (roleLabel) {
    roleLabel.textContent = isMasterAdminUser(u)
      ? "الأدمن الرئيسي السيادي"
      : u.role === "admin"
      ? "مدير تحرير"
      : u.jobTitle || "كاتب وصحفي";
  }

  const hasTrusted = Boolean(localStorage.getItem(TRUSTED_DEVICE_KEY));
  document.getElementById("lock-pin-btn")?.classList.toggle("hidden", !hasTrusted);

  const canStaff = canManageStaffAndReviews(u);
  const canSettings = canManageSovereignSettings(u);

  document.getElementById("nav-tab-admin-staff")?.classList.toggle("hidden", !canStaff);
  document.getElementById("hub-pill-admin-staff")?.classList.toggle("hidden", !canStaff);

  document.getElementById("nav-tab-admin-settings")?.classList.toggle("hidden", !canSettings);
  document.getElementById("hub-pill-admin-settings")?.classList.toggle("hidden", !canSettings);

  const needsReview = Boolean(u.requireReview && !canManageAllPosts(u));
  document.getElementById("writer-review-notice")?.classList.toggle("hidden", !needsReview);
}

// ==================== 7. الحفظ التلقائي بالذاكرة المؤقتة (Auto-Save) لمنع ضياع أي حرف ====================
function getAutosaveStorageKey() {
  const uid = state.currentUser?.id || state.currentUser?.username || "guest";
  return `${AUTOSAVE_DRAFT_PREFIX}${uid}`;
}

function getSavedLocalDraft() {
  try {
    const raw = localStorage.getItem(getAutosaveStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed) return null;
    const hasContent = Boolean(
      (parsed.title && parsed.title.trim()) ||
        (parsed.summary && parsed.summary.trim()) ||
        (parsed.contentHtml && parsed.contentHtml.replace(/<[^>]+>/g, "").trim()) ||
        (parsed.videoUrl && parsed.videoUrl.trim())
    );
    return hasContent ? parsed : null;
  } catch (_) {
    return null;
  }
}

function saveCurrentEditorToLocalCache() {
  const editId = document.getElementById("post-edit-id")?.value || "";
  if (editId) return;

  const title = document.getElementById("post-title-input")?.value || "";
  const summary = document.getElementById("post-summary-input")?.value || "";
  const subcategory = document.getElementById("post-subcategory-select")?.value || "";
  const imageUrl = document.getElementById("post-image-url")?.value || "";
  const videoType = document.getElementById("post-video-type")?.value || "none";
  const videoUrl = document.getElementById("post-video-url")?.value || "";
  const videoDuration = document.getElementById("post-video-duration")?.value || "";
  const contentHtml = document.getElementById("post-rich-content")?.innerHTML || "";
  const isFeatured = Boolean(document.getElementById("post-flag-featured")?.checked);
  const isQuickNews = Boolean(document.getElementById("post-flag-quick")?.checked);
  const isBreaking = Boolean(document.getElementById("post-flag-breaking")?.checked);
  const breakingHours = document.getElementById("post-breaking-hours")?.value || "6";

  const payload = {
    title,
    summary,
    categories: [...state.selectedEditorCategories],
    subcategory,
    tags: [...state.selectedEditorTags],
    imageUrl,
    videoType,
    videoUrl,
    videoDuration,
    contentHtml,
    isFeatured,
    isQuickNews,
    isBreaking,
    breakingHours,
    savedAt: Date.now()
  };

  try {
    localStorage.setItem(getAutosaveStorageKey(), JSON.stringify(payload));
    const statusText = document.getElementById("autosave-status-text");
    if (statusText) {
      const timeStr = new Date().toLocaleTimeString("ar-YE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      statusText.textContent = `تم الحفظ تلقائياً في الذاكرة المؤقتة (${timeStr}) ✓`;
    }
    checkAndShowAutosaveRestoreBanner();
  } catch (_) {}
}

function clearLocalAutosavedDraft() {
  try {
    localStorage.removeItem(getAutosaveStorageKey());
  } catch (_) {}
  checkAndShowAutosaveRestoreBanner();
}

function checkAndShowAutosaveRestoreBanner() {
  const banner = document.getElementById("unsaved-draft-restore-banner");
  if (!banner) return;
  const saved = getSavedLocalDraft();
  banner.classList.toggle("hidden", !saved);
}

// ==================== 8. العدادات الحية للعنوان (110) والملخص (220) واقتراح الوسوم (3 كحد أقصى) ====================
function updateCharCounterUI(inputEl, counterEl, maxLimit, stripNewlines = false) {
  if (!inputEl || !counterEl) return;
  let val = inputEl.value || "";

  if (stripNewlines && /[\r\n]+/.test(val)) {
    val = val.replace(/[\r\n]+/g, " ");
    inputEl.value = val;
  }

  if (val.length > maxLimit) {
    val = val.slice(0, maxLimit);
    inputEl.value = val;
  }

  const len = val.length;
  counterEl.textContent = `${len} / ${maxLimit}`;
  counterEl.classList.toggle("limit-near", len >= Math.floor(maxLimit * 0.82) && len < maxLimit);
  counterEl.classList.toggle("limit-reached", len >= maxLimit);
}

function getAllKnownTagsWithCounts() {
  const countsMap = new Map();
  DEFAULT_CORE_TAGS.forEach((t) => countsMap.set(t, 1));

  state.posts.forEach((p) => {
    if (Array.isArray(p.tags)) {
      p.tags.forEach((rawTag) => {
        const clean = String(rawTag || "")
          .replace(/^#+/, "")
          .trim();
        if (clean) {
          countsMap.set(clean, (countsMap.get(clean) || 0) + 1);
        }
      });
    }
  });

  return Array.from(countsMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

function renderSelectedTagsUI() {
  const pillsBox = document.getElementById("selected-tags-pills");
  const counterEl = document.getElementById("tags-limit-counter");
  const searchInp = document.getElementById("post-tag-search-input");

  if (counterEl) {
    const count = state.selectedEditorTags.length;
    counterEl.textContent = `${count} / ${MAX_POST_TAGS} وسوم`;
    counterEl.classList.toggle("limit-reached", count >= MAX_POST_TAGS);
  }

  if (searchInp) {
    if (state.selectedEditorTags.length >= MAX_POST_TAGS) {
      searchInp.placeholder = "تم الوصول للحد الأقصى (3 وسوم فقط)";
      searchInp.disabled = true;
    } else {
      searchInp.placeholder = "اكتب حرفاً لاقتراح وسم محفوظ أو أضف وسماً ثم اضغط Enter...";
      searchInp.disabled = false;
    }
  }

  if (!pillsBox) return;
  pillsBox.innerHTML = state.selectedEditorTags
    .map(
      (tag) => `
      <span class="selected-tag-pill">
        <span>#${escapeHtml(tag)}</span>
        <button type="button" data-remove-tag="${escapeHtml(tag)}" title="إزالة الوسم">×</button>
      </span>
    `
    )
    .join("");

  pillsBox.querySelectorAll("[data-remove-tag]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-remove-tag");
      state.selectedEditorTags = state.selectedEditorTags.filter((t) => t !== target);
      renderSelectedTagsUI();
      saveCurrentEditorToLocalCache();
    });
  });
}

function addTagToEditorSelection(rawTag) {
  const cleanTag = String(rawTag || "")
    .replace(/^[#،,\s]+|[،,\s]+$/g, "")
    .replace(/\s+/g, "_")
    .trim();

  if (!cleanTag) return;

  if (state.selectedEditorTags.length >= MAX_POST_TAGS) {
    showPortalToast("الحد الأقصى المسموح به هو 3 وسوم فقط للمنشور الواحد");
    return;
  }

  const alreadyExists = state.selectedEditorTags.some(
    (t) => t.toLowerCase() === cleanTag.toLowerCase()
  );
  if (alreadyExists) {
    showPortalToast("هذا الوسم مضاف بالفعل");
    return;
  }

  const existingMatch = getAllKnownTagsWithCounts().find(
    (item) => item.tag.toLowerCase() === cleanTag.toLowerCase()
  );
  const finalTag = existingMatch ? existingMatch.tag : cleanTag;

  state.selectedEditorTags.push(finalTag);
  const inp = document.getElementById("post-tag-search-input");
  if (inp) inp.value = "";
  document.getElementById("tags-autocomplete-dropdown")?.classList.add("hidden");

  renderSelectedTagsUI();
  saveCurrentEditorToLocalCache();
}

function renderTagSuggestionsDropdown(queryText = "") {
  const dropdown = document.getElementById("tags-autocomplete-dropdown");
  if (!dropdown) return;

  if (state.selectedEditorTags.length >= MAX_POST_TAGS) {
    dropdown.classList.add("hidden");
    return;
  }

  const cleanQ = String(queryText || "")
    .replace(/^#+/, "")
    .trim()
    .toLowerCase();

  const allKnown = getAllKnownTagsWithCounts().filter(
    (item) =>
      !state.selectedEditorTags.some((sel) => sel.toLowerCase() === item.tag.toLowerCase())
  );

  const matches = cleanQ
    ? allKnown.filter((item) => item.tag.toLowerCase().includes(cleanQ)).slice(0, 8)
    : allKnown.slice(0, 6);

  const exactExists = allKnown.some((item) => item.tag.toLowerCase() === cleanQ);

  const itemsHtml = matches
    .map(
      (m) => `
      <button type="button" class="tag-suggestion-item" data-pick-tag="${escapeHtml(m.tag)}">
        <span>#${escapeHtml(m.tag)}</span>
        <small style="color:var(--text-muted);">محفوظ مسبقاً (${m.count})</small>
      </button>
    `
    )
    .join("");

  const addNewHtml =
    cleanQ && !exactExists
      ? `<button type="button" class="tag-suggestion-item" data-pick-tag="${escapeHtml(
          cleanQ.replace(/\s+/g, "_")
        )}" style="color:var(--brand-red);">
          <span>+ إضافة وسم جديد: #${escapeHtml(cleanQ.replace(/\s+/g, "_"))}</span>
          <small>اضغط للإضافة</small>
        </button>`
      : "";

  const combined = itemsHtml + addNewHtml;
  if (!combined) {
    dropdown.classList.add("hidden");
    return;
  }

  dropdown.innerHTML = combined;
  dropdown.classList.remove("hidden");

  dropdown.querySelectorAll("[data-pick-tag]").forEach((btn) => {
    btn.addEventListener("click", () => {
      addTagToEditorSelection(btn.getAttribute("data-pick-tag"));
    });
  });
}

// ==================== 9. لوحة المنشورات، البحث الذكي الفوري، وإحصائيات المشاهدات ====================
function renderPortalPostsAndStats() {
  if (!state.currentUser) return;

  const scopedPosts = getScopedPostsForCurrentUser();
  const isGlobalView = canManageAllPosts(state.currentUser);

  const totalViews = scopedPosts.reduce((sum, p) => sum + Number(p.views || 0), 0);
  const publishedCount = scopedPosts.filter((p) => !p.status || p.status === "published").length;
  const pendingOrDraftCount = scopedPosts.filter(
    (p) => p.status === "pending" || p.status === "draft"
  ).length;
  const videosCount = scopedPosts.filter(
    (p) =>
      (p.videoType && p.videoType !== "none") ||
      (p.videoUrl && String(p.videoUrl).trim() !== "")
  ).length;

  const viewsLabel = document.getElementById("stat-views-label");
  if (viewsLabel) {
    viewsLabel.textContent = isGlobalView
      ? "إجمالي مشاهدات جميع المنشورات"
      : "إجمالي مشاهدات منشوراتي";
  }

  const totalViewsEl = document.getElementById("stat-total-views");
  if (totalViewsEl) totalViewsEl.textContent = totalViews.toLocaleString("ar-YE");

  const pubCountEl = document.getElementById("stat-published-count");
  if (pubCountEl) pubCountEl.textContent = publishedCount.toLocaleString("ar-YE");

  const pendCountEl = document.getElementById("stat-pending-count");
  if (pendCountEl) pendCountEl.textContent = pendingOrDraftCount.toLocaleString("ar-YE");

  const vidCountEl = document.getElementById("stat-videos-count");
  if (vidCountEl) vidCountEl.textContent = videosCount.toLocaleString("ar-YE");

  let filtered = [...scopedPosts];

  if (state.postFilter === "published") {
    filtered = filtered.filter((p) => !p.status || p.status === "published");
  } else if (state.postFilter === "draft") {
    filtered = filtered.filter((p) => p.status === "draft");
  } else if (state.postFilter === "pending") {
    filtered = filtered.filter((p) => p.status === "pending");
  } else if (state.postFilter === "breaking") {
    filtered = filtered.filter((p) => Boolean(p.isBreaking));
  } else if (state.postFilter === "video") {
    filtered = filtered.filter(
      (p) =>
        (p.videoType && p.videoType !== "none") ||
        (p.videoUrl && String(p.videoUrl).trim() !== "")
    );
  }

  if (state.postSearchQuery) {
    const q = state.postSearchQuery.toLowerCase();
    filtered = filtered.filter((p) =>
      `${p.title || ""} ${p.summary || ""} ${p.author || ""} ${(p.categories || []).join(" ")} ${(
        p.tags || []
      ).join(" ")}`
        .toLowerCase()
        .includes(q)
    );
  }

  // تحديث عداد كبسولة البحث الذكي
  const searchCountBadge = document.getElementById("posts-search-count-badge");
  if (searchCountBadge) {
    if (state.postSearchQuery) {
      searchCountBadge.textContent = `${filtered.length.toLocaleString("ar-YE")} نتيجة`;
      searchCountBadge.classList.remove("hidden");
    } else {
      searchCountBadge.classList.add("hidden");
    }
  }

  const listEl = document.getElementById("portal-posts-list");
  if (!listEl) return;

  if (!filtered.length) {
    listEl.innerHTML = `
      <div class="empty-workspace-card">
        <span class="material-symbols-rounded empty-icon" translate="no">article</span>
        <h3>لا توجد منشورات في هذا العرض</h3>
        <p>اضغط على زر (+ نشر جديد) في الشريط السفلي لإضافة خبر أو فيديو أو مسودة.</p>
      </div>
    `;
    return;
  }

  const defaultImg = state.settings.defaultPostImageUrl || state.settings.logoUrl || "";
  const canEdit =
    canManageAllPosts(state.currentUser) || state.currentUser.permissions?.canEditOwn !== false;
  const canDelete =
    canManageAllPosts(state.currentUser) || Boolean(state.currentUser.permissions?.canDeleteOwn);

  listEl.innerHTML = filtered
    .map((post) => {
      const thumbUrl = post.imageUrl || defaultImg;
      const isPending = post.status === "pending";
      const isDraft = post.status === "draft";
      const viewsNum = Number(post.views || 0).toLocaleString("ar-YE");
      const cats =
        Array.isArray(post.categories) && post.categories.length
          ? post.categories.slice(0, 2).map(getCleanCategoryLabel).join(" ، ")
          : getCleanCategoryLabel(post.category || "عام");

      const hasVideo =
        (post.videoType && post.videoType !== "none") ||
        (post.videoUrl && String(post.videoUrl).trim() !== "");

      const statusBadgeHtml = isDraft
        ? `<span class="badge-pill badge-draft">📝 مسودة محفوظة</span>`
        : isPending
        ? `<span class="badge-pill badge-pending">⏳ قيد المراجعة</span>`
        : `<span class="badge-pill badge-published">✓ منشور</span>`;

      return `
        <article class="portal-post-row">
          <div class="post-row-main">
            ${
              thumbUrl
                ? `<img src="${escapeHtml(thumbUrl)}" alt="" class="post-row-thumb" loading="lazy">`
                : `<div class="post-row-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--brand-red);color:#fff;font-weight:900;">ح</div>`
            }
            <div>
              <h3 class="post-row-title">${escapeHtml(post.title)}</h3>
              <div class="post-row-badges">
                ${statusBadgeHtml}
                ${post.isBreaking ? `<span class="badge-pill badge-breaking">عاجل</span>` : ""}
                ${
                  hasVideo
                    ? `<span class="badge-pill badge-video">${
                        post.videoType === "short_vertical" ? "📱 فيديو قصير" : "🎬 فيديو"
                      }</span>`
                    : ""
                }
                <span style="color:var(--text-muted);font-weight:700;">${escapeHtml(cats)}</span>
                <span style="color:var(--text-muted);">• الكاتب: <strong>${escapeHtml(
                  post.author || "هيئة التحرير"
                )}</strong></span>
                <span style="color:var(--text-muted);">• ${formatArabicDateTime(post.createdAt)}</span>
              </div>
            </div>
          </div>

          <div class="post-row-actions">
            <div class="post-views-counter-pill" title="إجمالي المشاهدات الفعلية لهذا المنشور">
              <span class="material-symbols-rounded" translate="no">visibility</span>
              <span>${viewsNum} مشاهدة</span>
            </div>

            ${
              (isPending || isDraft) && canManageAllPosts(state.currentUser)
                ? `<button type="button" class="btn-primary-crimson" data-approve-post="${escapeHtml(
                    post.id
                  )}" style="padding:5px 10px;font-size:0.78rem;">اعتماد ونشر فوراً</button>`
                : ""
            }

            ${
              canEdit
                ? `<button type="button" class="btn-outline" data-edit-post="${escapeHtml(
                    post.id
                  )}" style="padding:5px 10px;font-size:0.78rem;">تعديل / استكمال</button>`
                : ""
            }

            ${
              canDelete
                ? `<button type="button" class="btn-outline" data-delete-post="${escapeHtml(
                    post.id
                  )}" style="padding:5px 10px;font-size:0.78rem;color:#b91c1c;border-color:#fca5a5;">حذف</button>`
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");

  listEl.querySelectorAll("[data-approve-post]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const postId = btn.getAttribute("data-approve-post");
      setButtonLoading(btn, true, "جاري النشر...");
      try {
        await updateDoc(doc(db, "posts", postId), {
          status: "published",
          approvedAt: serverTimestamp()
        });
        showPortalToast("تم اعتماد المنشور ونشره على الموقع العام ✓");
      } finally {
        setButtonLoading(btn, false);
      }
    });
  });

  listEl.querySelectorAll("[data-edit-post]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const postId = btn.getAttribute("data-edit-post");
      const post = state.posts.find((p) => p.id === postId);
      if (post) openArticleEditorModal("standard", post);
    });
  });

  listEl.querySelectorAll("[data-delete-post]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const postId = btn.getAttribute("data-delete-post");
      if (!confirm("هل أنت متأكد من حذف هذا المنشور نهائياً؟")) return;
      setButtonLoading(btn, true, "حذف...");
      try {
        await deleteDoc(doc(db, "posts", postId));
        showPortalToast("تم حذف المنشور بنجاح");
      } finally {
        setButtonLoading(btn, false);
      }
    });
  });
}

// ==================== 10. دفتر الملاحظات الشخصي المعزول ====================
function getMyIsolatedNotes() {
  if (!state.currentUser) return [];
  const myId = String(state.currentUser.id || "").toLowerCase();
  const myUser = String(state.currentUser.username || "").toLowerCase();
  return state.notes.filter(
    (n) =>
      String(n.ownerId || "").toLowerCase() === myId ||
      String(n.ownerUsername || "").toLowerCase() === myUser
  );
}

function renderPersonalNotes() {
  const myNotes = getMyIsolatedNotes();
  const badge = document.getElementById("notes-count-badge");
  if (badge) badge.textContent = String(myNotes.length);

  const grid = document.getElementById("personal-notes-grid");
  if (!grid) return;

  if (!myNotes.length) {
    grid.innerHTML = `
      <div class="empty-workspace-card" style="grid-column:1/-1;">
        <span class="material-symbols-rounded empty-icon" translate="no">edit_note</span>
        <h3>دفتر ملاحظاتك الشخصي فارغ</h3>
        <p>كل ما تكتبه هنا معزول وخاص بك وحدك. اضغط «إضافة ملاحظة جديدة» لتدوين أفكارك ومسوداتك.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = myNotes
    .map(
      (n) => `
      <div class="note-card" style="display:flex;flex-direction:column;justify-content:space-between;gap:10px;">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <strong style="font-size:0.95rem;">${escapeHtml(n.title)}</strong>
            <span style="font-size:0.72rem;color:var(--text-muted);">${formatArabicDateTime(
              n.updatedAt || n.createdAt
            )}</span>
          </div>
          <p style="font-size:0.84rem;color:var(--text-body);white-space:pre-line;">${escapeHtml(
            n.body || ""
          )}</p>
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:8px;border-top:1px solid var(--border-light);">
          <button type="button" class="btn-primary-crimson" data-convert-note="${escapeHtml(
            n.id
          )}" style="padding:4px 10px;font-size:0.76rem;">تحويل إلى مقال</button>
          <button type="button" class="btn-outline" data-edit-note="${escapeHtml(
            n.id
          )}" style="padding:4px 10px;font-size:0.76rem;">تعديل</button>
          <button type="button" class="btn-outline" data-delete-note="${escapeHtml(
            n.id
          )}" style="padding:4px 10px;font-size:0.76rem;color:#b91c1c;">حذف</button>
        </div>
      </div>
    `
    )
    .join("");

  grid.querySelectorAll("[data-convert-note]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const note = myNotes.find((item) => item.id === btn.getAttribute("data-convert-note"));
      if (!note) return;
      openArticleEditorModal("standard", null, false);
      const titleInp = document.getElementById("post-title-input");
      const richArea = document.getElementById("post-rich-content");
      if (titleInp) {
        titleInp.value = (note.title || "").slice(0, MAX_TITLE_CHARS);
        updateCharCounterUI(
          titleInp,
          document.getElementById("title-char-counter"),
          MAX_TITLE_CHARS,
          true
        );
      }
      if (richArea) {
        richArea.innerHTML = String(note.body || "")
          .split("\n")
          .filter(Boolean)
          .map((line) => `<p>${escapeHtml(line)}</p>`)
          .join("");
      }
      saveCurrentEditorToLocalCache();
    });
  });

  grid.querySelectorAll("[data-edit-note]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const note = myNotes.find((item) => item.id === btn.getAttribute("data-edit-note"));
      if (!note) return;
      document.getElementById("note-edit-id").value = note.id;
      document.getElementById("note-title-input").value = note.title || "";
      document.getElementById("note-body-input").value = note.body || "";
      document.getElementById("note-editor-card")?.classList.remove("hidden");
    });
  });

  grid.querySelectorAll("[data-delete-note]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delete-note");
      if (!confirm("حذف هذه الملاحظة الشخصية؟")) return;
      await deleteDoc(doc(db, "notes", id));
      showPortalToast("تم حذف الملاحظة");
    });
  });
}

async function handleSavePersonalNote(e) {
  e.preventDefault();
  if (!state.currentUser) return;

  const editId = document.getElementById("note-edit-id")?.value || "";
  const title = (document.getElementById("note-title-input")?.value || "").trim();
  const body = (document.getElementById("note-body-input")?.value || "").trim();
  const saveBtn = document.getElementById("save-note-btn");

  if (!title) return;
  setButtonLoading(saveBtn, true, "جاري الحفظ...");

  try {
    const payload = {
      title,
      body,
      ownerId: state.currentUser.id,
      ownerUsername: state.currentUser.username,
      updatedAt: serverTimestamp()
    };

    if (editId) {
      await updateDoc(doc(db, "notes", editId), payload);
    } else {
      await addDoc(collection(db, "notes"), {
        ...payload,
        createdAt: serverTimestamp()
      });
    }

    document.getElementById("note-editor-card")?.classList.add("hidden");
    document.getElementById("note-edit-id").value = "";
    document.getElementById("note-title-input").value = "";
    document.getElementById("note-body-input").value = "";
    showPortalToast("تم حفظ الملاحظة في دفترك الشخصي ✓");
  } finally {
    setButtonLoading(saveBtn, false);
  }
}

// ==================== 11. الملف الشخصي، التوثيق بالشارة الزرقاء، والأمان ====================
function renderProfileTab() {
  const u = state.currentUser;
  if (!u) return;

  const avatarUrl =
    u.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      u.name || "H"
    )}&background=b80d38&color=fff`;

  const bannerAv = document.getElementById("profile-banner-avatar");
  if (bannerAv) bannerAv.src = avatarUrl;

  const bannerName = document.getElementById("profile-banner-name");
  if (bannerName) bannerName.textContent = u.name || "";

  const isVer = Boolean(u.verified || isMasterAdminUser(u) || u.role === "admin");
  document.getElementById("profile-banner-verified")?.classList.toggle("hidden", !isVer);

  const bannerJob = document.getElementById("profile-banner-job");
  if (bannerJob) {
    bannerJob.textContent =
      u.jobTitle || (isMasterAdminUser(u) ? "المدير العام ورئيس التحرير" : "كاتب وصحفي");
  }

  const statusText = document.getElementById("profile-banner-status-text");
  if (statusText) {
    const reviewMode =
      u.requireReview && !canManageAllPosts(u)
        ? "منشوراتك تُحال للمراجعة قبل النشر"
        : "النشر الفوري مفعل لحسابك";
    statusText.textContent = `معرف الدخول: @${u.username} • ${reviewMode}`;
  }

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? "";
  };

  setVal("prof-display-name", u.name || "");
  setVal("prof-job-title", u.jobTitle || "");
  setVal("prof-avatar-url", u.avatar || "");
  setVal("prof-bio-text", u.bio || "");
  setVal("prof-social-x", u.socialX || "");
  setVal("prof-social-fb", u.socialFb || "");

  const verBanner = document.getElementById("verification-current-state");
  if (verBanner) {
    if (isVer) {
      verBanner.innerHTML = `<span class="material-symbols-rounded verified-icon" translate="no">verified</span> <strong>حسابك موثق رسمياً بالشارة الزرقاء المعتمدة في حُجرية بريس.</strong>`;
    } else {
      const pendingReq = state.staffRequests.find(
        (r) =>
          r.staffId === u.id &&
          r.requestType === "verification" &&
          r.status === "pending"
      );
      if (pendingReq) {
        verBanner.innerHTML = `<span class="material-symbols-rounded" translate="no">hourglass_top</span> <span>طلب توثيق حسابك قيد المراجعة حالياً لدى الإدارة.</span>`;
      } else {
        verBanner.innerHTML = `<span class="material-symbols-rounded" translate="no">info</span> <span>حسابك غير موثق بعد. يمكنك رفع وثيقتك الصحفية أو إثبات الهوية أدناه لطلب الشارة الزرقاء.</span>`;
      }
    }
  }

  setVal("sec-username-input", u.username || "");
  setVal("sec-new-password", "");
  setVal("sec-pin-code", u.pinCode || "2026");
}

async function handleProfileInfoSubmit(e) {
  e.preventDefault();
  if (!state.currentUser) return;

  const u = state.currentUser;
  const saveBtn = document.getElementById("save-profile-info-btn");
  const requestedName = (document.getElementById("prof-display-name")?.value || "").trim();
  const jobTitle = (document.getElementById("prof-job-title")?.value || "").trim();
  const avatar = (document.getElementById("prof-avatar-url")?.value || "").trim();
  const bio = (document.getElementById("prof-bio-text")?.value || "").trim();
  const socialX = (document.getElementById("prof-social-x")?.value || "").trim();
  const socialFb = (document.getElementById("prof-social-fb")?.value || "").trim();

  setButtonLoading(saveBtn, true, "جاري الحفظ...");

  try {
    const canChangeNameDirectly = isMasterAdminUser(u) || u.role === "admin";
    const nameChanged = requestedName && requestedName !== u.name;

    const directUpdates = {
      jobTitle,
      avatar,
      bio,
      socialX,
      socialFb,
      updatedAt: serverTimestamp()
    };

    if (canChangeNameDirectly && nameChanged) {
      directUpdates.name = requestedName;
    }

    await updateDoc(doc(db, "staff", u.id), directUpdates);

    if (!canChangeNameDirectly && nameChanged) {
      await addDoc(collection(db, "staff_requests"), {
        staffId: u.id,
        staffUsername: u.username,
        currentName: u.name,
        requestedName,
        requestType: "name_change",
        status: "pending",
        createdAt: serverTimestamp()
      });
      showPortalToast("تم حفظ بياناتك، وأُحيل طلب تغيير الاسم للإدارة لاعتماده ✓");
    } else {
      showPortalToast("تم تحديث ملفك الشخصي بنجاح ✓");
    }

    state.currentUser = { ...state.currentUser, ...directUpdates };
    localStorage.setItem(CACHED_USER_STORAGE_KEY, JSON.stringify(state.currentUser));
    applyPortalIdentityAndPermissions();
    renderProfileTab();
  } finally {
    setButtonLoading(saveBtn, false);
  }
}

async function handleVerificationRequestSubmit(e) {
  e.preventDefault();
  if (!state.currentUser) return;

  const u = state.currentUser;
  const docUrl = (document.getElementById("ver-doc-url")?.value || "").trim();
  const note = (document.getElementById("ver-request-note")?.value || "").trim();
  const submitBtn = document.getElementById("submit-ver-request-btn");

  if (!docUrl) {
    showPortalToast("يرجى رفع صورة الوثيقة أو إدخال رابطها أولاً");
    return;
  }

  setButtonLoading(submitBtn, true, "جاري الإرسال...");

  try {
    await addDoc(collection(db, "staff_requests"), {
      staffId: u.id,
      staffUsername: u.username,
      currentName: u.name,
      documentUrl: docUrl,
      note,
      requestType: "verification",
      status: "pending",
      createdAt: serverTimestamp()
    });

    document.getElementById("ver-doc-url").value = "";
    document.getElementById("ver-request-note").value = "";
    showPortalToast("تم إرسال الوثيقة وطلب التوثيق بالشارة الزرقاء للإدارة ✓");
    renderProfileTab();
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function handleSecuritySettingsSubmit(e) {
  e.preventDefault();
  if (!state.currentUser) return;

  const u = state.currentUser;
  const newUsername = (document.getElementById("sec-username-input")?.value || "").trim();
  const newPassword = document.getElementById("sec-new-password")?.value || "";
  const newPin = (document.getElementById("sec-pin-code")?.value || "2026").trim();
  const saveBtn = document.getElementById("save-security-btn");

  if (!newUsername) return;
  if (!/^\d{4}$/.test(newPin)) {
    showPortalToast("رمز الدخول السريع (PIN) يجب أن يتكون من 4 أرقام فقط");
    return;
  }

  const conflict = state.staff.find(
    (s) =>
      s.id !== u.id &&
      String(s.username || "").toLowerCase() === newUsername.toLowerCase()
  );
  if (conflict) {
    showPortalToast("اسم المستخدم هذا مستخدم بالفعل، اختر اسماً آخر");
    return;
  }

  setButtonLoading(saveBtn, true, "جاري التحديث...");

  try {
    const secUpdates = {
      username: newUsername,
      pinCode: newPin,
      updatedAt: serverTimestamp()
    };

    if (newPassword.trim() !== "") {
      secUpdates.password = newPassword.trim();
    }

    await updateDoc(doc(db, "staff", u.id), secUpdates);
    state.currentUser = { ...state.currentUser, ...secUpdates };

    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ userId: u.id, username: newUsername })
    );
    localStorage.setItem(CACHED_USER_STORAGE_KEY, JSON.stringify(state.currentUser));
    localStorage.setItem(
      TRUSTED_DEVICE_KEY,
      JSON.stringify({
        userId: u.id,
        username: newUsername,
        name: state.currentUser.name,
        avatar: state.currentUser.avatar || "",
        pinCode: newPin
      })
    );

    document.getElementById("sec-new-password").value = "";
    applyPortalIdentityAndPermissions();
    showPortalToast("تم تحديث بيانات الأمان وكلمة المرور ورمز PIN ✓");
  } finally {
    setButtonLoading(saveBtn, false);
  }
}

function revokeTrustedDevice() {
  localStorage.removeItem(TRUSTED_DEVICE_KEY);
  applyPortalIdentityAndPermissions();
  showPortalToast("تم إلغاء توثيق هذا الجهاز ومسح رمز PIN المحفوظ");
}

// ==================== 12. المحرر الذكي الشامل + أداة إدراج الصور المتعددة بين الفقرات ====================
function renderEditorCategoryChips() {
  const chipsContainer = document.getElementById("editor-categories-chips");
  const subSelect = document.getElementById("post-subcategory-select");
  if (!chipsContainer) return;

  const visibleCats = [...state.compasses]
    .filter((c) => c.visible !== false)
    .sort((a, b) => (a.order || 99) - (b.order || 99));

  chipsContainer.innerHTML = visibleCats
    .map((c) => {
      const cleanName = getCleanCategoryLabel(c.name);
      const isSelected = state.selectedEditorCategories.some(
        (sel) => getCleanCategoryLabel(sel) === cleanName
      );
      return `<button type="button" class="cat-select-chip ${
        isSelected ? "selected" : ""
      }" data-editor-cat="${escapeHtml(cleanName)}">${escapeHtml(cleanName)}</button>`;
    })
    .join("");

  chipsContainer.querySelectorAll("[data-editor-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const catName = btn.getAttribute("data-editor-cat");
      const exists = state.selectedEditorCategories.includes(catName);
      if (exists && state.selectedEditorCategories.length > 1) {
        state.selectedEditorCategories = state.selectedEditorCategories.filter(
          (item) => item !== catName
        );
      } else if (!exists) {
        state.selectedEditorCategories.push(catName);
      }
      renderEditorCategoryChips();
      saveCurrentEditorToLocalCache();
    });
  });

  if (subSelect) {
    const currentSubVal = subSelect.value;
    const allSubs = [];
    visibleCats.forEach((c) => {
      const cleanName = getCleanCategoryLabel(c.name);
      if (state.selectedEditorCategories.includes(cleanName) && Array.isArray(c.subcategories)) {
        c.subcategories.forEach((s) => {
          if (s && !allSubs.includes(s)) allSubs.push(s);
        });
      }
    });

    subSelect.innerHTML = [
      `<option value="">— اختر تصنيفاً فرعياً أو اتركه عاماً —</option>`,
      ...allSubs.map(
        (s) =>
          `<option value="${escapeHtml(s)}" ${
            s === currentSubVal ? "selected" : ""
          }>${escapeHtml(s)}</option>`
      )
    ].join("");
  }
}

function populateEditorFromDataObject(dataObj) {
  const titleInp = document.getElementById("post-title-input");
  const summaryInp = document.getElementById("post-summary-input");
  const imgInp = document.getElementById("post-image-url");
  const previewBox = document.getElementById("post-image-preview-box");
  const previewImg = document.getElementById("post-image-preview-img");
  const vidTypeSel = document.getElementById("post-video-type");
  const vidUrlInp = document.getElementById("post-video-url");
  const vidDurInp = document.getElementById("post-video-duration");
  const richArea = document.getElementById("post-rich-content");
  const flagFeatured = document.getElementById("post-flag-featured");
  const flagQuick = document.getElementById("post-flag-quick");
  const flagBreaking = document.getElementById("post-flag-breaking");
  const breakingWrap = document.getElementById("breaking-duration-wrap");
  const breakingHours = document.getElementById("post-breaking-hours");

  if (titleInp) {
    titleInp.value = String(dataObj.title || "").slice(0, MAX_TITLE_CHARS);
    updateCharCounterUI(
      titleInp,
      document.getElementById("title-char-counter"),
      MAX_TITLE_CHARS,
      true
    );
  }

  if (summaryInp) {
    summaryInp.value = String(dataObj.summary || "").slice(0, MAX_SUMMARY_CHARS);
    updateCharCounterUI(
      summaryInp,
      document.getElementById("summary-char-counter"),
      MAX_SUMMARY_CHARS,
      false
    );
  }

  state.selectedEditorCategories =
    Array.isArray(dataObj.categories) && dataObj.categories.length
      ? dataObj.categories.map(getCleanCategoryLabel)
      : [getCleanCategoryLabel(dataObj.category || "السياسة اليمنية")];
  renderEditorCategoryChips();

  const subSel = document.getElementById("post-subcategory-select");
  if (subSel) subSel.value = dataObj.subcategory || "";

  state.selectedEditorTags = Array.isArray(dataObj.tags)
    ? dataObj.tags
        .map((t) => String(t).replace(/^#+/, "").trim())
        .filter(Boolean)
        .slice(0, MAX_POST_TAGS)
    : [];
  renderSelectedTagsUI();

  if (imgInp) imgInp.value = dataObj.imageUrl || "";
  if (dataObj.imageUrl && previewBox && previewImg) {
    previewImg.src = dataObj.imageUrl;
    previewBox.classList.remove("hidden");
  } else {
    previewBox?.classList.add("hidden");
  }

  if (vidTypeSel) {
    vidTypeSel.value =
      dataObj.videoType || (dataObj.videoUrl ? "landscape" : "none");
  }
  if (vidUrlInp) vidUrlInp.value = dataObj.videoUrl || "";
  if (vidDurInp) vidDurInp.value = dataObj.videoDuration || "";
  if (richArea) richArea.innerHTML = dataObj.content || dataObj.contentHtml || "";

  if (flagFeatured) flagFeatured.checked = Boolean(dataObj.isFeatured);
  if (flagQuick) flagQuick.checked = Boolean(dataObj.isQuickNews);
  if (flagBreaking) flagBreaking.checked = Boolean(dataObj.isBreaking);
  breakingWrap?.classList.toggle("hidden", !flagBreaking?.checked);
  if (breakingHours) {
    breakingHours.value = String(
      dataObj.breakingDurationHours || dataObj.breakingHours || 6
    );
  }
}

function resetEditorFieldsCompletely() {
  document.getElementById("post-edit-id").value = "";
  populateEditorFromDataObject({
    title: "",
    summary: "",
    categories: ["السياسة اليمنية"],
    subcategory: "",
    tags: [],
    imageUrl: "",
    videoType: "none",
    videoUrl: "",
    videoDuration: "",
    content: "",
    isFeatured: false,
    isQuickNews: false,
    isBreaking: false,
    breakingHours: 6
  });
  const tagInp = document.getElementById("post-tag-search-input");
  if (tagInp) tagInp.value = "";
  document.getElementById("tags-autocomplete-dropdown")?.classList.add("hidden");
  document.getElementById("inline-image-inserter-box")?.classList.add("hidden");
}

function openArticleEditorModal(
  mode = "standard",
  postToEdit = null,
  tryRestoreLocalDraft = true
) {
  document.getElementById("plus-quick-modal")?.classList.add("hidden");
  const modal = document.getElementById("article-editor-modal");
  if (!modal) return;

  const modalTitle = document.getElementById("editor-modal-title");
  const editIdInp = document.getElementById("post-edit-id");
  const vidTypeSel = document.getElementById("post-video-type");
  const flagQuick = document.getElementById("post-flag-quick");
  const flagBreaking = document.getElementById("post-flag-breaking");
  const breakingWrap = document.getElementById("breaking-duration-wrap");
  const publishLabel = document.getElementById("publish-btn-label");
  const autosaveText = document.getElementById("autosave-status-text");

  const requiresReview = Boolean(
    state.currentUser?.requireReview && !canManageAllPosts(state.currentUser)
  );

  if (postToEdit) {
    if (modalTitle) modalTitle.textContent = "تعديل المادة الصحفية";
    editIdInp.value = postToEdit.id;
    populateEditorFromDataObject(postToEdit);
    if (autosaveText) autosaveText.textContent = "وضع تعديل منشور محفوظ";
    if (publishLabel) {
      publishLabel.textContent = requiresReview
        ? "حفظ التعديلات وإرسال للمراجعة"
        : "حفظ ونشر التعديلات فوراً";
    }
  } else {
    editIdInp.value = "";
    const savedLocal = tryRestoreLocalDraft ? getSavedLocalDraft() : null;

    if (savedLocal) {
      populateEditorFromDataObject(savedLocal);
      if (autosaveText) {
        autosaveText.textContent = "تمت استعادة مسودتك تلقائياً من الذاكرة المؤقتة ✓";
      }
    } else {
      resetEditorFieldsCompletely();
      if (autosaveText) {
        autosaveText.textContent = "الحفظ التلقائي بالذاكرة المؤقتة مفعّل";
      }
    }

    if (mode === "short-video") {
      if (modalTitle) modalTitle.textContent = "نشر فيديو قصير (Shorts / Reels 9:16)";
      if (vidTypeSel) vidTypeSel.value = "short_vertical";
    } else if (mode === "landscape-video") {
      if (modalTitle) modalTitle.textContent = "نشر تقرير فيديو عريض (16:9)";
      if (vidTypeSel) vidTypeSel.value = "landscape";
    } else if (mode === "quick-breaking") {
      if (modalTitle) modalTitle.textContent = "نشر خبر عاجل / نبض سريع";
      if (flagQuick) flagQuick.checked = true;
      if (flagBreaking) flagBreaking.checked = true;
      breakingWrap?.classList.remove("hidden");
    } else {
      if (modalTitle) modalTitle.textContent = "إنشاء خبر أو تقرير صحفي شامل";
    }

    if (publishLabel) {
      publishLabel.textContent = requiresReview
        ? "إرسال للمراجعة والاعتماد"
        : "نشر الآن فوراً";
    }
  }

  modal.classList.remove("hidden");
}

// إدراج صورة وسط المقال بين الفقرات في موضع المؤشر مع إمكانية متابعة الكتابة تحتها وإدراج صور أخرى
function handleConfirmInsertInlineImage() {
  const richArea = document.getElementById("post-rich-content");
  const urlInp = document.getElementById("inline-img-url-input");
  const capInp = document.getElementById("inline-img-caption-input");
  const inserterBox = document.getElementById("inline-image-inserter-box");

  if (!richArea || !urlInp) return;
  const imgUrl = (urlInp.value || "").trim();
  if (!imgUrl) {
    showPortalToast("يرجى رفع الصورة أو وضع رابطها أولاً");
    return;
  }

  const caption = (capInp?.value || "").trim();
  const figureHtml = `
    <figure class="inline-article-figure">
      <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(caption || "صورة مرفقة في التقرير")}" loading="lazy">
      ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
    </figure>
    <p><br></p>
  `;

  richArea.focus();
  const sel = window.getSelection();
  if (state.savedSelectionRange && sel) {
    try {
      sel.removeAllRanges();
      sel.addRange(state.savedSelectionRange);
    } catch (_) {}
  }

  if (sel && sel.rangeCount > 0 && richArea.contains(sel.anchorNode)) {
    document.execCommand("insertHTML", false, figureHtml);
  } else {
    richArea.insertAdjacentHTML("beforeend", figureHtml);
  }

  urlInp.value = "";
  if (capInp) capInp.value = "";
  inserterBox?.classList.add("hidden");

  saveCurrentEditorToLocalCache();
  showPortalToast("تم إدراج الصورة داخل المقال! يمكنك متابعة الكتابة تحتها وإضافة صور أخرى ✓");
}

function handleInsertSourceLink() {
  const richArea = document.getElementById("post-rich-content");
  if (!richArea) return;

  const rawUrl = prompt("أدخل رابط المصدر أو الصفحة (مثال: https://...):", "https://");
  if (!rawUrl || !rawUrl.trim() || rawUrl.trim() === "https://") return;

  let cleanUrl = rawUrl.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = `https://${cleanUrl}`;
  }

  richArea.focus();
  const sel = window.getSelection();
  if (state.savedSelectionRange && sel) {
    try {
      sel.removeAllRanges();
      sel.addRange(state.savedSelectionRange);
    } catch (_) {}
  }

  const selectedText = sel ? sel.toString().trim() : "";
  const linkLabel =
    selectedText || prompt("أدخل النص الظاهر للرابط (مثال: المصدر / اضغط هنا):", "المصدر") || cleanUrl;

  const anchorHtml = `<a href="${escapeHtml(
    cleanUrl
  )}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkLabel)}</a>&nbsp;`;

  document.execCommand("insertHTML", false, anchorHtml);
  saveCurrentEditorToLocalCache();
}

async function savePostDataToFirestore(targetMode = "publish") {
  if (!state.currentUser) return;

  const u = state.currentUser;
  const submitBtn =
    targetMode === "draft"
      ? document.getElementById("save-cloud-draft-btn")
      : document.getElementById("publish-post-submit-btn");

  const editId = document.getElementById("post-edit-id")?.value || "";
  const rawTitle = (document.getElementById("post-title-input")?.value || "")
    .replace(/[\r\n]+/g, " ")
    .trim();
  const rawSummary = (document.getElementById("post-summary-input")?.value || "").trim();

  if (!rawTitle) {
    showPortalToast("يرجى كتابة عنوان الخبر أولاً");
    return;
  }

  if (rawTitle.length > MAX_TITLE_CHARS) {
    showPortalToast(`العنوان يتجاوز الحد المسموح به (${MAX_TITLE_CHARS} حرفاً)`);
    return;
  }

  if (rawSummary.length > MAX_SUMMARY_CHARS) {
    showPortalToast(`الملخص يتجاوز الحد المسموح به (${MAX_SUMMARY_CHARS} حرفاً)`);
    return;
  }

  const leftoverTagInput = (document.getElementById("post-tag-search-input")?.value || "").trim();
  if (leftoverTagInput && state.selectedEditorTags.length < MAX_POST_TAGS) {
    addTagToEditorSelection(leftoverTagInput);
  }

  const subcategory = document.getElementById("post-subcategory-select")?.value || "";
  const imageUrl = (document.getElementById("post-image-url")?.value || "").trim();
  const videoType = document.getElementById("post-video-type")?.value || "none";
  const videoUrl = (document.getElementById("post-video-url")?.value || "").trim();
  const videoDuration = (document.getElementById("post-video-duration")?.value || "").trim();
  const contentHtml = (document.getElementById("post-rich-content")?.innerHTML || "").trim();

  const isFeatured = Boolean(document.getElementById("post-flag-featured")?.checked);
  const isQuickNews = Boolean(document.getElementById("post-flag-quick")?.checked);
  const isBreaking = Boolean(document.getElementById("post-flag-breaking")?.checked);
  const breakingHours = Number(document.getElementById("post-breaking-hours")?.value || 6);

  const categories = state.selectedEditorCategories.length
    ? [...state.selectedEditorCategories]
    : ["السياسة اليمنية"];

  const tags = state.selectedEditorTags.slice(0, MAX_POST_TAGS);

  const requiresReview = Boolean(u.requireReview && !canManageAllPosts(u));
  const finalStatus =
    targetMode === "draft" ? "draft" : requiresReview ? "pending" : "published";

  setButtonLoading(
    submitBtn,
    true,
    targetMode === "draft" ? "جاري حفظ المسودة..." : "جاري الحفظ والنشر..."
  );

  try {
    const payload = {
      title: rawTitle.slice(0, MAX_TITLE_CHARS),
      summary: rawSummary.slice(0, MAX_SUMMARY_CHARS),
      category: categories[0],
      categories,
      subcategory,
      tags,
      imageUrl,
      videoType: videoUrl ? (videoType === "none" ? "landscape" : videoType) : "none",
      videoUrl,
      videoDuration,
      content: contentHtml || `<p>${escapeHtml(rawSummary || rawTitle)}</p>`,
      isFeatured,
      isQuickNews,
      isBreaking,
      breakingDurationHours: isBreaking ? breakingHours : 0,
      breakingExpiresAt: isBreaking ? Date.now() + breakingHours * 3600 * 1000 : null,
      status: finalStatus,
      updatedAt: serverTimestamp()
    };

    if (editId) {
      await updateDoc(doc(db, "posts", editId), payload);
    } else {
      await addDoc(collection(db, "posts"), {
        ...payload,
        author: u.name,
        authorId: u.id,
        authorUsername: u.username,
        authorAvatar: u.avatar || "",
        authorVerified: Boolean(u.verified || isMasterAdminUser(u) || u.role === "admin"),
        views: 0,
        createdAt: serverTimestamp()
      });
    }

    clearLocalAutosavedDraft();
    document.getElementById("article-editor-modal")?.classList.add("hidden");

    if (finalStatus === "draft") {
      showPortalToast("تم حفظ المقال كمسودة في حسابك بنجاح ✓");
    } else if (finalStatus === "pending") {
      showPortalToast("تم إرسال مقالك للمراجعة وسيتم نشره فور اعتماده من الإدارة ✓");
    } else {
      showPortalToast("تم نشر المادة الصحفية فوراً على موقع حُجرية بريس ✓");
    }
  } catch (err) {
    console.error("Post save error:", err);
    showPortalToast("حدث خطأ أثناء حفظ المنشور، تحقق من الاتصال");
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

// ==================== 13. إدارة الكادر، الصلاحيات، الشارة الزرقاء، والحذف النهائي ====================
function renderAdminReviewsAndStaff() {
  if (!canManageStaffAndReviews(state.currentUser)) return;

  const pendingPosts = state.posts.filter((p) => p.status === "pending");
  const pendingReqs = state.staffRequests.filter((r) => r.status === "pending");
  const totalPending = pendingPosts.length + pendingReqs.length;

  const badgeEl = document.getElementById("pending-reviews-badge");
  if (badgeEl) {
    badgeEl.textContent = String(totalPending);
    badgeEl.classList.toggle("hidden", totalPending === 0);
  }

  // 1. المقالات المعلقة
  const pendingPostsBox = document.getElementById("admin-pending-posts-box");
  if (pendingPostsBox) {
    if (!pendingPosts.length) {
      pendingPostsBox.innerHTML = `<div class="notice-banner">لا توجد مقالات معلقة بانتظار المراجعة حالياً.</div>`;
    } else {
      pendingPostsBox.innerHTML = `
        <h4 style="margin-bottom:8px;color:var(--brand-red);">مقالات الكتّاب بانتظار المراجعة والاعتماد (${pendingPosts.length}):</h4>
        <div class="portal-posts-list">
          ${pendingPosts
            .map(
              (p) => `
            <div class="portal-post-row">
              <div>
                <strong>${escapeHtml(p.title)}</strong>
                <div style="font-size:0.78rem;color:var(--text-muted);">
                  الكاتب: <strong>${escapeHtml(p.author)}</strong> • القسم: ${escapeHtml(
                (p.categories || [p.category]).join(" ، ")
              )}
                </div>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button type="button" class="btn-primary-crimson" data-quick-approve-post="${escapeHtml(
                  p.id
                )}" style="padding:5px 12px;font-size:0.78rem;">اعتماد ونشر</button>
                <button type="button" class="btn-outline" data-preview-edit-post="${escapeHtml(
                  p.id
                )}" style="padding:5px 10px;font-size:0.78rem;">معاينة / تعديل</button>
                <button type="button" class="btn-outline" data-reject-post="${escapeHtml(
                  p.id
                )}" style="padding:5px 10px;font-size:0.78rem;color:#b91c1c;">رفض وحذف</button>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `;

      pendingPostsBox.querySelectorAll("[data-quick-approve-post]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-quick-approve-post");
          setButtonLoading(btn, true, "اعتماد...");
          await updateDoc(doc(db, "posts", id), {
            status: "published",
            approvedAt: serverTimestamp()
          });
          showPortalToast("تم اعتماد المقال ونشره فوراً ✓");
        });
      });

      pendingPostsBox.querySelectorAll("[data-preview-edit-post]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const post = state.posts.find(
            (p) => p.id === btn.getAttribute("data-preview-edit-post")
          );
          if (post) openArticleEditorModal("standard", post);
        });
      });

      pendingPostsBox.querySelectorAll("[data-reject-post]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-reject-post");
          if (!confirm("رفض وحذف هذا المقال المعلق؟")) return;
          await deleteDoc(doc(db, "posts", id));
          showPortalToast("تم رفض وحذف المقال");
        });
      });
    }
  }

  // 2. طلبات التوثيق وتغيير الاسم
  const reqsBox = document.getElementById("admin-staff-requests-box");
  if (reqsBox) {
    if (!pendingReqs.length) {
      reqsBox.innerHTML = "";
    } else {
      reqsBox.innerHTML = `
        <h4 style="margin:12px 0 8px;color:var(--brand-red);">طلبات التوثيق وتعديل الأسماء (${pendingReqs.length}):</h4>
        <div class="portal-posts-list">
          ${pendingReqs
            .map((r) => {
              const isVerReq = r.requestType === "verification";
              return `
                <div class="portal-post-row">
                  <div>
                    <strong>${
                      isVerReq
                        ? `طلب توثيق بالشارة الزرقاء — ${escapeHtml(r.currentName)}`
                        : `طلب تغيير اسم صحفي: من «${escapeHtml(
                            r.currentName
                          )}» إلى «${escapeHtml(r.requestedName)}»`
                    }</strong>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-top:3px;">
                      ${r.note ? `ملاحظة: ${escapeHtml(r.note)} • ` : ""}
                      ${
                        r.documentUrl
                          ? `<a href="${escapeHtml(
                              r.documentUrl
                            )}" target="_blank" rel="noopener" style="color:var(--brand-red);font-weight:800;">👁️ عرض صورة الوثيقة المرفقة</a>`
                          : ""
                      }
                    </div>
                  </div>
                  <div style="display:flex;gap:6px;">
                    <button type="button" class="btn-primary-crimson" data-approve-req="${escapeHtml(
                      r.id
                    )}" style="padding:5px 12px;font-size:0.78rem;">موافقة واعتماد</button>
                    <button type="button" class="btn-outline" data-reject-req="${escapeHtml(
                      r.id
                    )}" style="padding:5px 10px;font-size:0.78rem;color:#b91c1c;">رفض</button>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      `;

      reqsBox.querySelectorAll("[data-approve-req]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const req = pendingReqs.find((item) => item.id === btn.getAttribute("data-approve-req"));
          if (!req) return;
          setButtonLoading(btn, true, "اعتماد...");
          try {
            if (req.requestType === "verification") {
              await updateDoc(doc(db, "staff", req.staffId), { verified: true });
            } else if (req.requestType === "name_change" && req.requestedName) {
              await updateDoc(doc(db, "staff", req.staffId), { name: req.requestedName });
            }
            await updateDoc(doc(db, "staff_requests", req.id), { status: "approved" });
            showPortalToast("تم اعتماد الطلب وتحديث حساب الكاتب ✓");
          } finally {
            setButtonLoading(btn, false);
          }
        });
      });

      reqsBox.querySelectorAll("[data-reject-req]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const reqId = btn.getAttribute("data-reject-req");
          await updateDoc(doc(db, "staff_requests", reqId), { status: "rejected" });
          showPortalToast("تم رفض الطلب");
        });
      });
    }
  }

  // 3. بطاقات الكادر مع زر الحذف النهائي وزر سحب الصلاحيات
  const staffGrid = document.getElementById("admin-staff-cards-grid");
  if (!staffGrid) return;

  staffGrid.innerHTML = state.staff
    .map((m) => {
      const isMaster = isMasterAdminUser(m);
      const isVer = Boolean(m.verified || isMaster || m.role === "admin");
      const av =
        m.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          m.name || "H"
        )}&background=b80d38&color=fff`;

      return `
        <div class="staff-member-card" style="display:flex;flex-direction:column;justify-content:space-between;gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${escapeHtml(
              av
            )}" alt="" style="width:46px;height:46px;border-radius:50%;object-fit:cover;border:2px solid var(--brand-red);">
            <div>
              <div style="display:flex;align-items:center;gap:4px;">
                <strong style="font-size:0.95rem;">${escapeHtml(m.name)}</strong>
                ${
                  isVer
                    ? `<span class="material-symbols-rounded verified-icon" translate="no" title="موثق بالشارة الزرقاء">verified</span>`
                    : ""
                }
              </div>
              <span style="font-size:0.75rem;color:var(--text-muted);display:block;" dir="ltr">@${escapeHtml(
                m.username || ""
              )}</span>
              <span style="font-size:0.75rem;color:var(--brand-red);font-weight:800;">${escapeHtml(
                m.jobTitle || (isMaster ? "الأدمن الرئيسي السيادي" : "كاتب وصحفي")
              )}</span>
            </div>
          </div>

          <div style="display:flex;flex-wrap:wrap;gap:5px;font-size:0.72rem;">
            <span class="badge-pill ${m.requireReview ? "badge-pending" : "badge-published"}">
              ${m.requireReview ? "⏳ منشوراته تخضع للمراجعة" : "⚡ نشر مباشر"}
            </span>
            ${
              m.suspended
                ? `<span class="badge-pill badge-breaking">🔒 مسحوب الصلاحية (الأرشيف باقٍ)</span>`
                : ""
            }
          </div>

          ${
            isMaster && !isMasterAdminUser(state.currentUser)
              ? `<div style="font-size:0.75rem;color:var(--text-muted);">حساب سيادي محمي</div>`
              : `<div style="display:flex;flex-wrap:wrap;gap:6px;padding-top:8px;border-top:1px solid var(--border-light);">
                  <button type="button" class="btn-outline" data-edit-staff="${escapeHtml(
                    m.id
                  )}" style="padding:4px 9px;font-size:0.75rem;">الصلاحيات والتعديل</button>
                  <button type="button" class="btn-outline" data-toggle-verified="${escapeHtml(
                    m.id
                  )}" style="padding:4px 9px;font-size:0.75rem;">
                    ${m.verified ? "إلغاء الشارة" : "منح الشارة ✓"}
                  </button>
                  <button type="button" class="btn-outline" data-toggle-review="${escapeHtml(
                    m.id
                  )}" style="padding:4px 9px;font-size:0.75rem;">
                    ${m.requireReview ? "تفعيل النشر المباشر" : "إحالة للمراجعة"}
                  </button>
                  ${
                    !isMaster
                      ? `<button type="button" class="btn-outline" data-toggle-suspend="${escapeHtml(
                          m.id
                        )}" style="padding:4px 9px;font-size:0.75rem;color:${
                          m.suspended ? "#15803d" : "#b45309"
                        };">
                          ${m.suspended ? "إعادة الصلاحية" : "سحب الصلاحية"}
                        </button>
                        <button type="button" class="btn-outline" data-delete-staff="${escapeHtml(
                          m.id
                        )}" style="padding:4px 9px;font-size:0.75rem;color:#b91c1c;border-color:#fca5a5;">
                          حذف نهائي
                        </button>`
                      : ""
                  }
                </div>`
          }
        </div>
      `;
    })
    .join("");

  staffGrid.querySelectorAll("[data-edit-staff]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const member = state.staff.find((s) => s.id === btn.getAttribute("data-edit-staff"));
      if (member) openStaffEditorForMember(member);
    });
  });

  staffGrid.querySelectorAll("[data-toggle-verified]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const member = state.staff.find((s) => s.id === btn.getAttribute("data-toggle-verified"));
      if (!member) return;
      await updateDoc(doc(db, "staff", member.id), { verified: !member.verified });
      showPortalToast(
        !member.verified ? "تم منح الشارة الزرقاء للكاتب ✓" : "تم سحب الشارة الزرقاء"
      );
    });
  });

  staffGrid.querySelectorAll("[data-toggle-review]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const member = state.staff.find((s) => s.id === btn.getAttribute("data-toggle-review"));
      if (!member) return;
      await updateDoc(doc(db, "staff", member.id), { requireReview: !member.requireReview });
      showPortalToast(
        !member.requireReview
          ? "أصبحت منشورات هذا الكاتب تُحال للمراجعة قبل النشر"
          : "تم تفعيل النشر المباشر للكاتب ✓"
      );
    });
  });

  staffGrid.querySelectorAll("[data-toggle-suspend]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const member = state.staff.find((s) => s.id === btn.getAttribute("data-toggle-suspend"));
      if (!member) return;
      await updateDoc(doc(db, "staff", member.id), { suspended: !member.suspended });
      showPortalToast(
        !member.suspended
          ? "تم سحب صلاحيات الدخول والنشر مع بقاء اسم الكاتب وشارته في الموقع العام"
          : "تمت إعادة تفعيل صلاحيات الكاتب ✓"
      );
    });
  });

  staffGrid.querySelectorAll("[data-delete-staff]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const member = state.staff.find((s) => s.id === btn.getAttribute("data-delete-staff"));
      if (!member || isMasterAdminUser(member)) return;
      if (!confirm(`هل أنت متأكد من حذف حساب العضو «${member.name}» نهائياً من قاعدة البيانات؟`)) {
        return;
      }
      setButtonLoading(btn, true, "حذف...");
      try {
        await deleteDoc(doc(db, "staff", member.id));
        showPortalToast(`تم حذف حساب «${member.name}» نهائياً ✓`);
      } finally {
        setButtonLoading(btn, false);
      }
    });
  });
}

function openStaffEditorForMember(member = null) {
  const form = document.getElementById("staff-editor-form");
  const heading = document.getElementById("staff-form-heading");
  if (!form) return;

  form.classList.remove("hidden");

  if (member) {
    if (heading) heading.textContent = `تعديل بيانات وصلاحيات: ${member.name}`;
    document.getElementById("staff-edit-id").value = member.id;
    document.getElementById("st-name").value = member.name || "";
    document.getElementById("st-username").value = member.username || "";
    document.getElementById("st-password").value = member.password || "";
    document.getElementById("st-job-title").value = member.jobTitle || "";
    document.getElementById("st-role").value = member.role || "writer";

    document.getElementById("st-perm-verified").checked = Boolean(member.verified);
    document.getElementById("st-perm-require-review").checked = Boolean(member.requireReview);
    document.getElementById("st-perm-can-edit").checked =
      member.permissions?.canEditOwn !== false;
    document.getElementById("st-perm-can-delete").checked = Boolean(
      member.permissions?.canDeleteOwn
    );
    document.getElementById("st-perm-manage-posts").checked = Boolean(
      member.permissions?.managePosts
    );
    document.getElementById("st-perm-manage-staff").checked = Boolean(
      member.permissions?.manageStaff
    );
    document.getElementById("st-perm-suspended").checked = Boolean(member.suspended);
  } else {
    if (heading) heading.textContent = "إضافة كاتب / عضو جديد في الكادر";
    document.getElementById("staff-edit-id").value = "";
    document.getElementById("st-name").value = "";
    document.getElementById("st-username").value = "";
    document.getElementById("st-password").value = "";
    document.getElementById("st-job-title").value = "كاتب وصحفي";
    document.getElementById("st-role").value = "writer";

    document.getElementById("st-perm-verified").checked = false;
    document.getElementById("st-perm-require-review").checked = false;
    document.getElementById("st-perm-can-edit").checked = true;
    document.getElementById("st-perm-can-delete").checked = false;
    document.getElementById("st-perm-manage-posts").checked = false;
    document.getElementById("st-perm-manage-staff").checked = false;
    document.getElementById("st-perm-suspended").checked = false;
  }

  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function handleSaveStaffMember(e) {
  e.preventDefault();
  if (!canManageStaffAndReviews(state.currentUser)) return;

  const editId = document.getElementById("staff-edit-id")?.value || "";
  const name = (document.getElementById("st-name")?.value || "").trim();
  const username = (document.getElementById("st-username")?.value || "").trim();
  const password = (document.getElementById("st-password")?.value || "").trim();
  const jobTitle = (document.getElementById("st-job-title")?.value || "").trim();
  const role = document.getElementById("st-role")?.value || "writer";
  const saveBtn = document.getElementById("save-staff-member-btn");

  if (!name || !username || !password) return;

  const duplicate = state.staff.find(
    (s) =>
      s.id !== editId &&
      String(s.username || "").toLowerCase() === username.toLowerCase()
  );
  if (duplicate) {
    showPortalToast("اسم المستخدم هذا مسجل لعضو آخر");
    return;
  }

  setButtonLoading(saveBtn, true, "جاري الحفظ...");

  try {
    const payload = {
      name,
      username,
      password,
      jobTitle: jobTitle || "كاتب وصحفي",
      role,
      verified: Boolean(document.getElementById("st-perm-verified")?.checked),
      requireReview: Boolean(document.getElementById("st-perm-require-review")?.checked),
      suspended: Boolean(document.getElementById("st-perm-suspended")?.checked),
      permissions: {
        canEditOwn: Boolean(document.getElementById("st-perm-can-edit")?.checked),
        canDeleteOwn: Boolean(document.getElementById("st-perm-can-delete")?.checked),
        managePosts: Boolean(document.getElementById("st-perm-manage-posts")?.checked),
        manageStaff: Boolean(document.getElementById("st-perm-manage-staff")?.checked)
      },
      updatedAt: serverTimestamp()
    };

    if (editId) {
      await updateDoc(doc(db, "staff", editId), payload);
    } else {
      await addDoc(collection(db, "staff"), {
        ...payload,
        pinCode: "2026",
        createdAt: serverTimestamp()
      });
    }

    document.getElementById("staff-editor-form")?.classList.add("hidden");
    showPortalToast("تم حفظ بيانات وصلاحيات العضو بنجاح ✓");
  } finally {
    setButtonLoading(saveBtn, false);
  }
}

// ==================== 14. الإعدادات السيادية ولوحة إدارة الإعلانات المتقدمة ====================
function populateSovereignSettingsForm() {
  if (!canManageSovereignSettings(state.currentUser)) return;
  const s = state.settings;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? "";
  };

  setVal(
    "set-site-name",
    s.siteName && s.siteName !== "شبكة البوصلة" && s.siteName !== "نبض اليمن"
      ? s.siteName
      : "حُجرية بريس"
  );
  setVal("set-site-desc", s.siteDescription || "");

  const colorHex = resolveEffectiveCrimsonColor(s.accentColor);
  setVal("set-accent-color-wheel", colorHex);
  setVal("set-accent-color-hex", colorHex);

  setVal("set-logo-url", s.logoUrl || "");
  const logoPreviewWrap = document.getElementById("set-logo-preview-wrap");
  const logoPreviewImg = document.getElementById("set-logo-preview-img");
  if (logoPreviewWrap && logoPreviewImg) {
    if (s.logoUrl && s.logoUrl.trim()) {
      logoPreviewImg.src = s.logoUrl.trim();
      logoPreviewWrap.classList.remove("hidden");
    } else {
      logoPreviewWrap.classList.add("hidden");
    }
  }

  const hideNameChk = document.getElementById("set-hide-site-name");
  if (hideNameChk) hideNameChk.checked = Boolean(s.hideSiteName);

  setVal("set-default-post-img", s.defaultPostImageUrl || s.coverImageUrl || "");
  setVal("set-favicon-url", s.faviconUrl || s.appIconUrl || "");
  setVal("set-imgbb-key", s.imgbbApiKey || "");

  const soc = s.socials || {};
  setVal("soc-whatsapp", soc.whatsapp || "");
  setVal("soc-telegram", soc.telegram || "");
  setVal("soc-x", soc.x || soc.twitter || "");
  setVal("soc-facebook", soc.facebook || "");
  setVal("soc-youtube", soc.youtube || "");
  setVal("soc-tiktok", soc.tiktok || "");
  setVal("soc-instagram", soc.instagram || "");
  setVal("soc-threads", soc.threads || "");
  setVal("soc-snapchat", soc.snapchat || "");
  setVal("soc-linkedin", soc.linkedin || "");

  setVal("set-about-html", s.aboutHtml || "");
  setVal("set-charter-html", s.charterHtml || "");
  setVal("set-privacy-html", s.privacyHtml || "");
}

async function handleSaveSovereignSettings(e) {
  e.preventDefault();
  if (!canManageSovereignSettings(state.currentUser)) return;

  const saveBtn = document.getElementById("save-sovereign-settings-btn");
  setButtonLoading(saveBtn, true, "جاري حفظ الإعدادات...");

  try {
    const getVal = (id) => (document.getElementById(id)?.value || "").trim();
    const hexColor = getVal("set-accent-color-hex") || DEFAULT_CRIMSON_COLOR;
    const defaultImg = getVal("set-default-post-img");
    const favImg = getVal("set-favicon-url");

    const updatedSettings = {
      siteName: getVal("set-site-name") || "حُجرية بريس",
      siteDescription: getVal("set-site-desc"),
      accentColor: hexColor,
      logoUrl: getVal("set-logo-url"),
      hideSiteName: Boolean(document.getElementById("set-hide-site-name")?.checked),
      defaultPostImageUrl: defaultImg,
      coverImageUrl: defaultImg,
      faviconUrl: favImg,
      appIconUrl: favImg,
      imgbbApiKey: getVal("set-imgbb-key"),
      aboutHtml: document.getElementById("set-about-html")?.value || "",
      charterHtml: document.getElementById("set-charter-html")?.value || "",
      privacyHtml: document.getElementById("set-privacy-html")?.value || "",
      socials: {
        whatsapp: getVal("soc-whatsapp"),
        telegram: getVal("soc-telegram"),
        x: getVal("soc-x"),
        facebook: getVal("soc-facebook"),
        youtube: getVal("soc-youtube"),
        tiktok: getVal("soc-tiktok"),
        instagram: getVal("soc-instagram"),
        threads: getVal("soc-threads"),
        snapchat: getVal("soc-snapchat"),
        linkedin: getVal("soc-linkedin")
      },
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, "settings", "general"), updatedSettings, { merge: true });
    state.settings = { ...state.settings, ...updatedSettings };
    applyPortalIdentityAndPermissions();
    populateSovereignSettingsForm();
    showPortalToast("تم حفظ وتطبيق إعدادات الهوية والشعار والألوان على الموقع العام فوراً ✓");
  } finally {
    setButtonLoading(saveBtn, false);
  }
}

function renderCategoriesAndAdsManager() {
  if (!canManageSovereignSettings(state.currentUser)) return;

  // 1. إدارة الأقسام
  const catList = document.getElementById("admin-categories-list");
  if (catList) {
    const sorted = [...state.compasses].sort((a, b) => (a.order || 99) - (b.order || 99));
    catList.innerHTML = sorted
      .map(
        (c) => `
        <div class="clean-panel-card" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
          <div>
            <strong>${escapeHtml(getCleanCategoryLabel(c.name))}</strong>
            <span class="badge-pill ${c.visible === false ? "badge-draft" : "badge-published"}" style="margin-right:6px;">
              ${c.visible === false ? "مخفي" : "ظاهر"}
            </span>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:3px;">
              الفروع: ${escapeHtml((c.subcategories || []).join(" ، ") || "بدون فروع")}
            </div>
          </div>
          <div style="display:flex;gap:5px;">
            <button type="button" class="btn-outline" data-edit-cat="${escapeHtml(
              c.id
            )}" style="padding:4px 8px;font-size:0.74rem;">تعديل</button>
            <button type="button" class="btn-outline" data-toggle-cat-vis="${escapeHtml(
              c.id
            )}" style="padding:4px 8px;font-size:0.74rem;">
              ${c.visible === false ? "إظهار" : "إخفاء"}
            </button>
          </div>
        </div>
      `
      )
      .join("");

    catList.querySelectorAll("[data-edit-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cat = state.compasses.find((item) => item.id === btn.getAttribute("data-edit-cat"));
        if (!cat) return;
        document.getElementById("cat-edit-id").value = cat.id;
        document.getElementById("cat-name-input").value = getCleanCategoryLabel(cat.name);
        document.getElementById("cat-subs-input").value = (cat.subcategories || []).join("، ");
        document.getElementById("cat-order-input").value = cat.order || 1;
        document.getElementById("cancel-cat-edit-btn")?.classList.remove("hidden");
      });
    });

    catList.querySelectorAll("[data-toggle-cat-vis]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const cat = state.compasses.find(
          (item) => item.id === btn.getAttribute("data-toggle-cat-vis")
        );
        if (!cat) return;
        const newVis = cat.visible === false ? true : false;
        await setDoc(
          doc(db, "categories", cat.id),
          { ...cat, visible: newVis },
          { merge: true }
        );
        showPortalToast(newVis ? "تم إظهار القسم في الموقع ✓" : "تم إخفاء القسم مؤقتاً");
      });
    });
  }

  // 2. لوحة إدارة الإعلانات المتقدمة مع إحصائيات الظهور والنقرات ونسبة التفاعل والتجميد
  const adsList = document.getElementById("admin-ads-list");
  if (adsList) {
    if (!state.ads.length) {
      adsList.innerHTML = `<div class="notice-banner" style="grid-column:1/-1;">لا توجد حملات إعلانية مضافة حالياً. استخدم النموذج أعلاه لإضافة إعلان جديد.</div>`;
      return;
    }

    adsList.innerHTML = state.ads
      .map((ad) => {
        const isPaused = ad.active === false || ad.status === "paused" || ad.status === "frozen";
        const views = Number(ad.views || 0);
        const clicks = Number(ad.clicks || 0);
        const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : "0.0";

        return `
          <div class="ad-analytics-card">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
                <div>
                  <strong style="font-size:0.95rem;display:block;">${escapeHtml(ad.title)}</strong>
                  <span style="font-size:0.75rem;color:var(--text-muted);">المعلن: ${escapeHtml(
                    ad.sponsorName || "شركاء حُجرية بريس"
                  )}</span>
                </div>
                <span class="badge-pill ${isPaused ? "badge-pending" : "badge-published"}">
                  ${isPaused ? "⏸️ مجمّد / متوقف" : "🟢 نشط"}
                </span>
              </div>

              ${
                ad.imageUrl
                  ? `<div style="margin-bottom:8px;padding:6px;background:var(--bg-page);border:1px solid var(--border-light);border-radius:6px;text-align:center;">
                      <img src="${escapeHtml(
                        ad.imageUrl
                      )}" alt="" style="max-height:60px;margin:0 auto;object-fit:contain;">
                    </div>`
                  : ""
              }

              <div class="ad-metrics-row">
                <div class="ad-metric-item">
                  <span>مرات الظهور</span>
                  <strong>${views.toLocaleString("ar-YE")}</strong>
                </div>
                <div class="ad-metric-item">
                  <span>النقرات</span>
                  <strong style="color:var(--brand-red);">${clicks.toLocaleString("ar-YE")}</strong>
                </div>
                <div class="ad-metric-item">
                  <span>نسبة التفاعل CTR</span>
                  <strong dir="ltr">${ctr}%</strong>
                </div>
              </div>
            </div>

            <div style="display:flex;flex-wrap:wrap;gap:6px;padding-top:8px;border-top:1px solid var(--border-light);">
              <button type="button" class="btn-outline" data-toggle-ad-status="${escapeHtml(
                ad.id
              )}" style="padding:4px 9px;font-size:0.75rem;color:${
          isPaused ? "#15803d" : "#b45309"
        };">
                ${isPaused ? "▶ تنشيط الإعلان" : "⏸️ تجميد / إيقاف مؤقت"}
              </button>
              <button type="button" class="btn-outline" data-edit-ad="${escapeHtml(
                ad.id
              )}" style="padding:4px 9px;font-size:0.75rem;">تعديل</button>
              <button type="button" class="btn-outline" data-reset-ad-stats="${escapeHtml(
                ad.id
              )}" style="padding:4px 9px;font-size:0.75rem;">تصفير العداد</button>
              <button type="button" class="btn-outline" data-delete-ad="${escapeHtml(
                ad.id
              )}" style="padding:4px 9px;font-size:0.75rem;color:#b91c1c;border-color:#fca5a5;">حذف</button>
            </div>
          </div>
        `;
      })
      .join("");

    adsList.querySelectorAll("[data-toggle-ad-status]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ad = state.ads.find((a) => a.id === btn.getAttribute("data-toggle-ad-status"));
        if (!ad) return;
        const currentlyPaused =
          ad.active === false || ad.status === "paused" || ad.status === "frozen";
        await updateDoc(doc(db, "ads", ad.id), {
          active: currentlyPaused ? true : false,
          status: currentlyPaused ? "active" : "paused",
          updatedAt: serverTimestamp()
        });
        showPortalToast(
          currentlyPaused
            ? "تم تنشيط الإعلان وإظهاره في الموقع العام ✓"
            : "تم تجميد وإيقاف الإعلان مؤقتاً"
        );
      });
    });

    adsList.querySelectorAll("[data-edit-ad]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ad = state.ads.find((a) => a.id === btn.getAttribute("data-edit-ad"));
        if (!ad) return;
        document.getElementById("ad-edit-id").value = ad.id;
        document.getElementById("ad-title-input").value = ad.title || "";
        document.getElementById("ad-sponsor-input").value = ad.sponsorName || "";
        document.getElementById("ad-target-url").value = ad.targetUrl || "";
        document.getElementById("ad-image-url").value = ad.imageUrl || "";
        const isPaused = ad.active === false || ad.status === "paused";
        document.getElementById("ad-status-select").value = isPaused ? "paused" : "active";
        document.getElementById("ad-form-heading").textContent = `تعديل الحملة الإعلانية: ${ad.title}`;
        document.getElementById("save-ad-btn-label").textContent = "حفظ تعديلات الإعلان";
        document.getElementById("cancel-ad-edit-btn")?.classList.remove("hidden");
        document.getElementById("ad-manager-form")?.scrollIntoView({ behavior: "smooth" });
      });
    });

    adsList.querySelectorAll("[data-reset-ad-stats]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-reset-ad-stats");
        if (!confirm("تصفير عداد المشاهدات والنقرات لهذا الإعلان؟")) return;
        await updateDoc(doc(db, "ads", id), { views: 0, clicks: 0 });
        showPortalToast("تم تصفير إحصائيات الإعلان ✓");
      });
    });

    adsList.querySelectorAll("[data-delete-ad]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-delete-ad");
        if (!confirm("حذف هذا الإعلان نهائياً؟")) return;
        await deleteDoc(doc(db, "ads", id));
        showPortalToast("تم حذف الإعلان نهائياً");
      });
    });
  }
}

async function handleSaveCategory(e) {
  e.preventDefault();
  const editId = document.getElementById("cat-edit-id")?.value || "";
  const name = (document.getElementById("cat-name-input")?.value || "").trim();
  const subsRaw = document.getElementById("cat-subs-input")?.value || "";
  const order = Number(document.getElementById("cat-order-input")?.value || 1);
  const saveBtn = document.getElementById("save-category-btn");

  if (!name) return;
  const subcategories = subsRaw
    .split(/[،,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  setButtonLoading(saveBtn, true, "حفظ...");
  try {
    const docId = editId || `cat_${Date.now()}`;
    await setDoc(
      doc(db, "categories", docId),
      {
        id: docId,
        name,
        shortName: name,
        subcategories,
        order,
        visible: true
      },
      { merge: true }
    );
    document.getElementById("cat-edit-id").value = "";
    document.getElementById("cat-name-input").value = "";
    document.getElementById("cat-subs-input").value = "";
    document.getElementById("cancel-cat-edit-btn")?.classList.add("hidden");
    showPortalToast("تم حفظ القسم وتفرعاته ✓");
  } finally {
    setButtonLoading(saveBtn, false);
  }
}

function resetAdFormUI() {
  document.getElementById("ad-edit-id").value = "";
  document.getElementById("ad-title-input").value = "";
  document.getElementById("ad-sponsor-input").value = "";
  document.getElementById("ad-target-url").value = "";
  document.getElementById("ad-image-url").value = "";
  document.getElementById("ad-status-select").value = "active";
  document.getElementById("ad-form-heading").textContent =
    "إضافة إعلان جديد أو تعديل إعلان حالي";
  document.getElementById("save-ad-btn-label").textContent = "حفظ ونشر الإعلان";
  document.getElementById("cancel-ad-edit-btn")?.classList.add("hidden");
}

async function handleSaveAd(e) {
  e.preventDefault();
  const editId = document.getElementById("ad-edit-id")?.value || "";
  const title = (document.getElementById("ad-title-input")?.value || "").trim();
  const sponsorName = (document.getElementById("ad-sponsor-input")?.value || "").trim();
  const targetUrl = (document.getElementById("ad-target-url")?.value || "").trim();
  const imageUrl = (document.getElementById("ad-image-url")?.value || "").trim();
  const statusVal = document.getElementById("ad-status-select")?.value || "active";
  const saveBtn = document.getElementById("save-ad-btn");

  if (!title) return;
  setButtonLoading(saveBtn, true, "حفظ...");
  try {
    const isActive = statusVal !== "paused";
    const payload = {
      title,
      sponsorName: sponsorName || "حُجرية بريس",
      targetUrl: targetUrl || "#",
      imageUrl,
      active: isActive,
      status: isActive ? "active" : "paused",
      updatedAt: serverTimestamp()
    };

    if (editId) {
      await updateDoc(doc(db, "ads", editId), payload);
      showPortalToast("تم تحديث بيانات وحالة الإعلان ✓");
    } else {
      await addDoc(collection(db, "ads"), {
        ...payload,
        views: 0,
        clicks: 0,
        createdAt: serverTimestamp()
      });
      showPortalToast("تمت إضافة الحملة الإعلانية بنجاح ✓");
    }

    resetAdFormUI();
  } finally {
    setButtonLoading(saveBtn, false);
  }
}

// ==================== 15. ربط الأحداث، التنقل السفلي العائم، والمزامنة الحية ====================
function switchPortalTab(tabName) {
  state.activeTab = tabName;

  // تحديث حالة الأزرار في الشريط السفلي العائم وشريط التبديل الداخلي لبوابة الحساب والإعدادات
  document.querySelectorAll("[data-portal-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-portal-tab") === tabName);
  });

  // إظهار شريط التبديل السريع لبوابة الحساب والإعدادات والكادر
  const isAccountHubSection = ["profile", "settings", "staff"].includes(tabName);
  document
    .getElementById("account-hub-switcher")
    ?.classList.toggle("hidden", !isAccountHubSection);

  const views = {
    posts: document.getElementById("tab-view-posts"),
    notes: document.getElementById("tab-view-notes"),
    profile: document.getElementById("tab-view-profile"),
    staff: document.getElementById("tab-view-staff"),
    settings: document.getElementById("tab-view-settings")
  };

  Object.entries(views).forEach(([key, el]) => {
    if (el) el.classList.toggle("hidden", key !== tabName);
  });

  if (tabName === "profile") renderProfileTab();
  if (tabName === "settings") populateSovereignSettingsForm();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAllPortalViews() {
  if (!state.currentUser) return;
  renderPortalPostsAndStats();
  renderPersonalNotes();
  renderProfileTab();
  renderAdminReviewsAndStaff();
  renderCategoriesAndAdsManager();
}

function bindAllPortalEvents() {
  // الدخول القياسي ورمز PIN
  document
    .getElementById("standard-login-form")
    ?.addEventListener("submit", handleStandardLoginSubmit);

  document.getElementById("toggle-pass-visibility")?.addEventListener("click", () => {
    const passInp = document.getElementById("login-password");
    if (!passInp) return;
    passInp.type = passInp.type === "password" ? "text" : "password";
  });

  document.querySelectorAll("[data-pin-digit]").forEach((btn) => {
    btn.addEventListener("click", () =>
      handlePinDigitPress(btn.getAttribute("data-pin-digit"))
    );
  });

  document.getElementById("pin-clear-btn")?.addEventListener("click", () => {
    state.pinBuffer = "";
    updatePinDotsUI();
  });

  document.getElementById("pin-backspace-btn")?.addEventListener("click", () => {
    state.pinBuffer = state.pinBuffer.slice(0, -1);
    updatePinDotsUI();
  });

  document
    .getElementById("switch-to-password-btn")
    ?.addEventListener("click", showStandardLoginForm);

  // أزرار الهيدر والتنقل السفلي العائم وبوابة الحساب والإعدادات
  document
    .getElementById("header-profile-trigger")
    ?.addEventListener("click", () => switchPortalTab("profile"));
  document
    .getElementById("lock-pin-btn")
    ?.addEventListener("click", lockPortalToPinScreen);
  document
    .getElementById("logout-portal-btn")
    ?.addEventListener("click", logoutFromPortalCompletely);

  document.querySelectorAll("[data-portal-tab]").forEach((tabBtn) => {
    tabBtn.addEventListener("click", () =>
      switchPortalTab(tabBtn.getAttribute("data-portal-tab") || "posts")
    );
  });

  // أزرار النشر (+ نشر جديد) في منتصف الشريط السفلي
  const openPlusSheet = () => {
    document.getElementById("plus-quick-modal")?.classList.remove("hidden");
  };
  document
    .getElementById("center-plus-create-btn")
    ?.addEventListener("click", openPlusSheet);
  document
    .getElementById("floating-create-fab")
    ?.addEventListener("click", openPlusSheet);

  document.getElementById("close-plus-modal-btn")?.addEventListener("click", () => {
    document.getElementById("plus-quick-modal")?.classList.add("hidden");
  });

  document.querySelectorAll("[data-create-mode]").forEach((choiceBtn) => {
    choiceBtn.addEventListener("click", () => {
      const mode = choiceBtn.getAttribute("data-create-mode");
      document.getElementById("plus-quick-modal")?.classList.add("hidden");
      if (mode === "note") {
        switchPortalTab("notes");
        document.getElementById("note-editor-card")?.classList.remove("hidden");
        document.getElementById("note-title-input")?.focus();
      } else {
        openArticleEditorModal(mode, null, true);
      }
    });
  });

  // شريط استعادة المسودة التلقائية
  document
    .getElementById("resume-autosaved-draft-btn")
    ?.addEventListener("click", () => {
      openArticleEditorModal("standard", null, true);
    });

  document
    .getElementById("discard-autosaved-draft-btn")
    ?.addEventListener("click", () => {
      if (!confirm("هل تريد مسح المسودة المؤقتة والبدء بصفحة فارغة؟")) return;
      clearLocalAutosavedDraft();
      showPortalToast("تم مسح المسودة المؤقتة");
    });

  // القوائم المنسدلة (Accordions)
  document.querySelectorAll("[data-acc-toggle]").forEach((accBtn) => {
    accBtn.addEventListener("click", () => {
      const targetId = accBtn.getAttribute("data-acc-toggle");
      const body = document.getElementById(targetId);
      if (!body) return;
      const isHidden = body.classList.contains("hidden");
      body.classList.toggle("hidden", !isHidden);
      accBtn.classList.toggle("open", isHidden);
    });
  });

  // الفلاتر وكبسولة البحث الذكي الفوري في المنشورات
  document.querySelectorAll("[data-post-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.postFilter = chip.getAttribute("data-post-filter") || "all";
      document
        .querySelectorAll("[data-post-filter]")
        .forEach((c) => c.classList.toggle("active", c === chip));
      renderPortalPostsAndStats();
    });
  });

  const postsSearchInput = document.getElementById("posts-search-input");
  const clearPostsSearchBtn = document.getElementById("clear-posts-search-btn");

  postsSearchInput?.addEventListener("input", () => {
    const val = (postsSearchInput.value || "").trim();
    state.postSearchQuery = val;
    clearPostsSearchBtn?.classList.toggle("hidden", !val);
    renderPortalPostsAndStats();
  });

  clearPostsSearchBtn?.addEventListener("click", () => {
    if (postsSearchInput) {
      postsSearchInput.value = "";
      postsSearchInput.focus();
    }
    state.postSearchQuery = "";
    clearPostsSearchBtn.classList.add("hidden");
    renderPortalPostsAndStats();
  });

  // دفتر الملاحظات الشخصي
  document.getElementById("new-note-trigger-btn")?.addEventListener("click", () => {
    document.getElementById("note-edit-id").value = "";
    document.getElementById("note-title-input").value = "";
    document.getElementById("note-body-input").value = "";
    document.getElementById("note-editor-card")?.classList.remove("hidden");
  });

  document.getElementById("cancel-note-btn")?.addEventListener("click", () => {
    document.getElementById("note-editor-card")?.classList.add("hidden");
  });

  document
    .getElementById("note-editor-card")
    ?.addEventListener("submit", handleSavePersonalNote);

  // الملف الشخصي والأمان
  document
    .getElementById("profile-info-form")
    ?.addEventListener("submit", handleProfileInfoSubmit);
  document
    .getElementById("verification-request-form")
    ?.addEventListener("submit", handleVerificationRequestSubmit);
  document
    .getElementById("security-settings-form")
    ?.addEventListener("submit", handleSecuritySettingsSubmit);
  document
    .getElementById("revoke-trusted-device-btn")
    ?.addEventListener("click", revokeTrustedDevice);

  // الكادر
  document.getElementById("open-new-staff-form-btn")?.addEventListener("click", () => {
    openStaffEditorForMember(null);
  });
  document.getElementById("cancel-staff-form-btn")?.addEventListener("click", () => {
    document.getElementById("staff-editor-form")?.classList.add("hidden");
  });
  document
    .getElementById("staff-editor-form")
    ?.addEventListener("submit", handleSaveStaffMember);

  // الألوان والإعدادات السيادية والأقسام والإعلانات
  const colorWheel = document.getElementById("set-accent-color-wheel");
  const colorHex = document.getElementById("set-accent-color-hex");

  colorWheel?.addEventListener("input", () => {
    if (colorHex) colorHex.value = colorWheel.value;
    document.documentElement.style.setProperty("--brand-red", colorWheel.value);
  });

  colorHex?.addEventListener("input", () => {
    const val = colorHex.value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      if (colorWheel) colorWheel.value = val;
      document.documentElement.style.setProperty("--brand-red", val);
    }
  });

  document.querySelectorAll("[data-color-preset]").forEach((sw) => {
    sw.addEventListener("click", () => {
      const c = sw.getAttribute("data-color-preset") || DEFAULT_CRIMSON_COLOR;
      if (colorWheel) colorWheel.value = c;
      if (colorHex) colorHex.value = c;
      document.documentElement.style.setProperty("--brand-red", c);
    });
  });

  document.getElementById("set-logo-url")?.addEventListener("input", (e) => {
    const url = (e.target.value || "").trim();
    const wrap = document.getElementById("set-logo-preview-wrap");
    const img = document.getElementById("set-logo-preview-img");
    if (wrap && img) {
      if (url) {
        img.src = url;
        wrap.classList.remove("hidden");
      } else {
        wrap.classList.add("hidden");
      }
    }
  });

  document
    .getElementById("sovereign-settings-form")
    ?.addEventListener("submit", handleSaveSovereignSettings);

  document
    .getElementById("category-manager-form")
    ?.addEventListener("submit", handleSaveCategory);

  document.getElementById("cancel-cat-edit-btn")?.addEventListener("click", () => {
    document.getElementById("cat-edit-id").value = "";
    document.getElementById("cat-name-input").value = "";
    document.getElementById("cat-subs-input").value = "";
    document.getElementById("cancel-cat-edit-btn")?.classList.add("hidden");
  });

  document
    .getElementById("ad-manager-form")
    ?.addEventListener("submit", handleSaveAd);
  document
    .getElementById("cancel-ad-edit-btn")
    ?.addEventListener("click", resetAdFormUI);

  // أحداث المحرر الذكي: العدادات الحية + الحفظ التلقائي + الصور بين الفقرات + الروابط
  const titleInp = document.getElementById("post-title-input");
  const summaryInp = document.getElementById("post-summary-input");
  const richArea = document.getElementById("post-rich-content");

  titleInp?.addEventListener("input", () => {
    updateCharCounterUI(
      titleInp,
      document.getElementById("title-char-counter"),
      MAX_TITLE_CHARS,
      true
    );
    saveCurrentEditorToLocalCache();
  });

  summaryInp?.addEventListener("input", () => {
    updateCharCounterUI(
      summaryInp,
      document.getElementById("summary-char-counter"),
      MAX_SUMMARY_CHARS,
      false
    );
    saveCurrentEditorToLocalCache();
  });

  richArea?.addEventListener("input", () => {
    saveCurrentEditorToLocalCache();
  });

  const saveCursorSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && richArea?.contains(sel.anchorNode)) {
      state.savedSelectionRange = sel.getRangeAt(0);
    }
  };
  richArea?.addEventListener("keyup", saveCursorSelection);
  richArea?.addEventListener("mouseup", saveCursorSelection);

  [
    "post-subcategory-select",
    "post-image-url",
    "post-video-type",
    "post-video-url",
    "post-video-duration",
    "post-flag-featured",
    "post-flag-quick",
    "post-flag-breaking",
    "post-breaking-hours"
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", saveCurrentEditorToLocalCache);
    document.getElementById(id)?.addEventListener("input", saveCurrentEditorToLocalCache);
  });

  // أداة إدراج الصور المتعددة بين الفقرات
  document
    .getElementById("insert-inline-image-btn")
    ?.addEventListener("click", () => {
      saveCursorSelection();
      const box = document.getElementById("inline-image-inserter-box");
      box?.classList.toggle("hidden");
      if (!box?.classList.contains("hidden")) {
        document.getElementById("inline-img-url-input")?.focus();
      }
    });

  document
    .getElementById("close-inline-inserter-btn")
    ?.addEventListener("click", () => {
      document.getElementById("inline-image-inserter-box")?.classList.add("hidden");
    });

  document
    .getElementById("confirm-insert-inline-img-btn")
    ?.addEventListener("click", handleConfirmInsertInlineImage);

  // حقل البحث واقتراح الهاشتاجات المحفوظة (بحد أقصى 3 وسوم)
  const tagSearchInp = document.getElementById("post-tag-search-input");
  tagSearchInp?.addEventListener("focus", () => {
    renderTagSuggestionsDropdown(tagSearchInp.value);
  });

  tagSearchInp?.addEventListener("input", () => {
    const val = tagSearchInp.value;
    if (/[،,]/.test(val)) {
      const parts = val.split(/[،,]+/);
      parts.forEach((p) => {
        if (p.trim()) addTagToEditorSelection(p.trim());
      });
      return;
    }
    renderTagSuggestionsDropdown(val);
  });

  tagSearchInp?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (tagSearchInp.value.trim()) {
        addTagToEditorSelection(tagSearchInp.value.trim());
      }
    } else if (
      e.key === "Backspace" &&
      !tagSearchInp.value &&
      state.selectedEditorTags.length > 0
    ) {
      state.selectedEditorTags.pop();
      renderSelectedTagsUI();
      saveCurrentEditorToLocalCache();
    }
  });

  document.addEventListener("click", (e) => {
    const wrapper = document.querySelector(".tags-autocomplete-wrapper");
    if (wrapper && !wrapper.contains(e.target)) {
      document.getElementById("tags-autocomplete-dropdown")?.classList.add("hidden");
    }
  });

  // أزرار المحرر الذكي
  document.getElementById("clear-editor-fields-btn")?.addEventListener("click", () => {
    if (!confirm("هل تريد تفريغ جميع الحقول والبدء من جديد؟")) return;
    resetEditorFieldsCompletely();
    clearLocalAutosavedDraft();
    showPortalToast("تم تفريغ الحقول");
  });

  document.getElementById("close-article-editor-btn")?.addEventListener("click", () => {
    saveCurrentEditorToLocalCache();
    document.getElementById("article-editor-modal")?.classList.add("hidden");
  });

  document.getElementById("cancel-editor-modal-btn")?.addEventListener("click", () => {
    saveCurrentEditorToLocalCache();
    document.getElementById("article-editor-modal")?.classList.add("hidden");
  });

  document.getElementById("post-flag-breaking")?.addEventListener("change", (e) => {
    document
      .getElementById("breaking-duration-wrap")
      ?.classList.toggle("hidden", !e.target.checked);
  });

  document.getElementById("clear-post-image-btn")?.addEventListener("click", () => {
    document.getElementById("post-image-url").value = "";
    document.getElementById("post-image-preview-box")?.classList.add("hidden");
    saveCurrentEditorToLocalCache();
  });

  document.querySelectorAll("[data-rich-cmd]").forEach((cmdBtn) => {
    cmdBtn.addEventListener("click", () => {
      const cmd = cmdBtn.getAttribute("data-rich-cmd");
      richArea?.focus();
      if (cmd === "h2" || cmd === "h3" || cmd === "blockquote") {
        document.execCommand("formatBlock", false, cmd);
      } else {
        document.execCommand(cmd, false, null);
      }
      saveCurrentEditorToLocalCache();
    });
  });

  document
    .getElementById("insert-source-link-btn")
    ?.addEventListener("click", handleInsertSourceLink);

  document.getElementById("smart-post-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    savePostDataToFirestore("publish");
  });

  document.getElementById("save-cloud-draft-btn")?.addEventListener("click", () => {
    savePostDataToFirestore("draft");
  });

  // ربط جميع أزرار رفع الصور (بما فيها أداة رفع الصور بين الفقرات)
  bindImageFileUploader(
    "post-image-file",
    "post-image-url",
    "post-image-preview-box",
    "post-image-preview-img",
    false,
    () => saveCurrentEditorToLocalCache()
  );
  bindImageFileUploader(
    "inline-img-file-input",
    "inline-img-url-input",
    null,
    null,
    false,
    () => {
      showPortalToast("تم رفع الصورة! أضف وصفاً إن أردت ثم اضغط (إدراج بالمقال) ✓");
    }
  );
  bindImageFileUploader("prof-avatar-file", "prof-avatar-url", null, null, true);
  bindImageFileUploader("ver-doc-file", "ver-doc-url", null, null, false);
  bindImageFileUploader(
    "set-logo-file",
    "set-logo-url",
    "set-logo-preview-wrap",
    "set-logo-preview-img",
    true
  );
  bindImageFileUploader("set-default-post-file", "set-default-post-img", null, null, false);
  bindImageFileUploader("set-favicon-file", "set-favicon-url", null, null, true);
  bindImageFileUploader("ad-image-file", "ad-image-url", null, null, true);
}

function startPortalRealtimeSync() {
  onSnapshot(doc(db, "settings", "general"), (snap) => {
    if (snap.exists()) {
      state.settings = { ...state.settings, ...snap.data() };
      applyPortalIdentityAndPermissions();
      if (state.activeTab === "settings") populateSovereignSettingsForm();
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
            getCleanCategoryLabel(m.name) === getCleanCategoryLabel(cat.name)
        );
        if (idx >= 0) merged[idx] = { ...merged[idx], ...cat };
        else merged.push(cat);
      });
      state.compasses = merged;
    }
    renderCategoriesAndAdsManager();
  });

  let initialAuthChecked = false;
  onSnapshot(collection(db, "staff"), (snap) => {
    state.staff = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (state.currentUser) {
      const updatedMe = state.staff.find((s) => s.id === state.currentUser.id);
      if (updatedMe) {
        if (updatedMe.suspended && !isMasterAdminUser(updatedMe)) {
          logoutFromPortalCompletely();
          showPortalToast("تم إيقاف صلاحيات الحساب من قِبل الإدارة");
          return;
        }
        state.currentUser = updatedMe;
        localStorage.setItem(CACHED_USER_STORAGE_KEY, JSON.stringify(updatedMe));
        applyPortalIdentityAndPermissions();
      }
    }

    if (!initialAuthChecked) {
      initialAuthChecked = true;
      checkTrustedDeviceOrSessionAfterCloudSync();
    }

    renderAdminReviewsAndStaff();
  });

  onSnapshot(collection(db, "posts"), (snap) => {
    state.posts = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => getItemTimestampMs(b) - getItemTimestampMs(a));
    renderPortalPostsAndStats();
    renderAdminReviewsAndStaff();
  });

  onSnapshot(collection(db, "notes"), (snap) => {
    state.notes = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => getItemTimestampMs(b) - getItemTimestampMs(a));
    renderPersonalNotes();
  });

  onSnapshot(collection(db, "staff_requests"), (snap) => {
    state.staffRequests = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => getItemTimestampMs(b) - getItemTimestampMs(a));
    renderAdminReviewsAndStaff();
    if (state.activeTab === "profile") renderProfileTab();
  });

  onSnapshot(collection(db, "ads"), (snap) => {
    state.ads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderCategoriesAndAdsManager();
  });
}

// ==================== 16. نقطة انطلاق البوابة التحريرية الذكية ====================
document.addEventListener("DOMContentLoaded", async () => {
  bindAllPortalEvents();
  // تشغيل الفحص اللحظي للجلسة قبل انتظار الشبكة لمنع وميض تسجيل الدخول نهائياً
  bootstrapInstantAuthStateOnLoad();
  startPortalRealtimeSync();
  await ensureMasterAdminSeeded();
});
