/* ==========================================================================
   حُجرية بريس (Hujariya Press) — المحرك البرمجي الشامل لغرفة الأخبار (admin-app.js)
   [الجزء الأول من 2]:
   - التهيئة السحابية (Firebase Firestore) + التخزين المؤقت السريع للإنترنت الضعيف
   - نظام الهوية الصحفية الثابتة (HP#####) + الحساب التلقائي للعمر من تاريخ الميلاد
   - بوابة الدخول الذكية (باسم المستخدم، البريد، الهوية الصحفية HP، أو رمز PIN السريع)
   - محرك ميثاق الشرف الصحفي والتوقيع الرقمي الحي (3 توقيعات لأول مرة / توقيع واحد غير معطل للتحديثات)
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

// مفاتيح التخزين المحلي السريع (لتسريع غرفة الأخبار وحفظ المسودات)
const NR_SESSION_KEY = "hujariya_nr_session_v4";
const NR_CACHE_KEY = "hujariya_nr_fast_cache_v4";
const NR_AUTOSAVE_KEY = "hujariya_nr_studio_autosave_v4";
const DEFAULT_CRIMSON = "#b80d38";

// الأقسام الافتراضية المعتمدة للمنصة
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

// النص الافتراضي لميثاق الشرف الصحفي (قابل للتعديل في أي وقت من إعدادات الأدمن)
const DEFAULT_CHARTER_HTML = `
  <h3>أولاً: الالتزام المهني والأخلاقي</h3>
  <p>يلتزم الصحفي والكاتب في منصة <strong>حُجرية بريس (Hujariya Press)</strong> بتحري الدقة والمصداقية التامة، والتأكد من صحة الأخبار والمعلومات من مصادرها الموثوقة قبل صياغتها أو نشرها.</p>
  <h3>ثانياً: الثوابت الوطنية والمسؤولية القانونية</h3>
  <p>يلتزم العضو باحترام الثوابت الوطنية، والامتناع التام عن نشر الشائعات أو المواد المحرضة أو المنتهكة لحقوق الملكية الفكرية، ويتحمل المسؤولية القانونية والأدبية الكاملة عن صحة البيانات والوثائق المرفقة في ملف هويته الصحفية.</p>
  <h3>ثالثاً: سرية غرفة الأخبار</h3>
  <p>تُعد بيانات الدخول والهوية الصحفية (HP) عهدة شخصية لا يجوز مشاركتها مع أي طرف خارجي، ويُعد التوقيع الرقمي أدناه إقراراً رسمياً ملزماً بجميع بنود هذا الميثاق وتحديثاته.</p>
`;

// حساب المدير العام الافتراضي (لضمان الدخول دائماً حتى قبل تهيئة الكادر)
const MASTER_ADMIN_FALLBACK = {
  id: "master-admin",
  pressId: "HP10001",
  name: "رئيس التحرير — الإدارة العامة",
  username: "admin",
  email: "admin@hujariyapress.rawi-ye.com",
  password: "admin",
  pinCode: "0000",
  jobTitle: "رئيس التحرير والمدير العام",
  role: "admin",
  isMasterAdmin: true,
  verified: true,
  directPublish: true,
  signatureStatus: "approved",
  signedCharterVersion: 1
};

// ==================== 2. الحالة العامة لغرفة الأخبار (State) ====================
const state = {
  currentUser: null,
  settings: {
    siteName: "حُجرية بريس",
    siteDescription: "منصة إخبارية وتحليلية شاملة تندرج تحت مظلة مؤسسة RAWI-YE.COM الإعلامية الرقمية.",
    accentColor: DEFAULT_CRIMSON,
    logoUrl: "",
    defaultPostImageUrl: "",
    charterHtml: DEFAULT_CHARTER_HTML,
    charterVersion: 1,
    masterUsername: "admin",
    masterPassword: "admin",
    masterPin: "0000"
  },
  compasses: structuredClone(DEFAULT_COMPASSES),
  posts: [],
  staff: [],
  activeView: "view-dashboard",
  studioStep: 1,
  editingPostId: null,
  studioMainImageData: "",
  // حالة التوقيع على الميثاق (3 مرات لأول مرة، أو مرة واحدة للتحديث)
  pledgeMode: "first_time", // "first_time" | "update"
  pledgeRequiredCount: 3,
  pledgeCollectedSignatures: [],
  isDrawingSignature: false,
  hasStrokeOnCurrentCanvas: false,
  selectedDossierStaffId: null
};

// ==================== 3. الدوال المساعدة وحساب العمر والهوية الصحفية ====================
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

function showAdminToast(message) {
  const toast = document.getElementById("admin-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(window.__nrToastTimer);
  window.__nrToastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3400);
}

function getTimestampMs(docObj) {
  if (!docObj) return 0;
  const t = docObj.createdAt || docObj.updatedAt || docObj.signedAt || docObj.kycSubmittedAt;
  if (!t) return 0;
  if (typeof t.toMillis === "function") return t.toMillis();
  if (typeof t.seconds === "number") return t.seconds * 1000;
  const parsed = new Date(t).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

function formatArabicDateTime(msOrObj) {
  const ms = typeof msOrObj === "number" ? msOrObj : getTimestampMs(msOrObj);
  if (!ms) return "منذ قليل";
  return new Date(ms).toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// حساب العمر تلقائياً وبدقة من تاريخ الميلاد (يتحدث تلقائياً مع الزمن)
function calculateAgeFromDob(dobString) {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 && age < 120 ? age : null;
}

// توليد هوية صحفية ثابتة ومميزة بصيغة HP متبوعة بـ 5 أرقام بدون شرطة (مثال: HP10042)
function generateUniquePressId(existingStaffList = []) {
  const usedIds = new Set(
    existingStaffList
      .map((s) => String(s.pressId || "").toUpperCase().replace(/[^A-Z0-9]/g, ""))
      .filter(Boolean)
  );
  usedIds.add("HP10001");

  // نبدأ من أرقام مميزة ومتسلسلة أو عشوائية منظمة من 5 خانات
  let baseNum = 10010 + existingStaffList.length * 7;
  while (usedIds.has(`HP${baseNum}`)) {
    baseNum += Math.floor(Math.random() * 9) + 1;
  }
  return `HP${String(baseNum).slice(0, 5).padStart(5, "1")}`;
}

function normalizePressId(raw = "") {
  const cleaned = String(raw || "")
    .toUpperCase()
    .replace(/[\s\-_]/g, "");
  return cleaned;
}

function isUserAdmin(user) {
  if (!user) return false;
  return Boolean(user.isMasterAdmin || user.role === "admin" || user.role === "editor_in_chief");
}

// ضغط الصور في المتصفح لتحويلها إلى WebP خفيف وسريع جداً يناسب الإنترنت الضعيف
function compressImageFileToDataUrl(file, maxWidth = 1100, quality = 0.78) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / (img.width || maxWidth));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round((img.width || maxWidth) * scale);
        canvas.height = Math.round((img.height || maxWidth) * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const webpData = canvas.toDataURL("image/webp", quality);
        resolve(webpData);
      };
      img.onerror = () => reject(new Error("تعذر قراءة الصورة"));
      img.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error("فشل تحميل الملف"));
    reader.readAsDataURL(file);
  });
}

// ==================== 4. التخزين المؤقت السريع لغرفة الأخبار (Fast Local Cache) ====================
function saveNewsroomCache() {
  try {
    const payload = {
      savedAt: Date.now(),
      settings: state.settings,
      compasses: state.compasses,
      posts: state.posts.slice(0, 80),
      staff: state.staff
    };
    localStorage.setItem(NR_CACHE_KEY, JSON.stringify(payload));
  } catch (_) {}
}

function restoreNewsroomCache() {
  try {
    const raw = localStorage.getItem(NR_CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed) return false;

    if (parsed.settings) state.settings = { ...state.settings, ...parsed.settings };
    if (Array.isArray(parsed.compasses) && parsed.compasses.length) {
      state.compasses = parsed.compasses;
    }
    if (Array.isArray(parsed.posts)) state.posts = parsed.posts;
    if (Array.isArray(parsed.staff)) state.staff = parsed.staff;
    return true;
  } catch (_) {
    return false;
  }
}

// ==================== 5. حقن الواجهات المكملة (بوابة الدخول، الدوسيه، الإعدادات، والحقول الإضافية) ====================
function injectEnhancedNewsroomShell() {
  // 1. حقن تنسيقات إضافية دقيقة للعناصر المكملة بنفس الهوية القرمزية وأسلوب الجزيرة
  const extraStyle = document.createElement("style");
  extraStyle.textContent = `
    .nr-auth-gate {
      position: fixed; inset: 0; background: linear-gradient(135deg, #0c0d0e 0%, #1a060c 100%);
      z-index: 12000; display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .nr-auth-card {
      background: #ffffff; width: 100%; max-width: 440px; border-radius: 14px;
      border-top: 5px solid var(--brand-red); padding: 30px 26px; box-shadow: 0 20px 50px rgba(0,0,0,0.45);
    }
    .nr-auth-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0 20px; background: var(--bg-page); padding: 5px; border-radius: 8px; }
    .nr-auth-tab { border: none; background: transparent; padding: 8px; font-weight: 800; border-radius: 6px; cursor: pointer; color: var(--text-muted); }
    .nr-auth-tab.active { background: var(--brand-red); color: #fff; }
    .nr-user-chip { display: inline-flex; align-items: center; gap: 8px; background: var(--bg-page); border: 1px solid var(--border-light); padding: 5px 12px; border-radius: 99px; font-size: 0.82rem; font-weight: 800; }
    .nr-article-row {
      background: #ffffff; border: 1px solid var(--border-light); border-right: 4px solid var(--brand-red);
      border-radius: 10px; padding: 16px 18px; margin-bottom: 12px; display: flex; align-items: center;
      justify-content: space-between; gap: 14px; flex-wrap: wrap; box-shadow: var(--shadow-sm);
    }
    .nr-status-pill { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 99px; font-size: 0.76rem; font-weight: 800; }
    .status-published { background: #dcfce7; color: #15803d; }
    .status-pending { background: #fef9c3; color: #a16207; }
    .status-draft { background: #e2e8f0; color: #334155; }
    .status-rejected { background: #fee2e2; color: #b91c1c; }
    .staff-grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 18px; }
    .staff-card-item {
      background: #ffffff; border: 1px solid var(--border-light); border-radius: 12px; padding: 18px;
      cursor: pointer; transition: all 0.2s ease; box-shadow: var(--shadow-sm); position: relative;
    }
    .staff-card-item:hover { border-color: var(--brand-red); transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .dossier-overlay {
      position: fixed; inset: 0; background: rgba(12,13,14,0.75); backdrop-filter: blur(5px);
      z-index: 9500; display: flex; align-items: center; justify-content: center; padding: 18px;
    }
    .dossier-modal {
      background: #ffffff; width: 100%; max-width: 880px; max-height: 90vh; overflow-y: auto;
      border-radius: 14px; border-top: 5px solid var(--brand-red); padding: 26px; box-shadow: var(--shadow-lg);
    }
    .contact-action-btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px;
      font-size: 0.84rem; font-weight: 800; text-decoration: none; border: 1px solid var(--border-dark);
    }
    .wa-btn { background: #dcfce7; color: #15803d; border-color: #86efac; }
    .mail-btn { background: var(--crimson-soft); color: var(--brand-red); border-color: rgba(184,13,56,0.25); }
    .sig-preview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 10px; }
    .sig-preview-box { background: #f8fafc; border: 1px dashed var(--border-dark); border-radius: 8px; padding: 8px; text-align: center; }
    .sig-preview-box img { max-height: 90px; width: auto; margin: 0 auto; object-fit: contain; }
    .pledge-Banner-notice {
      background: #fff1f2; border: 1px solid #fecdd3; border-right: 4px solid var(--brand-red);
      padding: 12px 18px; border-radius: 8px; margin-bottom: 18px; display: flex; align-items: center;
      justify-content: space-between; gap: 12px; flex-wrap: wrap; font-weight: 800; font-size: 0.88rem;
    }
  `;
  document.head.appendChild(extraStyle);

  // 2. إضافة زر "الإعدادات والميثاق" للأدمن + زر تسجيل الخروج في الهيدر
  const mainNav = document.getElementById("main-admin-nav");
  if (mainNav && !document.getElementById("nav-settings-btn")) {
    const settingsBtn = document.createElement("button");
    settingsBtn.type = "button";
    settingsBtn.id = "nav-settings-btn";
    settingsBtn.className = "nav-btn hidden";
    settingsBtn.setAttribute("data-target-view", "view-settings");
    settingsBtn.innerHTML = `
      <span class="material-symbols-rounded">settings</span>
      <span class="nav-label">الإعدادات والميثاق</span>
    `;
    mainNav.appendChild(settingsBtn);

    const logoutBtn = document.createElement("button");
    logoutBtn.type = "button";
    logoutBtn.id = "nr-logout-btn";
    logoutBtn.className = "nav-btn";
    logoutBtn.title = "تسجيل الخروج";
    logoutBtn.innerHTML = `
      <span class="material-symbols-rounded" style="color:var(--brand-red);">logout</span>
      <span class="nav-label">خروج</span>
    `;
    mainNav.appendChild(logoutBtn);
  }

  // 3. حقن شريط التنبيه غير المعطل لتحديث الميثاق أعلى مساحة العمل
  const workspace = document.querySelector(".newsroom-workspace");
  if (workspace && !document.getElementById("charter-update-banner")) {
    const banner = document.createElement("div");
    banner.id = "charter-update-banner";
    banner.className = "pledge-Banner-notice hidden";
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="material-symbols-rounded" style="color:var(--brand-red);">gavel</span>
        <span id="charter-banner-msg">تم تحديث ميثاق الشرف الصحفي للمنصة. يرجى قراءته والتوقيع عليه (عملك ونشرك مستمر دون توقف).</span>
      </div>
      <button type="button" id="open-charter-from-banner-btn" class="btn-primary" style="padding:7px 14px;font-size:0.82rem;">
        قراءة وتوقيع التحديث
      </button>
    `;
    workspace.prepend(banner);
  }

  // 4. توسيع الخطوة 1 والخطوة 2 في استديو صياغة الأخبار لتشمل خيارات العاجل والفيديو ورابط الصورة
  const step1 = document.getElementById("studio-step-1");
  if (step1 && !document.getElementById("post-flags-row")) {
    const flagsDiv = document.createElement("div");
    flagsDiv.id = "post-flags-row";
    flagsDiv.className = "form-group";
    flagsDiv.innerHTML = `
      <label>نوع المادة الصحفية وأولوية الظهور</label>
      <div style="display:flex;flex-wrap:wrap;gap:14px;background:var(--bg-page);padding:12px 14px;border-radius:8px;border:1px solid var(--border-light);">
        <label style="display:inline-flex;align-items:center;gap:6px;margin:0;cursor:pointer;">
          <input type="checkbox" id="post-is-breaking"> 🚨 خبر عاجل (شريط العاجل)
        </label>
        <label style="display:inline-flex;align-items:center;gap:6px;margin:0;cursor:pointer;">
          <input type="checkbox" id="post-is-featured"> ⭐ تغطية رئيسية (الواجهة الكبرى)
        </label>
        <label style="display:inline-flex;align-items:center;gap:6px;margin:0;cursor:pointer;">
          <input type="checkbox" id="post-is-quick"> ⚡ موجز النبض السريع
        </label>
      </div>
    `;
    step1.insertBefore(flagsDiv, step1.querySelector(".step-actions"));
  }

  const step2 = document.getElementById("studio-step-2");
  if (step2 && !document.getElementById("post-image-url-input")) {
    const mediaExtra = document.createElement("div");
    mediaExtra.innerHTML = `
      <div class="form-group">
        <label for="post-image-url-input">أو ضع رابط صورة مباشر (اختياري إذا لم ترفع ملفاً)</label>
        <input type="url" id="post-image-url-input" class="form-input" placeholder="https://..." dir="ltr">
        <div id="studio-main-img-preview" class="hidden" style="margin-top:10px;"></div>
      </div>
      <div class="form-row-2">
        <div class="form-group">
          <label for="post-video-url">رابط فيديو (يوتيوب / Shorts / MP4 - اختياري)</label>
          <input type="url" id="post-video-url" class="form-input" placeholder="https://www.youtube.com/watch?v=..." dir="ltr">
        </div>
        <div class="form-group">
          <label for="post-video-type">نمط عرض الفيديو</label>
          <select id="post-video-type" class="form-select">
            <option value="none">بدون فيديو</option>
            <option value="standard">فيديو عريض (16:9)</option>
            <option value="short_vertical">فيديو قصير عمودي (9:16 Reels/Shorts)</option>
          </select>
        </div>
      </div>
    `;
    step2.insertBefore(mediaExtra, step2.querySelector(".step-actions"));
  }

  // 5. إضافة حقل "تاريخ إصدار الهوية" + "العمر المحسوب تلقائياً" في نموذج التوثيق (KYC)
  const kycDobInput = document.getElementById("kyc-dob");
  if (kycDobInput && !document.getElementById("kyc-issue-date")) {
    const parentRow = kycDobInput.closest(".form-row-2");
    if (parentRow) {
      const issueRow = document.createElement("div");
      issueRow.className = "form-row-2";
      issueRow.innerHTML = `
        <div class="form-group">
          <label for="kyc-issue-date">تاريخ إصدار الوثيقة (كما في البطاقة/الجواز)</label>
          <input type="date" id="kyc-issue-date" class="form-input">
        </div>
        <div class="form-group">
          <label>العمر المحسوب تلقائياً (يتحدث آلياً مع الزمن)</label>
          <div id="kyc-auto-age-display" style="height:46px;display:flex;align-items:center;padding:0 14px;background:var(--crimson-soft);color:var(--brand-red);font-weight:900;border-radius:8px;border:1px solid rgba(184,13,56,0.22);">
            أدخل تاريخ الميلاد لحساب العمر تلقائياً
          </div>
        </div>
      `;
      parentRow.insertAdjacentElement("afterend", issueRow);
    }
  }

  // إضافة أزرار التواصل المباشر وعرض العمر في بطاقة الهوية الشخصية
  const idCardBody = document.querySelector(".id-card-body");
  if (idCardBody && !document.getElementById("my-auto-age-badge")) {
    const ageBadge = document.createElement("div");
    ageBadge.id = "my-auto-age-badge";
    ageBadge.style.cssText = "margin-top:10px;font-size:0.85rem;font-weight:800;color:var(--text-body);";
    ageBadge.textContent = "العمر: غير محدد";
    idCardBody.appendChild(ageBadge);
  }

  // إضافة زر "إضافة صحفي جديد" في شاشة الكادر للأدمن
  const staffView = document.getElementById("view-staff");
  if (staffView && !document.getElementById("open-add-staff-modal-btn")) {
    const header = staffView.querySelector(".aj-block-header");
    if (header) {
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.id = "open-add-staff-modal-btn";
      addBtn.className = "btn-primary";
      addBtn.style.cssText = "margin-right:auto;padding:8px 16px;font-size:0.85rem;";
      addBtn.innerHTML = `<span class="material-symbols-rounded">person_add</span> إضافة صحفي وتوليد هوية HP`;
      header.appendChild(addBtn);
    }
  }

  // 6. حقن واجهة "إعدادات المنصة وميثاق الشرف" للأدمن
  if (workspace && !document.getElementById("view-settings")) {
    const settingsSection = document.createElement("section");
    settingsSection.id = "view-settings";
    settingsSection.className = "nr-view hidden";
    settingsSection.innerHTML = `
      <div class="studio-wrapper">
        <div class="aj-block-header">
          <span class="aj-crimson-pillar"></span>
          <h2>إعدادات المنصة وإدارة ميثاق الشرف الصحفي</h2>
        </div>

        <form id="platform-settings-form">
          <div class="form-row-2">
            <div class="form-group">
              <label for="set-site-name">اسم المنصة الإخبارية</label>
              <input type="text" id="set-site-name" class="form-input" placeholder="حُجرية بريس">
            </div>
            <div class="form-group">
              <label for="set-logo-url">رابط الشعار الرسمي (PNG مفرغ)</label>
              <input type="url" id="set-logo-url" class="form-input" dir="ltr" placeholder="https://...">
            </div>
          </div>

          <div class="form-group">
            <label for="set-site-desc">الوصف التعريفي للمنصة (SEO Description)</label>
            <textarea id="set-site-desc" class="form-textarea" rows="2"></textarea>
          </div>

          <div class="aj-block-header" style="margin-top:28px;">
            <span class="aj-crimson-pillar"></span>
            <h3>نص ميثاق الشرف الصحفي (الإصدار الحالي: <span id="current-charter-ver-label">1</span>)</h3>
          </div>
          <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:10px;font-weight:700;">
            يمكنك تعديل بنود ميثاق الشرف الصحفي هنا. إذا قمت بتفعيل خيار (إشعار جميع الكتّاب بالتحديث)، سيُطلب من جميع الصحفيين المعتمدين التوقيع على النسخة الجديدة دون أن يتوقف عملهم أو نشرهم.
          </p>
          <div class="form-group">
            <textarea id="set-charter-html" class="form-textarea" rows="8" placeholder="اكتب بنود ميثاق الشرف الصحفي هنا..."></textarea>
          </div>
          <div class="form-group" style="background:#fff1f2;padding:12px 14px;border-radius:8px;border:1px solid #fecdd3;">
            <label style="display:flex;align-items:center;gap:8px;margin:0;cursor:pointer;color:var(--brand-red);">
              <input type="checkbox" id="bump-charter-version-chk">
              <strong>تحديث إصدار الميثاق وإرسال تنبيه توقيع جديد لكافة الصحفيين في الكادر</strong>
            </label>
          </div>

          <div class="step-actions justify-end">
            <button type="submit" class="btn-primary">
              <span class="material-symbols-rounded">save</span> حفظ الإعدادات والميثاق
            </button>
          </div>
        </form>
      </div>
    `;
    workspace.appendChild(settingsSection);
  }

  // 7. تعديل نافذة الميثاق لدعم عداد الـ 3 توقيعات + زر الإغلاق المؤقت عند التحديث
  const pledgeHeader = document.querySelector(".pledge-header");
  if (pledgeHeader && !document.getElementById("pledge-step-badge")) {
    const badge = document.createElement("span");
    badge.id = "pledge-step-badge";
    badge.style.cssText = "margin-right:auto;background:var(--crimson-soft);color:var(--brand-red);padding:4px 12px;border-radius:99px;font-size:0.8rem;font-weight:900;";
    badge.textContent = "التوقيع 1 من 3";
    pledgeHeader.appendChild(badge);

    const closeUpdateBtn = document.createElement("button");
    closeUpdateBtn.type = "button";
    closeUpdateBtn.id = "postpone-pledge-update-btn";
    closeUpdateBtn.className = "btn-secondary hidden";
    closeUpdateBtn.style.cssText = "padding:5px 10px;font-size:0.78rem;";
    closeUpdateBtn.textContent = "تأجيل مؤقت (لدي خبر عاجل)";
    pledgeHeader.appendChild(closeUpdateBtn);
  }

  // 8. حقن نافذة الملف الشخصي الشامل للصحفي (Dossier Modal) + نافذة إضافة صحفي جديد + بوابة تسجيل الدخول
  const modalsWrapper = document.createElement("div");
  modalsWrapper.innerHTML = `
    <!-- بوابة تسجيل الدخول لغرفة الأخبار -->
    <div id="nr-login-gate" class="nr-auth-gate hidden">
      <div class="nr-auth-card">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <span class="aj-crimson-pillar"></span>
          <h2 style="font-size:1.35rem;font-weight:900;">غرفة الأخبار — حُجرية بريس</h2>
        </div>
        <p style="font-size:0.84rem;color:var(--text-muted);font-weight:700;">
          سجل دخولك بواسطة الهوية الصحفية (مثال: HP10042) أو اسم المستخدم أو البريد الإلكتروني
        </p>

        <div class="nr-auth-tabs">
          <button type="button" class="nr-auth-tab active" id="tab-auth-standard">دخول بالهوية / المعرف</button>
          <button type="button" class="nr-auth-tab" id="tab-auth-pin">دخول سريع (PIN)</button>
        </div>

        <form id="nr-standard-login-form">
          <div class="form-group">
            <label for="login-identifier">الهوية الصحفية (HP) أو اسم المستخدم أو البريد</label>
            <input type="text" id="login-identifier" class="form-input" required placeholder="مثال: HP10042 أو admin" autocomplete="username">
          </div>
          <div class="form-group">
            <label for="login-password">كلمة المرور</label>
            <input type="password" id="login-password" class="form-input" required placeholder="••••••••" autocomplete="current-password">
          </div>
          <button type="submit" class="btn-primary" style="width:100%;justify-content:center;">
            <span class="material-symbols-rounded">login</span> دخول إلى غرفة الأخبار
          </button>
        </form>

        <form id="nr-pin-login-form" class="hidden">
          <div class="form-group">
            <label for="login-pin-input">رمز الدخول السريع (PIN)</label>
            <input type="password" id="login-pin-input" class="form-input" maxlength="8" placeholder="••••" dir="ltr" style="text-align:center;font-size:1.4rem;letter-spacing:6px;">
          </div>
          <button type="submit" class="btn-primary" style="width:100%;justify-content:center;">
            <span class="material-symbols-rounded">bolt</span> دخول فوري
          </button>
        </form>
      </div>
    </div>

    <!-- نافذة الملف الشخصي الشامل للصحفي (The Author Dossier) -->
    <div id="author-dossier-overlay" class="dossier-overlay hidden">
      <div class="dossier-modal">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid var(--border-light);padding-bottom:14px;margin-bottom:18px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="aj-crimson-pillar"></span>
            <h2 id="dossier-modal-title" style="font-size:1.25rem;font-weight:900;">الملف الشخصي الشامل للصحفي</h2>
          </div>
          <button type="button" id="close-dossier-modal-btn" class="btn-secondary" style="padding:6px 14px;">إغلاق ✕</button>
        </div>
        <div id="dossier-modal-body"></div>
      </div>
    </div>

    <!-- نافذة إضافة صحفي جديد للكادر -->
    <div id="add-staff-overlay" class="dossier-overlay hidden">
      <div class="dossier-modal" style="max-width:560px;">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-light);padding-bottom:12px;margin-bottom:16px;">
          <h3 style="font-weight:900;">إضافة صحفي جديد وتوليد هوية صحفية (HP)</h3>
          <button type="button" id="close-add-staff-btn" class="btn-secondary" style="padding:5px 12px;">إغلاق</button>
        </div>
        <form id="add-staff-form">
          <div class="form-row-2">
            <div class="form-group">
              <label>الاسم الصحفي الكامل</label>
              <input type="text" id="new-staff-name" class="form-input" required placeholder="مثال: أ. محمد الحميري">
            </div>
            <div class="form-group">
              <label>المسمى الوظيفي</label>
              <input type="text" id="new-staff-job" class="form-input" placeholder="محرر صحفي / كاتب رأي">
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label>اسم المستخدم للدخول</label>
              <input type="text" id="new-staff-username" class="form-input" required dir="ltr" placeholder="mohammed">
            </div>
            <div class="form-group">
              <label>كلمة المرور المبدئية</label>
              <input type="text" id="new-staff-password" class="form-input" required dir="ltr" placeholder="123456">
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label>رمز الدخول السريع (PIN - اختياري)</label>
              <input type="text" id="new-staff-pin" class="form-input" dir="ltr" maxlength="6" placeholder="1122">
            </div>
            <div class="form-group">
              <label>الصلاحية التحريرية</label>
              <select id="new-staff-role" class="form-select">
                <option value="writer">صحفي / كاتب (يخضع للمراجعة)</option>
                <option value="trusted_writer">صحفي معتمد (نشر مباشر)</option>
                <option value="admin">مدير تحرير / أدمن</option>
              </select>
            </div>
          </div>
          <div class="step-actions justify-end">
            <button type="submit" class="btn-primary">إنشاء الحساب وتوليد الهوية الصحفية</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(modalsWrapper);
}

// ==================== 6. نظام المصادقة والدخول بالهوية الصحفية (HP#####) ====================
async function ensureAllStaffHavePressIds() {
  for (const member of state.staff) {
    const cleanId = normalizePressId(member.pressId || "");
    if (!cleanId.startsWith("HP") || cleanId.length < 6) {
      const newPressId = generateUniquePressId(state.staff);
      member.pressId = newPressId;
      if (member.id && member.id !== "master-admin") {
        updateDoc(doc(db, "staff", member.id), { pressId: newPressId }).catch(() => {});
      }
    }
  }
}

function authenticateCredentials(identifierRaw, passwordRaw) {
  const idClean = String(identifierRaw || "").trim().toLowerCase();
  const pressIdCandidate = normalizePressId(identifierRaw);
  const passClean = String(passwordRaw || "").trim();

  // 1. التحقق من حساب المدير العام
  const masterUser = String(state.settings.masterUsername || "admin").toLowerCase();
  const masterPass = String(state.settings.masterPassword || "admin");
  if (
    (idClean === masterUser || pressIdCandidate === "HP10001") &&
    passClean === masterPass
  ) {
    return { ...MASTER_ADMIN_FALLBACK };
  }

  // 2. البحث في قائمة الكادر (بالهوية الصحفية HP10042 أو اسم المستخدم أو البريد الإلكتروني)
  const matched = state.staff.find((s) => {
    const sUser = String(s.username || "").trim().toLowerCase();
    const sEmail = String(s.email || s.contactEmail || "").trim().toLowerCase();
    const sPressId = normalizePressId(s.pressId || "");
    const idMatches =
      (idClean && (sUser === idClean || sEmail === idClean)) ||
      (pressIdCandidate && sPressId === pressIdCandidate);
    return idMatches && String(s.password || "").trim() === passClean;
  });

  return matched || null;
}

function authenticateByPin(pinRaw) {
  const pin = String(pinRaw || "").trim();
  if (!pin) return null;

  if (pin === String(state.settings.masterPin || "0000").trim()) {
    return { ...MASTER_ADMIN_FALLBACK };
  }

  return (
    state.staff.find((s) => String(s.pinCode || s.pin || "").trim() === pin) || null
  );
}

function setLoggedInUser(userObj) {
  if (userObj.accountStatus === "frozen") {
    showAdminToast("عذراً، هذا الحساب موقوف مؤقتاً من قِبل الإدارة.");
    return;
  }

  state.currentUser = userObj;
  localStorage.setItem(NR_SESSION_KEY, JSON.stringify({ id: userObj.id, pressId: userObj.pressId }));

  document.getElementById("nr-login-gate")?.classList.add("hidden");

  // إظهار أزرار المراجعات والكادر والإعدادات للأدمن فقط (حماية نفسيات الكتّاب العاديين)
  const adminFlag = isUserAdmin(userObj);
  document.getElementById("nav-reviews-btn")?.classList.toggle("hidden", !adminFlag);
  document.getElementById("nav-staff-btn")?.classList.toggle("hidden", !adminFlag);
  document.getElementById("nav-settings-btn")?.classList.toggle("hidden", !adminFlag);

  // فحص حالة ميثاق الشرف والتوقيع الرقمي
  evaluateCharterPledgeRequirement();

  // تحديث البيانات المعروضة في اللوحة والملف الشخصي
  if (typeof renderDashboardAndMyArticles === "function") renderDashboardAndMyArticles();
  if (typeof populateMyProfileView === "function") populateMyProfileView();
  if (adminFlag && typeof renderAdminReviewsAndStaff === "function") {
    renderAdminReviewsAndStaff();
  }
}

function handleLogout() {
  state.currentUser = null;
  localStorage.removeItem(NR_SESSION_KEY);
  document.getElementById("nr-login-gate")?.classList.remove("hidden");
  showAdminToast("تم تسجيل الخروج من غرفة الأخبار");
}

// ==================== 7. محرك ميثاق الشرف الصحفي والتوقيع الرقمي الثلاثي (Canvas Signature) ====================
function initSignatureCanvasPad() {
  const canvas = document.getElementById("signature-pad");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const resizeCanvas = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0) {
      canvas.width = rect.width;
      canvas.height = rect.height || 180;
      ctx.strokeStyle = "#0c0d0e";
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  };

  setTimeout(resizeCanvas, 80);
  window.addEventListener("resize", resizeCanvas);

  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    state.isDrawingSignature = true;
    state.hasStrokeOnCurrentCanvas = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const moveDraw = (e) => {
    if (!state.isDrawingSignature) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    state.isDrawingSignature = false;
  };

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", moveDraw);
  window.addEventListener("mouseup", endDraw);

  canvas.addEventListener("touchstart", startDraw, { passive: false });
  canvas.addEventListener("touchmove", moveDraw, { passive: false });
  window.addEventListener("touchend", endDraw);

  document.getElementById("clear-signature-btn")?.addEventListener("click", () => {
    clearSignatureCanvas();
  });

  document.getElementById("submit-pledge-btn")?.addEventListener("click", () => {
    handleSignatureStepSubmission();
  });

  document.getElementById("postpone-pledge-update-btn")?.addEventListener("click", () => {
    document.getElementById("pledge-overlay")?.classList.add("hidden");
    document.getElementById("charter-update-banner")?.classList.remove("hidden");
    showAdminToast("يمكنك متابعة عملك العاجل الآن والتوقيع لاحقاً من الشريط العلوي.");
  });

  document.getElementById("open-charter-from-banner-btn")?.addEventListener("click", () => {
    openCharterPledgeModal("update");
  });
}

function clearSignatureCanvas() {
  const canvas = document.getElementById("signature-pad");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  state.hasStrokeOnCurrentCanvas = false;
}

function evaluateCharterPledgeRequirement() {
  const user = state.currentUser;
  if (!user || isUserAdmin(user)) {
    document.getElementById("pledge-overlay")?.classList.add("hidden");
    document.getElementById("charter-update-banner")?.classList.add("hidden");
    return;
  }

  const currentVer = Number(state.settings.charterVersion || 1);
  const userSignedVer = Number(user.signedCharterVersion || 0);
  const sigStatus = user.signatureStatus || "none"; // "none" | "pending" | "approved" | "rejected"
  const everApprovedBefore = Boolean(user.everApprovedCharter || sigStatus === "approved");

  // 1. إذا لم يوقع من قبل أو تم رفض توقيعه: نافذة إجبارية بـ 3 توقيعات متتالية
  if (sigStatus === "none" || sigStatus === "rejected") {
    openCharterPledgeModal("first_time");
    return;
  }

  // 2. إذا كان معتمداً سابقاً ولكن الإدارة قامت بتحديث إصدار الميثاق:
  // يظهر له التحديث بتوقيع واحد فقط، مع إمكانية التأجيل المؤقت لعدم تعطيل الأخبار العاجلة
  if (everApprovedBefore && userSignedVer < currentVer && sigStatus !== "pending") {
    document.getElementById("charter-update-banner")?.classList.remove("hidden");
    openCharterPledgeModal("update");
    return;
  }

  document.getElementById("pledge-overlay")?.classList.add("hidden");
  document.getElementById("charter-update-banner")?.classList.add("hidden");
}

function openCharterPledgeModal(mode = "first_time") {
  state.pledgeMode = mode;
  state.pledgeRequiredCount = mode === "first_time" ? 3 : 1;
  state.pledgeCollectedSignatures = [];

  const overlay = document.getElementById("pledge-overlay");
  const textBox = document.getElementById("pledge-text-box");
  const postponeBtn = document.getElementById("postpone-pledge-update-btn");
  const warningText = document.querySelector(".pledge-warning");

  if (textBox) {
    textBox.innerHTML = state.settings.charterHtml || DEFAULT_CHARTER_HTML;
  }

  if (mode === "first_time") {
    postponeBtn?.classList.add("hidden");
    if (warningText) {
      warningText.textContent =
        "يرجى قراءة ميثاق الشرف الصحفي بعناية، ثم رسم توقيعك الشخصي (3 مرات متطابقة) لإحالته لاعتماد الإدارة وتفعيل النشر.";
    }
  } else {
    postponeBtn?.classList.remove("hidden");
    if (warningText) {
      warningText.textContent =
        "تم تحديث ميثاق الشرف الصحفي. يرجى التوقيع (لمرة واحدة فقط) لتأكيد الاطلاع، وسيبقى حسابك نشطاً للنشر دون أي توقف.";
    }
  }

  overlay?.classList.remove("hidden");
  clearSignatureCanvas();
  updatePledgeStepUi();
}

function updatePledgeStepUi() {
  const stepBadge = document.getElementById("pledge-step-badge");
  const submitBtn = document.getElementById("submit-pledge-btn");
  const currentNum = state.pledgeCollectedSignatures.length + 1;
  const total = state.pledgeRequiredCount;

  if (stepBadge) {
    stepBadge.textContent =
      total === 3
        ? `التوقيع ${currentNum} من 3 (يجب تطابق التوقيعات)`
        : `توقيع تحديث الميثاق (مرة واحدة)`;
  }

  if (submitBtn) {
    if (currentNum < total) {
      submitBtn.innerHTML = `<span class="material-symbols-rounded">draw</span> حفظ التوقيع (${currentNum}/${total}) والتالي`;
    } else {
      submitBtn.innerHTML = `<span class="material-symbols-rounded">verified</span> أوافق وأعتمد التوقيع النهائي`;
    }
  }
}

async function handleSignatureStepSubmission() {
  if (!state.hasStrokeOnCurrentCanvas) {
    showAdminToast("يرجى رسم توقيعك داخل المربع المخصص أولاً.");
    return;
  }

  const canvas = document.getElementById("signature-pad");
  const sigDataUrl = canvas.toDataURL("image/png");
  state.pledgeCollectedSignatures.push(sigDataUrl);

  // إذا كان مطلوباً 3 توقيعات ولم يكملها بعد، نمسح اللوحة ليوقع التوقيع التالي
  if (state.pledgeCollectedSignatures.length < state.pledgeRequiredCount) {
    clearSignatureCanvas();
    updatePledgeStepUi();
    showAdminToast(
      `تم حفظ التوقيع رقم (${state.pledgeCollectedSignatures.length}) — يرجى رسم التوقيع المطابق التالي.`
    );
    return;
  }

  // اكتملت التوقيعات المطلوبة -> الحفظ في قاعدة بيانات Firestore
  const user = state.currentUser;
  if (!user || !user.id) return;

  const currentVer = Number(state.settings.charterVersion || 1);
  const isUpdateMode = state.pledgeMode === "update";

  const updatePayload = {
    signatures: state.pledgeCollectedSignatures,
    primarySignature: state.pledgeCollectedSignatures[0],
    signedCharterVersion: currentVer,
    signatureStatus: "pending",
    signatureType: isUpdateMode ? "update" : "first_time",
    // إذا كان موقعاً ومعتمداً سابقاً (تحديث ميثاق)، نحافظ على أهليته للنشر دون توقف
    everApprovedCharter: Boolean(user.everApprovedCharter || isUpdateMode),
    signedAt: Date.now()
  };

  try {
    await updateDoc(doc(db, "staff", user.id), updatePayload);
    state.currentUser = { ...state.currentUser, ...updatePayload };
    document.getElementById("pledge-overlay")?.classList.add("hidden");
    document.getElementById("charter-update-banner")?.classList.add("hidden");

    if (isUpdateMode) {
      showAdminToast("تم إرسال توقيع تحديث الميثاق للمراجعة — يمكنك متابعة النشر كالمعتاد ✓");
    } else {
      showAdminToast("تم إرسال توقيعاتك الثلاثة على ميثاق الشرف لاعتماد رئيس التحرير ✓");
    }
  } catch (err) {
    console.error(err);
    showAdminToast("حدث خطأ أثناء حفظ التوقيع، يرجى المحاولة مرة أخرى.");
  }
}

/* === نهاية الجزء الأول من admin-app.js — يتبع الجزء الثاني مباشرة === */
/* ==========================================================================
   حُجرية بريس (Hujariya Press) — المحرك البرمجي الشامل لغرفة الأخبار (admin-app.js)
   [الجزء الثاني من 2 — يُلصق مباشرة أسفل الجزء الأول]:
   - اللوحة الرئيسية للصحفي وإحصائياته + إدارة مواده الصحفية وحالاتها
   - استديو صياغة الأخبار المرحلي (3 مراحل) + الحفظ التلقائي الفوري (Auto-Save) + إدراج الصور بين الفقرات
   - مركز المراجعات للإدارة (مراجعة الأخبار، اعتماد التوقيعات الثلاثية، وتوثيق الهويات KYC)
   - سجل الكادر والبحث الذكي بالهوية الصحفية (HP#####) + الملف الشخصي الشامل للصحفي (Dossier)
   - إعدادات المنصة وتحديث إصدار ميثاق الشرف الصحفي مع المزامنة الحية (Firestore)
   ========================================================================== */

