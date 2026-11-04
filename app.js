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