// ==================== 8. اللوحة الرئيسية للصحفي وإحصائياته ومواده الصحفية ====================
function getMyPostsList() {
  const user = state.currentUser;
  if (!user) return [];
  if (isUserAdmin(user)) {
    return state.posts;
  }
  return state.posts.filter(
    (p) =>
      (p.authorId && p.authorId === user.id) ||
      (p.authorPressId && normalizePressId(p.authorPressId) === normalizePressId(user.pressId)) ||
      (p.authorUsername &&
        String(p.authorUsername).toLowerCase() === String(user.username || "").toLowerCase()) ||
      (p.author && String(p.author).trim() === String(user.name || "").trim())
  );
}

function getPostStatusBadgeHtml(status) {
  const st = status || "published";
  if (st === "published") {
    return `<span class="nr-status-pill status-published"><span class="material-symbols-rounded" style="font-size:15px;">check_circle</span> منشور ومفعل</span>`;
  }
  if (st === "pending") {
    return `<span class="nr-status-pill status-pending"><span class="material-symbols-rounded" style="font-size:15px;">schedule</span> قيد مراجعة رئيس التحرير</span>`;
  }
  if (st === "rejected") {
    return `<span class="nr-status-pill status-rejected"><span class="material-symbols-rounded" style="font-size:15px;">error</span> معاد للتعديل</span>`;
  }
  return `<span class="nr-status-pill status-draft"><span class="material-symbols-rounded" style="font-size:15px;">edit_note</span> مسودة محفوظة</span>`;
}

function renderDashboardAndMyArticles() {
  const myPosts = getMyPostsList();
  const publishedCount = myPosts.filter((p) => !p.status || p.status === "published").length;
  const pendingCount = myPosts.filter((p) => p.status === "pending").length;
  const draftsCount = myPosts.filter((p) => p.status === "draft" || p.status === "rejected").length;

  const pubEl = document.getElementById("stat-published");
  const pendEl = document.getElementById("stat-pending");
  const draftEl = document.getElementById("stat-drafts");

  if (pubEl) pubEl.textContent = publishedCount.toLocaleString("en-US");
  if (pendEl) pendEl.textContent = pendingCount.toLocaleString("en-US");
  if (draftEl) draftEl.textContent = draftsCount.toLocaleString("en-US");

  const listBox = document.getElementById("author-articles-list");
  if (!listBox) return;

  if (!myPosts.length) {
    listBox.innerHTML = `
      <div class="empty-state-box">
        <span class="material-symbols-rounded">article</span>
        <p>لا توجد مواد صحفية مسجلة بعد. اضغط على «صياغة خبر» للبدء.</p>
      </div>
    `;
    return;
  }

  listBox.innerHTML = myPosts
    .slice(0, 40)
    .map((post) => {
      const views = Number(post.views || 0).toLocaleString("en-US");
      const catLabel =
        (Array.isArray(post.categories) && post.categories[0]) ||
        post.category ||
        "عام";

      return `
        <article class="nr-article-row">
          <div style="flex:1;min-width:240px;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
              ${getPostStatusBadgeHtml(post.status)}
              <span style="font-size:0.78rem;font-weight:800;color:var(--brand-red);background:var(--crimson-soft);padding:2px 9px;border-radius:6px;">
                ${escapeHtml(catLabel)}
              </span>
              <span style="font-size:0.78rem;color:var(--text-muted);font-weight:700;">
                ${formatArabicDateTime(post)} • ${views} مشاهدة
              </span>
            </div>
            <h3 style="font-size:1.02rem;font-weight:900;color:var(--text-main);margin-bottom:4px;">
              ${escapeHtml(post.title || "بدون عنوان")}
            </h3>
            <p style="font-size:0.84rem;color:var(--text-muted);">
              الكاتب: <strong>${escapeHtml(post.author || "هيئة التحرير")}</strong>
              ${post.authorPressId ? `(<span dir="ltr">${escapeHtml(post.authorPressId)}</span>)` : ""}
            </p>
          </div>

          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn-secondary" style="padding:7px 14px;font-size:0.82rem;" data-edit-post="${escapeHtml(post.id)}">
              <span class="material-symbols-rounded" style="font-size:18px;">edit</span> تعديل في الاستديو
            </button>
            ${
              isUserAdmin(state.currentUser) || post.status === "draft"
                ? `<button type="button" class="btn-secondary" style="padding:7px 12px;font-size:0.82rem;color:#b91c1c;border-color:#fecaca;" data-delete-post="${escapeHtml(post.id)}">
                    <span class="material-symbols-rounded" style="font-size:18px;">delete</span>
                  </button>`
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");

  listBox.querySelectorAll("[data-edit-post]").forEach((btn) => {
    btn.addEventListener("click", () => {
      loadPostIntoStudioForEditing(btn.getAttribute("data-edit-post"));
    });
  });

  listBox.querySelectorAll("[data-delete-post]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const postId = btn.getAttribute("data-delete-post");
      if (!postId || !confirm("هل أنت متأكد من حذف هذه المادة الصحفية نهائياً؟")) return;
      try {
        await deleteDoc(doc(db, "posts", postId));
        showAdminToast("تم حذف المادة الصحفية بنجاح");
      } catch (_) {
        showAdminToast("تعذر حذف المادة الصحفية");
      }
    });
  });
}

// ==================== 9. استديو صياغة الأخبار المرحلي (Multi-Step Studio) + الحفظ التلقائي ====================
function populateStudioCategoriesSelect() {
  const catSelect = document.getElementById("post-category");
  const subSelect = document.getElementById("post-subcategory");
  if (!catSelect) return;

  const currentVal = catSelect.value;
  catSelect.innerHTML = [
    `<option value="" disabled ${!currentVal ? "selected" : ""}>اختر القسم الرئيسي...</option>`,
    ...state.compasses.map(
      (c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`
    )
  ].join("");

  if (currentVal) catSelect.value = currentVal;

  const updateSubcats = () => {
    if (!subSelect) return;
    const selectedName = catSelect.value;
    const found = state.compasses.find(
      (c) => c.name === selectedName || c.id === selectedName
    );
    const subs = found?.subcategories || [];
    subSelect.innerHTML = [
      `<option value="">بدون تصنيف فرعي</option>`,
      ...subs.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
    ].join("");
  };

  catSelect.onchange = () => {
    updateSubcats();
    triggerStudioAutoSave();
  };
  updateSubcats();
}

function goToStudioStep(stepNumber) {
  const target = Math.max(1, Math.min(3, Number(stepNumber) || 1));

  // التحقق من إدخال العنوان في المرحلة الأولى قبل الانتقال للمرحلة الثانية
  if (target > 1) {
    const titleVal = (document.getElementById("post-title")?.value || "").trim();
    if (!titleVal) {
      showAdminToast("يرجى كتابة العنوان الرئيسي للخبر أولاً قبل الانتقال للخطوة التالية.");
      document.getElementById("post-title")?.focus();
      return;
    }
  }

  state.studioStep = target;

  [1, 2, 3].forEach((num) => {
    const stepPane = document.getElementById(`studio-step-${num}`);
    const marker = document.getElementById(`marker-step-${num}`);
    if (stepPane) stepPane.classList.toggle("hidden", num !== target);
    if (marker) marker.classList.toggle("active", num <= target);
  });

  triggerStudioAutoSave();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function triggerStudioAutoSave() {
  try {
    const draftPayload = {
      savedAt: Date.now(),
      editingPostId: state.editingPostId,
      step: state.studioStep,
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
        document.getElementById("post-image-url-input")?.value ||
        "",
      videoUrl: document.getElementById("post-video-url")?.value || "",
      videoType: document.getElementById("post-video-type")?.value || "none",
      content: document.getElementById("rich-text-editor")?.innerHTML || ""
    };

    localStorage.setItem(NR_AUTOSAVE_KEY, JSON.stringify(draftPayload));

    const indicator = document.getElementById("auto-save-indicator");
    if (indicator) {
      const timeStr = new Date().toLocaleTimeString("ar-YE", {
        hour: "2-digit",
        minute: "2-digit"
      });
      indicator.textContent = `تم الحفظ التلقائي ${timeStr}`;
    }
  } catch (_) {}
}

function restoreStudioAutoSavedDraft() {
  try {
    const raw = localStorage.getItem(NR_AUTOSAVE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved || (!saved.title && !saved.content)) return;

    state.editingPostId = saved.editingPostId || null;
    state.studioMainImageData = saved.imageUrl || "";

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || "";
    };

    setVal("post-title", saved.title);
    setVal("post-summary", saved.summary);
    populateStudioCategoriesSelect();
    setVal("post-category", saved.category);
    if (document.getElementById("post-category")?.onchange) {
      document.getElementById("post-category").onchange();
    }
    setVal("post-subcategory", saved.subcategory);
    setVal("post-tags", saved.tags);
    setVal("post-video-url", saved.videoUrl);
    setVal("post-video-type", saved.videoType || "none");

    if (saved.imageUrl && !saved.imageUrl.startsWith("data:")) {
      setVal("post-image-url-input", saved.imageUrl);
    }
    renderStudioMainImagePreview(saved.imageUrl);

    if (document.getElementById("post-is-breaking")) {
      document.getElementById("post-is-breaking").checked = Boolean(saved.isBreaking);
    }
    if (document.getElementById("post-is-featured")) {
      document.getElementById("post-is-featured").checked = Boolean(saved.isFeatured);
    }
    if (document.getElementById("post-is-quick")) {
      document.getElementById("post-is-quick").checked = Boolean(saved.isQuickNews);
    }

    const editor = document.getElementById("rich-text-editor");
    if (editor && saved.content) {
      editor.innerHTML = saved.content;
    }

    if (saved.step) {
      goToStudioStep(saved.step);
    }
  } catch (_) {}
}

function renderStudioMainImagePreview(imgSrc = "") {
  const previewBox = document.getElementById("studio-main-img-preview");
  if (!previewBox) return;
  if (!imgSrc) {
    previewBox.innerHTML = "";
    previewBox.classList.add("hidden");
    return;
  }
  previewBox.classList.remove("hidden");
  previewBox.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;background:var(--bg-page);padding:8px 12px;border-radius:8px;border:1px solid var(--border-light);">
      <img src="${escapeHtml(imgSrc)}" alt="معاينة" style="width:78px;height:52px;object-fit:cover;border-radius:6px;">
      <span style="font-size:0.82rem;font-weight:800;color:var(--text-body);">الصورة البارزة جاهزة للنشر</span>
      <button type="button" id="remove-studio-main-img-btn" class="btn-secondary" style="margin-right:auto;padding:4px 10px;font-size:0.75rem;">إزالة</button>
    </div>
  `;
  document.getElementById("remove-studio-main-img-btn")?.addEventListener("click", () => {
    state.studioMainImageData = "";
    const fileInp = document.getElementById("post-main-image");
    const urlInp = document.getElementById("post-image-url-input");
    if (fileInp) fileInp.value = "";
    if (urlInp) urlInp.value = "";
    renderStudioMainImagePreview("");
    triggerStudioAutoSave();
  });
}

function resetStudioFormCompletely() {
  state.editingPostId = null;
  state.studioMainImageData = "";
  state.studioStep = 1;
  localStorage.removeItem(NR_AUTOSAVE_KEY);

  document.getElementById("article-studio-form")?.reset();
  const editor = document.getElementById("rich-text-editor");
  if (editor) editor.innerHTML = "";
  renderStudioMainImagePreview("");
  goToStudioStep(1);
}

function loadPostIntoStudioForEditing(postId) {
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return;

  state.editingPostId = post.id;
  state.studioMainImageData = post.imageUrl || "";

  switchNewsroomView("view-write-studio");
  populateStudioCategoriesSelect();

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };

  setVal("post-title", post.title || "");
  setVal("post-summary", post.summary || "");
  const mainCat =
    (Array.isArray(post.categories) && post.categories[0]) || post.category || "";
  setVal("post-category", mainCat);
  if (document.getElementById("post-category")?.onchange) {
    document.getElementById("post-category").onchange();
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
    setVal("post-image-url-input", post.imageUrl);
  }
  renderStudioMainImagePreview(post.imageUrl || "");

  if (document.getElementById("post-is-breaking")) {
    document.getElementById("post-is-breaking").checked = Boolean(post.isBreaking);
  }
  if (document.getElementById("post-is-featured")) {
    document.getElementById("post-is-featured").checked = Boolean(post.isFeatured);
  }
  if (document.getElementById("post-is-quick")) {
    document.getElementById("post-is-quick").checked = Boolean(post.isQuickNews);
  }

  const editor = document.getElementById("rich-text-editor");
  if (editor) {
    editor.innerHTML = post.content || "";
  }

  goToStudioStep(1);
  showAdminToast("تم تحميل المادة الصحفية في الاستديو للتعديل");
}

async function handleSaveOrPublishArticle(saveAsDraft = false) {
  const user = state.currentUser;
  if (!user) return;

  // التحقق من اعتماد ميثاق الشرف قبل السماح بالنشر للصحفي الجديد
  if (!saveAsDraft && !isUserAdmin(user)) {
    const sigStatus = user.signatureStatus || "none";
    const canPublishWhileUpdating = Boolean(user.everApprovedCharter);
    if (sigStatus !== "approved" && !canPublishWhileUpdating) {
      showAdminToast(
        "لا يمكن النشر قبل اعتماد توقيعك على ميثاق الشرف الصحفي من الإدارة. يمكنك حفظ الخبر كمسودة الآن."
      );
      return;
    }
  }

  const title = (document.getElementById("post-title")?.value || "").trim();
  const summary = (document.getElementById("post-summary")?.value || "").trim();
  const category = (document.getElementById("post-category")?.value || "").trim() || "السياسة اليمنية";
  const subcategory = (document.getElementById("post-subcategory")?.value || "").trim();
  const rawTags = (document.getElementById("post-tags")?.value || "").trim();
  const contentHtml = (document.getElementById("rich-text-editor")?.innerHTML || "").trim();

  if (!title) {
    goToStudioStep(1);
    showAdminToast("يرجى كتابة العنوان الرئيسي للخبر");
    return;
  }

  if (!saveAsDraft && !stripHtml(contentHtml) && !summary) {
    goToStudioStep(3);
    showAdminToast("يرجى صياغة محتوى الخبر قبل الإرسال");
    return;
  }

  const tagsArray = rawTags
    .split(/[\s,،]+/)
    .map((t) => t.replace(/^#+/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  const canDirectPublish =
    isUserAdmin(user) ||
    Boolean(user.directPublish) ||
    user.role === "trusted_writer";

  const finalStatus = saveAsDraft
    ? "draft"
    : canDirectPublish
    ? "published"
    : "pending";

  const isBreaking = Boolean(document.getElementById("post-is-breaking")?.checked);
  const imageUrl =
    state.studioMainImageData ||
    (document.getElementById("post-image-url-input")?.value || "").trim();

  const postPayload = {
    title,
    summary,
    category,
    categories: [category],
    subcategory,
    tags: tagsArray,
    content: contentHtml || `<p>${escapeHtml(summary)}</p>`,
    imageUrl,
    videoUrl: (document.getElementById("post-video-url")?.value || "").trim(),
    videoType: document.getElementById("post-video-type")?.value || "none",
    isBreaking,
    breakingExpiresAt: isBreaking ? Date.now() + 6 * 3600 * 1000 : null,
    isFeatured: Boolean(document.getElementById("post-is-featured")?.checked),
    isQuickNews: Boolean(document.getElementById("post-is-quick")?.checked),
    status: finalStatus,
    updatedAt: Date.now()
  };

  try {
    if (state.editingPostId) {
      await updateDoc(doc(db, "posts", state.editingPostId), postPayload);
    } else {
      await addDoc(collection(db, "posts"), {
        ...postPayload,
        author: user.name || "هيئة التحرير",
        authorId: user.id || "",
        authorPressId: user.pressId || "",
        authorUsername: user.username || "",
        authorAvatar: user.avatar || "",
        authorVerified: Boolean(user.verified || isUserAdmin(user)),
        views: 0,
        createdAt: Date.now(),
        createdTimestamp: serverTimestamp()
      });
    }

    resetStudioFormCompletely();
    switchNewsroomView("view-dashboard");

    if (finalStatus === "draft") {
      showAdminToast("تم حفظ المادة الصحفية في المسودات بنجاح ✓");
    } else if (finalStatus === "pending") {
      showAdminToast("تم إرسال المادة الصحفية إلى صندوق مراجعة رئيس التحرير ✓");
    } else {
      showAdminToast("تم نشر الخبر مباشرة على الموقع العام بنجاح ✓");
    }
  } catch (err) {
    console.error(err);
    showAdminToast("حدث خطأ أثناء حفظ الخبر، تحقق من الاتصال");
  }
}

// ==================== 10. الملف الشخصي للصحفي، الهوية الثابتة (HP)، ونموذج التوثيق (KYC) ====================
function populateMyProfileView() {
  const user = state.currentUser;
  if (!user) return;

  const freshUser =
    state.staff.find((s) => s.id === user.id) || user;
  state.currentUser = { ...user, ...freshUser };

  const u = state.currentUser;
  const pressId = normalizePressId(u.pressId || "HP10001");
  const avatarUrl =
    u.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      u.name || "HP"
    )}&background=b80d38&color=fff`;

  document.getElementById("my-profile-avatar")?.setAttribute("src", avatarUrl);
  const nameEl = document.getElementById("my-profile-name");
  if (nameEl) nameEl.textContent = u.name || "صحفي في حُجرية بريس";

  const pidEl = document.getElementById("my-press-id");
  if (pidEl) pidEl.textContent = pressId;

  const verBadge = document.getElementById("my-verification-badge");
  if (verBadge) {
    const isVer = Boolean(u.verified || isUserAdmin(u));
    verBadge.className = `verification-status ${isVer ? "verified" : "unverified"}`;
    verBadge.textContent = isVer
      ? "✓ موثق بالشارة الزرقاء ومعتمد الميثاق"
      : u.kycStatus === "pending"
      ? "⏳ طلب التوثيق قيد مراجعة الإدارة"
      : "غير موثق (أكمل بياناتك لطلب الشارة الزرقاء)";
  }

  const setInp = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };

  setInp("kyc-email", u.contactEmail || u.email || "");
  setInp("kyc-whatsapp", u.whatsapp || "");
  setInp("kyc-legal-name", u.legalName || u.name || "");
  setInp("kyc-doc-number", u.docNumber || "");
  setInp("kyc-doc-type", u.docType || "id_card");
  setInp("kyc-dob", u.dob || "");
  setInp("kyc-issue-date", u.docIssueDate || "");

  updateLiveCalculatedAgeDisplay(u.dob || "");
}

function updateLiveCalculatedAgeDisplay(dobValue) {
  const age = calculateAgeFromDob(dobValue);
  const ageDisplay = document.getElementById("kyc-auto-age-display");
  const cardAgeBadge = document.getElementById("my-auto-age-badge");

  if (age !== null) {
    if (ageDisplay) ageDisplay.textContent = `${age} سنة (محسوب تلقائياً من تاريخ الميلاد)`;
    if (cardAgeBadge) cardAgeBadge.textContent = `العمر الفعلي: ${age} سنة`;
  } else {
    if (ageDisplay) ageDisplay.textContent = "أدخل تاريخ الميلاد لحساب العمر تلقائياً";
    if (cardAgeBadge) cardAgeBadge.textContent = "العمر: يُحسب تلقائياً عند إدخال تاريخ الميلاد";
  }
}

async function handleKycFormSubmission(e) {
  e.preventDefault();
  const user = state.currentUser;
  if (!user || !user.id || user.id === "master-admin") {
    showAdminToast("حساب المدير العام موثق تلقائياً.");
    return;
  }

  // يجب أن يكون الصحفي قد وقّع على ميثاق الشرف أولاً ليرتبط التوثيق بالميثاق
  if (!user.signatureStatus || user.signatureStatus === "none") {
    showAdminToast("يجب التوقيع على ميثاق الشرف الصحفي أولاً قبل طلب التوثيق والشارة الزرقاء.");
    openCharterPledgeModal("first_time");
    return;
  }

  const contactEmail = (document.getElementById("kyc-email")?.value || "").trim();
  const whatsapp = (document.getElementById("kyc-whatsapp")?.value || "").trim();
  const legalName = (document.getElementById("kyc-legal-name")?.value || "").trim();
  const docNumber = (document.getElementById("kyc-doc-number")?.value || "").trim();
  const docType = document.getElementById("kyc-doc-type")?.value || "id_card";
  const dob = document.getElementById("kyc-dob")?.value || "";
  const docIssueDate = document.getElementById("kyc-issue-date")?.value || "";

  if (!legalName || !docNumber || !dob || !docIssueDate) {
    showAdminToast("يرجى تعبئة الاسم الرباعي ورقم الوثيقة وتاريخ الميلاد وتاريخ الإصدار بالكامل.");
    return;
  }

  const frontFile = document.getElementById("kyc-doc-front")?.files?.[0];
  const backFile = document.getElementById("kyc-doc-back")?.files?.[0];
  const selfieFile = document.getElementById("kyc-selfie")?.files?.[0];

  const submitBtn = document.getElementById("submit-kyc-btn");
  if (submitBtn) submitBtn.disabled = true;
  showAdminToast("جاري ضغط الصور ورفع ملف الهوية الصحفية...");

  try {
    const docFrontImg = frontFile
      ? await compressImageFileToDataUrl(frontFile, 950, 0.76)
      : user.docFrontImg || "";
    const docBackImg = backFile
      ? await compressImageFileToDataUrl(backFile, 950, 0.76)
      : user.docBackImg || "";
    const selfieImg = selfieFile
      ? await compressImageFileToDataUrl(selfieFile, 850, 0.78)
      : user.selfieImg || "";

    if (!docFrontImg || !selfieImg) {
      showAdminToast("يرجى إرفاق صورة الوثيقة الرسمية وصورة السيلفي الواضحة للتحقق.");
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    const kycPayload = {
      contactEmail,
      email: contactEmail || user.email || "",
      whatsapp,
      legalName,
      docNumber,
      docType,
      dob,
      docIssueDate,
      calculatedAge: calculateAgeFromDob(dob),
      docFrontImg,
      docBackImg,
      selfieImg,
      avatar: user.avatar || selfieImg,
      kycStatus: "pending",
      kycSubmittedAt: Date.now()
    };

    await updateDoc(doc(db, "staff", user.id), kycPayload);
    state.currentUser = { ...state.currentUser, ...kycPayload };
    populateMyProfileView();
    showAdminToast("تم إرسال بيانات الهوية الصحفية وطلب التوثيق لمراجعة الإدارة بنجاح ✓");
  } catch (err) {
    console.error(err);
    showAdminToast("حدث خطأ أثناء رفع الوثائق، يرجى المحاولة بصور أصغر حجماً.");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

// ==================== 11. مركز المراجعات للإدارة (منشورات • توقيعات • توثيقات KYC) ====================
function renderAdminReviewsAndStaff() {
  if (!isUserAdmin(state.currentUser)) return;

  const pendingPosts = state.posts.filter((p) => p.status === "pending");
  const pendingSigs = state.staff.filter((s) => s.signatureStatus === "pending");
  const pendingKyc = state.staff.filter((s) => s.kycStatus === "pending");

  const totalPending = pendingPosts.length + pendingSigs.length + pendingKyc.length;
  const badge = document.getElementById("reviews-badge");
  if (badge) {
    badge.textContent = String(totalPending);
    badge.classList.toggle("hidden", totalPending === 0);
  }

  // 1. تبويب مراجعة الأخبار المعلقة
  const revPostsBox = document.getElementById("rev-posts");
  if (revPostsBox) {
    if (!pendingPosts.length) {
      revPostsBox.innerHTML = `<div class="empty-state-box"><p>لا توجد منشورات معلقة بانتظار المراجعة حالياً.</p></div>`;
    } else {
      revPostsBox.innerHTML = pendingPosts
        .map(
          (p) => `
          <article class="nr-article-row">
            <div style="flex:1;min-width:240px;">
              <span class="nr-status-pill status-pending">بانتظار الاعتماد</span>
              <h3 style="font-size:1.05rem;font-weight:900;margin:6px 0 4px;">${escapeHtml(p.title)}</h3>
              <p style="font-size:0.84rem;color:var(--text-muted);">
                الكاتب: <strong>${escapeHtml(p.author)}</strong> (${escapeHtml(p.authorPressId || "HP")}) • القسم: ${escapeHtml(p.category || "عام")}
              </p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="btn-primary" style="padding:8px 16px;font-size:0.82rem;" data-approve-post="${escapeHtml(p.id)}">
                ✓ اعتماد ونشر فوري
              </button>
              <button type="button" class="btn-secondary" style="padding:8px 14px;font-size:0.82rem;" data-review-edit-post="${escapeHtml(p.id)}">
                معاينة وتعديل
              </button>
              <button type="button" class="btn-secondary" style="padding:8px 14px;font-size:0.82rem;color:#b91c1c;" data-reject-post="${escapeHtml(p.id)}">
                إعادة للمحرر
              </button>
            </div>
          </article>
        `
        )
        .join("");

      revPostsBox.querySelectorAll("[data-approve-post]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const pid = btn.getAttribute("data-approve-post");
          await updateDoc(doc(db, "posts", pid), {
            status: "published",
            approvedAt: Date.now()
          });
          showAdminToast("تم اعتماد الخبر ونشره على الموقع العام ✓");
        });
      });

      revPostsBox.querySelectorAll("[data-review-edit-post]").forEach((btn) => {
        btn.addEventListener("click", () => {
          loadPostIntoStudioForEditing(btn.getAttribute("data-review-edit-post"));
        });
      });

      revPostsBox.querySelectorAll("[data-reject-post]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const pid = btn.getAttribute("data-reject-post");
          await updateDoc(doc(db, "posts", pid), { status: "rejected" });
          showAdminToast("تمت إعادة المادة للمحرر لمراجعتها");
        });
      });
    }
  }

  // 2. تبويب مراجعة توقيعات ميثاق الشرف الصحفي
  const revSigsBox = document.getElementById("rev-sigs");
  if (revSigsBox) {
    if (!pendingSigs.length) {
      revSigsBox.innerHTML = `<div class="empty-state-box"><p>لا توجد توقيعات جديدة بانتظار المراجعة حالياً.</p></div>`;
    } else {
      revSigsBox.innerHTML = pendingSigs
        .map((s) => {
          const sigs = Array.isArray(s.signatures)
            ? s.signatures
            : s.primarySignature
            ? [s.primarySignature]
            : [];
          return `
            <div class="nr-article-row" style="flex-direction:column;align-items:stretch;">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <div>
                  <strong>${escapeHtml(s.name)}</strong>
                  <span style="font-family:monospace;background:#111;color:#fff;padding:2px 8px;border-radius:4px;margin-right:6px;" dir="ltr">${escapeHtml(s.pressId || "HP")}</span>
                  <span style="font-size:0.8rem;color:var(--text-muted);margin-right:8px;">
                    (${s.signatureType === "update" ? "توقيع تحديث الميثاق" : "3 توقيعات مطابقة لأول مرة"} — الإصدار ${s.signedCharterVersion || 1})
                  </span>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  <button type="button" class="btn-primary" style="padding:7px 14px;font-size:0.82rem;" data-approve-sig="${escapeHtml(s.id)}">
                    ✓ اعتماد التوقيع وتفعيل الحساب
                  </button>
                  <button type="button" class="btn-secondary" style="padding:7px 14px;font-size:0.82rem;color:#b91c1c;" data-reject-sig="${escapeHtml(s.id)}">
                    رفض وطلب إعادة التوقيع
                  </button>
                  <button type="button" class="btn-secondary" style="padding:7px 12px;font-size:0.82rem;" data-open-dossier="${escapeHtml(s.id)}">
                    فتح الملف الكامل
                  </button>
                </div>
              </div>
              <div class="sig-preview-grid">
                ${sigs
                  .map(
                    (img, i) => `
                  <div class="sig-preview-box">
                    <small style="display:block;font-weight:800;color:var(--text-muted);margin-bottom:4px;">نموذج التوقيع (${i + 1})</small>
                    <img src="${escapeHtml(img)}" alt="توقيع">
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          `;
        })
        .join("");

      revSigsBox.querySelectorAll("[data-approve-sig]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const sid = btn.getAttribute("data-approve-sig");
          await updateDoc(doc(db, "staff", sid), {
            signatureStatus: "approved",
            everApprovedCharter: true,
            signatureApprovedAt: Date.now()
          });
          showAdminToast("تم اعتماد توقيع ميثاق الشرف الصحفي وتفعيل النشر للصحفي ✓");
        });
      });

      revSigsBox.querySelectorAll("[data-reject-sig]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const sid = btn.getAttribute("data-reject-sig");
          await updateDoc(doc(db, "staff", sid), {
            signatureStatus: "rejected"
          });
          showAdminToast("تم رفض التوقيع وسيُطلب من الصحفي إعادة التوقيع بدقة");
        });
      });

      revSigsBox.querySelectorAll("[data-open-dossier]").forEach((btn) => {
        btn.addEventListener("click", () => {
          openAuthorDossierModal(btn.getAttribute("data-open-dossier"));
        });
      });
    }
  }

  // 3. تبويب مراجعة طلبات توثيق الهوية الرسمية والشارة الزرقاء (KYC)
  const revKycBox = document.getElementById("rev-kyc");
  if (revKycBox) {
    if (!pendingKyc.length) {
      revKycBox.innerHTML = `<div class="empty-state-box"><p>لا توجد طلبات توثيق هوية معلقة حالياً.</p></div>`;
    } else {
      revKycBox.innerHTML = pendingKyc
        .map((s) => {
          const age = calculateAgeFromDob(s.dob);
          return `
            <div class="nr-article-row">
              <div>
                <strong>${escapeHtml(s.name)}</strong> — الاسم القانوني: <strong>${escapeHtml(s.legalName || "")}</strong>
                <span style="font-family:monospace;background:#111;color:#fff;padding:2px 8px;border-radius:4px;margin-right:6px;" dir="ltr">${escapeHtml(s.pressId || "")}</span>
                <p style="font-size:0.83rem;color:var(--text-muted);margin-top:4px;">
                  رقم الوثيقة: <strong>${escapeHtml(s.docNumber || "")}</strong> • تاريخ الإصدار: ${escapeHtml(s.docIssueDate || "-")} • العمر التلقائي: <strong>${age !== null ? `${age} سنة` : "-"}</strong>
                </p>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="btn-secondary" style="padding:7px 14px;font-size:0.82rem;" data-open-dossier="${escapeHtml(s.id)}">
                  فحص الوثائق والملف الشامل
                </button>
                <button type="button" class="btn-primary" style="padding:7px 14px;font-size:0.82rem;" data-approve-kyc="${escapeHtml(s.id)}">
                  ✓ توثيق ومنح الشارة الزرقاء
                </button>
              </div>
            </div>
          `;
        })
        .join("");

      revKycBox.querySelectorAll("[data-open-dossier]").forEach((btn) => {
        btn.addEventListener("click", () => {
          openAuthorDossierModal(btn.getAttribute("data-open-dossier"));
        });
      });

      revKycBox.querySelectorAll("[data-approve-kyc]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const sid = btn.getAttribute("data-approve-kyc");
          await updateDoc(doc(db, "staff", sid), {
            kycStatus: "approved",
            verified: true,
            signatureStatus: "approved",
            everApprovedCharter: true
          });
          showAdminToast("تم توثيق هوية الصحفي ومنحه الشارة الزرقاء ✓");
        });
      });
    }
  }

  renderStaffDirectoryGrid();
}

// ==================== 12. سجل الكادر والبحث الذكي بالهوية (HP) + الملف الشخصي الشامل (Dossier) ====================
function renderStaffDirectoryGrid() {
  const grid = document.getElementById("staff-grid");
  if (!grid) return;

  const query = (document.getElementById("staff-search-input")?.value || "")
    .trim()
    .toLowerCase();
  const cleanQueryPressId = normalizePressId(query);

  const filteredStaff = state.staff.filter((s) => {
    if (!query) return true;
    const sPress = normalizePressId(s.pressId || "");
    const haystack = `${s.name || ""} ${s.legalName || ""} ${s.username || ""} ${
      s.jobTitle || ""
    } ${s.whatsapp || ""} ${s.contactEmail || ""}`.toLowerCase();
    return haystack.includes(query) || (cleanQueryPressId && sPress.includes(cleanQueryPressId));
  });

  if (!filteredStaff.length) {
    grid.innerHTML = `<div class="empty-state-box" style="grid-column:1/-1;"><p>لا يوجد صحفي مطابق لبحثك.</p></div>`;
    return;
  }

  grid.innerHTML = filteredStaff
    .map((s) => {
      const av =
        s.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          s.name || "HP"
        )}&background=b80d38&color=fff`;
      const age = calculateAgeFromDob(s.dob);
      const memberPostsCount = state.posts.filter(
        (p) => p.authorId === s.id || p.author === s.name
      ).length;

      return `
        <article class="staff-card-item" data-open-staff-dossier="${escapeHtml(s.id)}">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <img src="${escapeHtml(av)}" alt="${escapeHtml(s.name)}" style="width:54px;height:54px;border-radius:50%;object-fit:cover;border:2px solid var(--brand-red);">
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:5px;">
                <h3 style="font-size:1rem;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(s.name)}</h3>
                ${
                  s.verified
                    ? `<span class="material-symbols-rounded" style="color:#0284c7;font-size:18px;">verified</span>`
                    : ""
                }
              </div>
              <span style="font-size:0.78rem;color:var(--text-muted);font-weight:700;display:block;">${escapeHtml(
                s.jobTitle || "صحفي"
              )}</span>
            </div>
            <span style="font-family:monospace;background:#111;color:#fff;padding:3px 9px;border-radius:6px;font-weight:900;font-size:0.84rem;" dir="ltr">
              ${escapeHtml(normalizePressId(s.pressId || "HP"))}
            </span>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.78rem;font-weight:800;padding-top:10px;border-top:1px solid var(--border-light);color:var(--text-body);">
            <span>المقالات: ${memberPostsCount}</span>
            <span>${age !== null ? `العمر: ${age} سنة` : "العمر: غير مسجل"}</span>
            <span style="color:var(--brand-red);">عرض الملف الشامل ←</span>
          </div>
        </article>
      `;
    })
    .join("");

  grid.querySelectorAll("[data-open-staff-dossier]").forEach((card) => {
    card.addEventListener("click", () => {
      openAuthorDossierModal(card.getAttribute("data-open-staff-dossier"));
    });
  });
}

function openAuthorDossierModal(staffId) {
  const member = state.staff.find((s) => s.id === staffId);
  if (!member) return;

  state.selectedDossierStaffId = member.id;
  const overlay = document.getElementById("author-dossier-overlay");
  const body = document.getElementById("dossier-modal-body");
  if (!overlay || !body) return;

  const age = calculateAgeFromDob(member.dob);
  const memberPosts = state.posts.filter(
    (p) => p.authorId === member.id || p.author === member.name
  );
  const pubCount = memberPosts.filter((p) => !p.status || p.status === "published").length;
  const pendCount = memberPosts.filter((p) => p.status === "pending").length;
  const totalViews = memberPosts.reduce((sum, p) => sum + Number(p.views || 0), 0);

  const cleanWa = String(member.whatsapp || "").replace(/[^\d]/g, "");
  const waHref = cleanWa ? `https://wa.me/${cleanWa}` : "";
  const mailHref = member.contactEmail || member.email
    ? `mailto:${encodeURIComponent(member.contactEmail || member.email)}`
    : "";

  const sigs = Array.isArray(member.signatures)
    ? member.signatures
    : member.primarySignature
    ? [member.primarySignature]
    : [];

  body.innerHTML = `
    <!-- 1. الترويسة والهوية الصحفية والتواصل الفوري -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;background:var(--bg-page);padding:18px;border-radius:12px;border:1px solid var(--border-light);margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:14px;">
        <img src="${escapeHtml(
          member.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=b80d38&color=fff`
        )}" alt="" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid var(--brand-red);">
        <div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <h3 style="font-size:1.25rem;font-weight:900;">${escapeHtml(member.name)}</h3>
            <span style="font-family:monospace;background:#111;color:#fff;padding:3px 10px;border-radius:6px;font-weight:900;" dir="ltr">
              ${escapeHtml(normalizePressId(member.pressId || "HP"))}
            </span>
            ${
              member.verified
                ? `<span class="nr-status-pill status-published">✓ موثق بالشارة الزرقاء</span>`
                : `<span class="nr-status-pill status-draft">غير موثق</span>`
            }
          </div>
          <p style="font-size:0.86rem;color:var(--text-muted);font-weight:700;margin-top:4px;">
            المسمى: ${escapeHtml(member.jobTitle || "صحفي")} • اسم المستخدم: <code dir="ltr">${escapeHtml(member.username || "")}</code>
            ${age !== null ? ` • <strong>العمر التلقائي: ${age} سنة</strong>` : ""}
          </p>
        </div>
      </div>

      <!-- أزرار التواصل المباشر (واتساب + بريد إلكتروني) -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${
          waHref
            ? `<a href="${escapeHtml(waHref)}" target="_blank" rel="noopener" class="contact-action-btn wa-btn">
                <span class="material-symbols-rounded">chat</span> مراسلة واتساب (${escapeHtml(member.whatsapp)})
              </a>`
            : `<span style="font-size:0.8rem;color:var(--text-muted);padding:6px;">لا يوجد رقم واتساب</span>`
        }
        ${
          mailHref
            ? `<a href="${escapeHtml(mailHref)}" class="contact-action-btn mail-btn">
                <span class="material-symbols-rounded">mail</span> مراسلة بريد (${escapeHtml(member.contactEmail || member.email)})
              </a>`
            : ""
        }
      </div>
    </div>

    <!-- 2. إحصائيات النشاط الصحفي -->
    <div class="stats-grid" style="margin-bottom:20px;">
      <div class="stat-card" style="padding:14px;">
        <div class="stat-info"><h3>المقالات المنشورة</h3><strong>${pubCount}</strong></div>
      </div>
      <div class="stat-card" style="padding:14px;">
        <div class="stat-info"><h3>قيد المراجعة</h3><strong>${pendCount}</strong></div>
      </div>
      <div class="stat-card" style="padding:14px;">
        <div class="stat-info"><h3>إجمالي المشاهدات المحققة</h3><strong>${totalViews.toLocaleString("en-US")}</strong></div>
      </div>
    </div>

    <!-- 3. التحكم الإداري السريع بالصلاحيات والشارة الزرقاء -->
    <div style="background:#fff;border:1px solid var(--border-light);border-radius:10px;padding:16px;margin-bottom:20px;">
      <h4 style="font-weight:900;margin-bottom:12px;color:var(--brand-red);">صلاحيات الصحفي والاعتماد الإداري</h4>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button type="button" id="dossier-toggle-verified-btn" class="btn-primary" style="padding:8px 16px;font-size:0.84rem;">
          ${member.verified ? "إلغاء الشارة الزرقاء" : "✓ منح الشارة الزرقاء والتوثيق"}
        </button>
        <button type="button" id="dossier-toggle-direct-btn" class="btn-secondary" style="padding:8px 16px;font-size:0.84rem;">
          ${member.directPublish ? "تحويل إلى (يخضع للمراجعة)" : "⚡ منح صلاحية النشر المباشر"}
        </button>
        <button type="button" id="dossier-approve-sig-btn" class="btn-secondary" style="padding:8px 16px;font-size:0.84rem;">
          ✓ اعتماد توقيع ميثاق الشرف
        </button>
        <button type="button" id="dossier-reject-sig-btn" class="btn-secondary" style="padding:8px 16px;font-size:0.84rem;color:#b91c1c;">
          طلب إعادة التوقيع على الميثاق
        </button>
      </div>
    </div>

    <!-- 4. بيانات الوثيقة القانونية والهوية الرسمية (KYC) -->
    <div style="background:#fff;border:1px solid var(--border-light);border-radius:10px;padding:16px;margin-bottom:20px;">
      <h4 style="font-weight:900;margin-bottom:10px;">بيانات الهوية الرسمية والوثائق المرفقة</h4>
      <p style="font-size:0.88rem;margin-bottom:12px;">
        <strong>الاسم القانوني الكامل:</strong> ${escapeHtml(member.legalName || "غير مسجل")} |
        <strong>نوع الوثيقة:</strong> ${member.docType === "passport" ? "جواز سفر" : "بطاقة شخصية"} |
        <strong>رقم الوثيقة:</strong> ${escapeHtml(member.docNumber || "غير مسجل")} |
        <strong>تاريخ الإصدار:</strong> ${escapeHtml(member.docIssueDate || "-")} |
        <strong>تاريخ الميلاد:</strong> ${escapeHtml(member.dob || "-")} (${age !== null ? `${age} سنة` : "-"})
      </p>
      <div class="sig-preview-grid">
        ${
          member.docFrontImg
            ? `<div class="sig-preview-box"><small>وجه الوثيقة</small><img src="${escapeHtml(member.docFrontImg)}" alt="وجه الوثيقة" style="max-height:150px;"></div>`
            : ""
        }
        ${
          member.docBackImg
            ? `<div class="sig-preview-box"><small>ظهر الوثيقة</small><img src="${escapeHtml(member.docBackImg)}" alt="ظهر الوثيقة" style="max-height:150px;"></div>`
            : ""
        }
        ${
          member.selfieImg
            ? `<div class="sig-preview-box"><small>صورة التحقق (سيلفي)</small><img src="${escapeHtml(member.selfieImg)}" alt="سيلفي" style="max-height:150px;"></div>`
            : ""
        }
      </div>
    </div>

    <!-- 5. سجل التوقيعات الرقمية على ميثاق الشرف الصحفي -->
    <div style="background:#fff;border:1px solid var(--border-light);border-radius:10px;padding:16px;margin-bottom:20px;">
      <h4 style="font-weight:900;margin-bottom:8px;">
        التوقيعات الرقمية المحفوظة على ميثاق الشرف (الحالة: ${escapeHtml(member.signatureStatus || "لم يوقع بعد")} — الإصدار: ${member.signedCharterVersion || 0})
      </h4>
      ${
        sigs.length
          ? `<div class="sig-preview-grid">
              ${sigs
                .map(
                  (img, idx) =>
                    `<div class="sig-preview-box"><small>التوقيع (${idx + 1})</small><img src="${escapeHtml(img)}" alt="توقيع"></div>`
                )
                .join("")}
            </div>`
          : `<p style="font-size:0.85rem;color:var(--text-muted);">لا توجد توقيعات مرفوعة لهذا الصحفي حتى الآن.</p>`
      }
    </div>

    <!-- 6. أرشيف مقالات ونشاط الصحفي -->
    <div>
      <h4 style="font-weight:900;margin-bottom:10px;">أحدث المواد الصحفية للكاتب (${memberPosts.length})</h4>
      ${
        memberPosts.length
          ? memberPosts
              .slice(0, 10)
              .map(
                (p) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid var(--border-light);font-size:0.88rem;">
                  <strong>${escapeHtml(p.title)}</strong>
                  <div style="display:flex;align-items:center;gap:8px;">
                    ${getPostStatusBadgeHtml(p.status)}
                    <span>${Number(p.views || 0)} مشاهدة</span>
                  </div>
                </div>
              `
              )
              .join("")
          : `<p style="font-size:0.85rem;color:var(--text-muted);">لم ينشر أي مقالات بعد.</p>`
      }
    </div>
  `;

  overlay.classList.remove("hidden");

  document.getElementById("dossier-toggle-verified-btn")?.addEventListener("click", async () => {
    const newVer = !member.verified;
    await updateDoc(doc(db, "staff", member.id), { verified: newVer, kycStatus: newVer ? "approved" : member.kycStatus || "none" });
    showAdminToast(newVer ? "تم منح الشارة الزرقاء للصحفي ✓" : "تم إلغاء الشارة الزرقاء");
    openAuthorDossierModal(member.id);
  });

  document.getElementById("dossier-toggle-direct-btn")?.addEventListener("click", async () => {
    const newDirect = !member.directPublish;
    await updateDoc(doc(db, "staff", member.id), { directPublish: newDirect });
    showAdminToast(newDirect ? "تم منح صلاحية النشر المباشر ✓" : "تم تفعيل المراجعة المسبقة لمنشورات الصحفي");
    openAuthorDossierModal(member.id);
  });

  document.getElementById("dossier-approve-sig-btn")?.addEventListener("click", async () => {
    await updateDoc(doc(db, "staff", member.id), {
      signatureStatus: "approved",
      everApprovedCharter: true
    });
    showAdminToast("تم اعتماد توقيع الميثاق للصحفي ✓");
    openAuthorDossierModal(member.id);
  });

  document.getElementById("dossier-reject-sig-btn")?.addEventListener("click", async () => {
    await updateDoc(doc(db, "staff", member.id), { signatureStatus: "rejected" });
    showAdminToast("تم إرسال طلب تحديث التوقيع للصحفي");
    openAuthorDossierModal(member.id);
  });
}

// ==================== 13. إعدادات المنصة وتحديث إصدار ميثاق الشرف الصحفي ====================
function populateSettingsForm() {
  const s = state.settings;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };

  setVal("set-site-name", s.siteName || "حُجرية بريس");
  setVal("set-logo-url", s.logoUrl || "");
  setVal("set-site-desc", s.siteDescription || "");
  setVal("set-charter-html", s.charterHtml || DEFAULT_CHARTER_HTML);

  const verLabel = document.getElementById("current-charter-ver-label");
  if (verLabel) verLabel.textContent = String(s.charterVersion || 1);
}

async function handleSavePlatformSettings(e) {
  e.preventDefault();
  if (!isUserAdmin(state.currentUser)) return;

  const siteName = (document.getElementById("set-site-name")?.value || "").trim() || "حُجرية بريس";
  const logoUrl = (document.getElementById("set-logo-url")?.value || "").trim();
  const siteDescription = (document.getElementById("set-site-desc")?.value || "").trim();
  const charterHtml = (document.getElementById("set-charter-html")?.value || "").trim() || DEFAULT_CHARTER_HTML;
  const bumpVersion = Boolean(document.getElementById("bump-charter-version-chk")?.checked);

  const nextVersion = bumpVersion
    ? Number(state.settings.charterVersion || 1) + 1
    : Number(state.settings.charterVersion || 1);

  const payload = {
    siteName,
    logoUrl,
    siteDescription,
    charterHtml,
    charterVersion: nextVersion,
    updatedAt: Date.now()
  };

  try {
    await setDoc(doc(db, "settings", "general"), payload, { merge: true });
    const chk = document.getElementById("bump-charter-version-chk");
    if (chk) chk.checked = false;
    showAdminToast(
      bumpVersion
        ? `تم حفظ الميثاق وترقية الإصدار إلى (${nextVersion}) وإشعار جميع الصحفيين للتوقيع ✓`
        : "تم حفظ إعدادات المنصة وميثاق الشرف بنجاح ✓"
    );
  } catch (err) {
    console.error(err);
    showAdminToast("حدث خطأ أثناء حفظ الإعدادات");
  }
}

// ==================== 14. إدارة التنقل وربط الأحداث والمزامنة الحية ====================
function switchNewsroomView(targetViewId) {
  state.activeView = targetViewId;

  document.querySelectorAll(".nr-view").forEach((sec) => {
    sec.classList.toggle("hidden", sec.id !== targetViewId);
  });

  document.querySelectorAll("#main-admin-nav .nav-btn[data-target-view]").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-target-view") === targetViewId);
  });

  if (targetViewId === "view-write-studio") {
    populateStudioCategoriesSelect();
  } else if (targetViewId === "view-profile") {
    populateMyProfileView();
  } else if (targetViewId === "view-reviews" || targetViewId === "view-staff") {
    renderAdminReviewsAndStaff();
  } else if (targetViewId === "view-settings") {
    populateSettingsForm();
  } else {
    renderDashboardAndMyArticles();
  }
}

function bindAllNewsroomEvents() {
  // 1. أزرار التنقل العلوية/السفلية
  document.querySelectorAll("#main-admin-nav .nav-btn[data-target-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchNewsroomView(btn.getAttribute("data-target-view"));
    });
  });

  document.getElementById("nr-logout-btn")?.addEventListener("click", handleLogout);

  // 2. تبويبات ونماذج تسجيل الدخول
  const tabStd = document.getElementById("tab-auth-standard");
  const tabPin = document.getElementById("tab-auth-pin");
  const formStd = document.getElementById("nr-standard-login-form");
  const formPin = document.getElementById("nr-pin-login-form");

  tabStd?.addEventListener("click", () => {
    tabStd.classList.add("active");
    tabPin?.classList.remove("active");
    formStd?.classList.remove("hidden");
    formPin?.classList.add("hidden");
  });

  tabPin?.addEventListener("click", () => {
    tabPin.classList.add("active");
    tabStd?.classList.remove("active");
    formPin?.classList.remove("hidden");
    formStd?.classList.add("hidden");
    document.getElementById("login-pin-input")?.focus();
  });

  formStd?.addEventListener("submit", (e) => {
    e.preventDefault();
    const idVal = document.getElementById("login-identifier")?.value || "";
    const passVal = document.getElementById("login-password")?.value || "";
    const user = authenticateCredentials(idVal, passVal);
    if (!user) {
      showAdminToast("بيانات الدخول غير صحيحة. تأكد من الهوية الصحفية (HP) أو اسم المستخدم وكلمة المرور.");
      return;
    }
    setLoggedInUser(user);
    showAdminToast(`مرحباً بك في غرفة الأخبار: ${user.name}`);
  });

  formPin?.addEventListener("submit", (e) => {
    e.preventDefault();
    const pinVal = document.getElementById("login-pin-input")?.value || "";
    const user = authenticateByPin(pinVal);
    if (!user) {
      showAdminToast("رمز الدخول السريع (PIN) غير صحيح");
      return;
    }
    setLoggedInUser(user);
    showAdminToast(`مرحباً بك: ${user.name}`);
  });

  // 3. أزرار مراحل استديو صياغة الأخبار (Multi-Step Wizard)
  document.querySelectorAll(".btn-next-step").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextStep = Number(btn.getAttribute("data-next") || state.studioStep + 1);
      goToStudioStep(nextStep);
    });
  });

  document.querySelectorAll(".btn-prev-step").forEach((btn) => {
    btn.addEventListener("click", () => {
      const prevStep = Number(btn.getAttribute("data-prev") || state.studioStep - 1);
      goToStudioStep(prevStep);
    });
  });

  // الحفظ التلقائي الفوري عند الكتابة في أي حقل داخل الاستديو
  [
    "post-title",
    "post-summary",
    "post-tags",
    "post-image-url-input",
    "post-video-url",
    "post-video-type"
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      if (id === "post-image-url-input") {
        renderStudioMainImagePreview(document.getElementById(id).value.trim());
      }
      triggerStudioAutoSave();
    });
  });

  document.getElementById("rich-text-editor")?.addEventListener("input", triggerStudioAutoSave);

  // رفع وضغط الصورة البارزة للخبر
  document.getElementById("post-main-image")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showAdminToast("جاري ضغط وتجهيز الصورة البارزة...");
      const compressed = await compressImageFileToDataUrl(file, 1150, 0.8);
      state.studioMainImageData = compressed;
      renderStudioMainImagePreview(compressed);
      triggerStudioAutoSave();
      showAdminToast("تم تجهيز الصورة البارزة بنجاح ✓");
    } catch (_) {
      showAdminToast("تعذر قراءة ملف الصورة");
    }
  });

  // شريط أدوات محرر النصوص الواسع + إدراج الصور المتعددة بين الفقرات
  document.querySelectorAll(".editor-toolbar .toolbar-btn[data-command]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cmd = btn.getAttribute("data-command");
      const val = btn.getAttribute("data-value") || null;
      document.execCommand(cmd, false, val);
      document.getElementById("rich-text-editor")?.focus();
      triggerStudioAutoSave();
    });
  });

  const inlineImgInput = document.createElement("input");
  inlineImgInput.type = "file";
  inlineImgInput.accept = "image/*";
  inlineImgInput.className = "hidden";
  document.body.appendChild(inlineImgInput);

  document.getElementById("insert-inline-img-btn")?.addEventListener("click", () => {
    inlineImgInput.click();
  });

  inlineImgInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showAdminToast("جاري ضغط وإدراج الصورة داخل المقال...");
      const dataUrl = await compressImageFileToDataUrl(file, 1000, 0.78);
      const caption = prompt("اكتب وصفاً توضيحياً للصورة (اختياري):") || "";
      const figureHtml = `
        <figure class="inline-article-figure">
          <img src="${dataUrl}" alt="${escapeHtml(caption)}">
          ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
        </figure><p><br></p>
      `;
      const editor = document.getElementById("rich-text-editor");
      if (editor) {
        editor.focus();
        document.execCommand("insertHTML", false, figureHtml);
        triggerStudioAutoSave();
      }
      inlineImgInput.value = "";
    } catch (_) {
      showAdminToast("تعذر إدراج الصورة");
    }
  });

  document.getElementById("insert-link-btn")?.addEventListener("click", () => {
    const url = prompt("أدخل الرابط الكامل (https://...):", "https://");
    if (url && url !== "https://") {
      document.execCommand("createLink", false, url.trim());
      triggerStudioAutoSave();
    }
  });

  // أزرار الحفظ كمسودة والنشر
  document.getElementById("save-draft-btn")?.addEventListener("click", () => {
    handleSaveOrPublishArticle(true);
  });

  document.getElementById("publish-article-btn")?.addEventListener("click", () => {
    handleSaveOrPublishArticle(false);
  });

  // 4. تبويبات صفحة المراجعات للأدمن
  document.querySelectorAll(".admin-tab-btn[data-tab-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab-target");
      document.querySelectorAll(".admin-tab-btn").forEach((b) =>
        b.classList.toggle("active", b === btn)
      );
      document.querySelectorAll(".admin-tab-content").forEach((pane) =>
        pane.classList.toggle("hidden", pane.id !== targetId)
      );
    });
  });

  // 5. البحث الفوري الذكي في سجل الكادر بالهوية الصحفية (HP) أو الاسم
  document.getElementById("staff-search-input")?.addEventListener("input", () => {
    renderStaffDirectoryGrid();
  });

  // 6. نافذة إضافة صحفي جديد وتوليد هوية صحفية (HP#####)
  document.getElementById("open-add-staff-modal-btn")?.addEventListener("click", () => {
    document.getElementById("add-staff-overlay")?.classList.remove("hidden");
  });

  document.getElementById("close-add-staff-btn")?.addEventListener("click", () => {
    document.getElementById("add-staff-overlay")?.classList.add("hidden");
  });

  document.getElementById("add-staff-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isUserAdmin(state.currentUser)) return;

    const name = (document.getElementById("new-staff-name")?.value || "").trim();
    const jobTitle = (document.getElementById("new-staff-job")?.value || "").trim() || "محرر صحفي";
    const username = (document.getElementById("new-staff-username")?.value || "").trim();
    const password = (document.getElementById("new-staff-password")?.value || "").trim();
    const pinCode = (document.getElementById("new-staff-pin")?.value || "").trim();
    const role = document.getElementById("new-staff-role")?.value || "writer";

    if (!name || !username || !password) return;

    const newPressId = generateUniquePressId(state.staff);
    const newStaffPayload = {
      pressId: newPressId,
      name,
      jobTitle,
      username,
      password,
      pinCode,
      role,
      directPublish: role === "trusted_writer" || role === "admin",
      verified: role === "admin",
      signatureStatus: "none",
      signedCharterVersion: 0,
      createdAt: Date.now()
    };

    try {
      await addDoc(collection(db, "staff"), newStaffPayload);
      document.getElementById("add-staff-form")?.reset();
      document.getElementById("add-staff-overlay")?.classList.add("hidden");
      showAdminToast(`تم إنشاء حساب الصحفي وتخصيص الهوية الصحفية: ${newPressId} ✓`);
    } catch (_) {
      showAdminToast("تعذر إنشاء الحساب");
    }
  });

  // 7. إغلاق نافذة الملف الشخصي الشامل (Dossier)
  document.getElementById("close-dossier-modal-btn")?.addEventListener("click", () => {
    document.getElementById("author-dossier-overlay")?.classList.add("hidden");
  });

  // 8. أحداث نموذج التوثيق (KYC) وحساب العمر الفوري
  document.getElementById("kyc-dob")?.addEventListener("change", (e) => {
    updateLiveCalculatedAgeDisplay(e.target.value);
  });

  document.getElementById("kyc-form")?.addEventListener("submit", handleKycFormSubmission);

  // 9. حفظ إعدادات المنصة وميثاق الشرف
  document
    .getElementById("platform-settings-form")
    ?.addEventListener("submit", handleSavePlatformSettings);
}

// ==================== 15. المزامنة الخلفية مع Firestore وتشغيل غرفة الأخبار ====================
function restoreSavedSessionIfAvailable() {
  try {
    const raw = localStorage.getItem(NR_SESSION_KEY);
    if (!raw) {
      document.getElementById("nr-login-gate")?.classList.remove("hidden");
      return;
    }
    const saved = JSON.parse(raw);
    if (saved?.id === "master-admin" || saved?.pressId === "HP10001") {
      setLoggedInUser({ ...MASTER_ADMIN_FALLBACK });
      return;
    }
    const found = state.staff.find(
      (s) => s.id === saved?.id || normalizePressId(s.pressId) === normalizePressId(saved?.pressId)
    );
    if (found) {
      setLoggedInUser(found);
    } else {
      document.getElementById("nr-login-gate")?.classList.remove("hidden");
    }
  } catch (_) {
    document.getElementById("nr-login-gate")?.classList.remove("hidden");
  }
}

function startNewsroomFirestoreSync() {
  onSnapshot(doc(db, "settings", "general"), (snap) => {
    if (snap.exists()) {
      state.settings = { ...state.settings, ...snap.data() };
      saveNewsroomCache();
      evaluateCharterPledgeRequirement();
      if (state.activeView === "view-settings") populateSettingsForm();
    }
  });

  onSnapshot(collection(db, "categories"), (snap) => {
    if (!snap.empty) {
      state.compasses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      populateStudioCategoriesSelect();
      saveNewsroomCache();
    }
  });

  onSnapshot(collection(db, "staff"), async (snap) => {
    state.staff = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    await ensureAllStaffHavePressIds();
    saveNewsroomCache();

    if (state.currentUser && state.currentUser.id !== "master-admin") {
      const updatedMe = state.staff.find((s) => s.id === state.currentUser.id);
      if (updatedMe) {
        state.currentUser = { ...state.currentUser, ...updatedMe };
        evaluateCharterPledgeRequirement();
      }
    } else if (!state.currentUser) {
      restoreSavedSessionIfAvailable();
    }

    if (isUserAdmin(state.currentUser)) {
      renderAdminReviewsAndStaff();
    }
  });

  onSnapshot(collection(db, "posts"), (snap) => {
    state.posts = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => getTimestampMs(b) - getTimestampMs(a));

    saveNewsroomCache();
    renderDashboardAndMyArticles();
    if (isUserAdmin(state.currentUser)) {
      renderAdminReviewsAndStaff();
    }
  });
}

// نقطة الانطلاق الفورية لغرفة الأخبار (0ms Startup)
document.addEventListener("DOMContentLoaded", () => {
  injectEnhancedNewsroomShell();
  restoreNewsroomCache();
  populateStudioCategoriesSelect();
  initSignatureCanvasPad();
  bindAllNewsroomEvents();
  restoreStudioAutoSavedDraft();
  restoreSavedSessionIfAvailable();
  startNewsroomFirestoreSync();
});
