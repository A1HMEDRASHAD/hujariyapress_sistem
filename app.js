/* ==========================================================================
   حُجرية بريس (Hujariya Press) — المحرك البرمجي الشامل لغرفة الأخبار (admin-app.js)
   - سرعة استجابة فورية (0ms Local Cache) للعمل بكفاءة تحت الإنترنت الضعيف
   - الهوية الصحفية الثابتة (HP##### بدون شرطة) لتسجيل الدخول والبحث الفوري
   - التوقيع الرقمي الثلاثي لميثاق الشرف للجدد + تحديث غير معطل للعمل للمعتمدين
   - الملف الشخصي الشامل (Dossier) + حساب العمر التلقائي + واتساب وبريد مباشر + تحقق KYC
   - استديو النشر المرحلي (Multi-Step Studio) مع حفظ تلقائي للمرحلة والمحتوى وإدراج صور متعددة
   - التزام صارم بالهوية القرمزية (#b80d38) وأيقونات Google Material Symbols الرسمية فقط
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

const NEWSROOM_CACHE_KEY = "hujariya_newsroom_fast_cache_v5";
constSESSION_USER_KEY = "hujariya_newsroom_session_v5";
const STUDIO_AUTOSAVE_KEY = "hujariya_studio_autosave_v5";

const DEFAULT_CATEGORIES = [
  { id: "yemen-politics", name: "السياسة اليمنية", subcategories: ["الشرعية ومؤسسات الدولة", "التحليلات الاستراتيجية", "الشأن المحلي والمحافظات", "كشف زيف الميليشيات"] },
  { id: "saudi-politics", name: "السياسة السعودية", subcategories: ["الأمن القومي المشترك", "الدبلوماسية الإقليمية", "رؤية المملكة 2030", "المشاريع التنموية"] },
  { id: "regional-international", name: "إقليمي ودولي", subcategories: ["الشرق الأوسط", "السياسة الدولية", "أمن البحر الأحمر والممرات"] },
  { id: "economy-dev", name: "اقتصاد وأسواق", subcategories: ["أسواق وعملات", "طاقة ونفط", "إعمار وتنمية", "بورصات عالمية"] },
  { id: "sports", name: "الرياضة", subcategories: ["الكرة اليمنية", "الدوري السعودي", "الكرة العالمية", "بطولات دولية"] },
  { id: "health-science", name: "صحة وعلوم وفضاء", subcategories: ["طب وصحة", "أبحاث الفضاء والفلك", "اكتشافات علمية", "بيئة ومناخ"] },
  { id: "tech-future", name: "تقنية ومستقبل", subcategories: ["الذكاء الاصطناعي", "الأمن السيبراني", "تطبيقات ومنصات", "ابتكارات"] },
  { id: "culture-thought", name: "ثقافة وفكر", subcategories: ["أدب وفكر", "تاريخ وهوية", "قراءات وكتب", "مقالات الرأي"] },
  { id: "art-media", name: "فن وإعلام", subcategories: ["فن ودراما", "إعلام رقمي", "تراث وفنون"] }
];

const DEFAULT_CHARTER_HTML = `
  <h3>ميثاق الشرف الصحفي والتحريري — حُجرية بريس</h3>
  <p>بصفتي صحفياً وكاتباً في منصة <strong>حُجرية بريس (Hujariya Press)</strong>، أقر وأتعهد بالالتزام الكامل بالمعايير المهنية والوطنية التالية:</p>
  <ol>
    <li><strong>المصداقية والتحقق:</strong> تحري الدقة التامة والتثبت من صحة الأخبار والمصادر قبل النشر والابتعاد عن الشائعات.</li>
    <li><strong>الثوابت الوطنية:</strong> احترام السيادة الوطنية ومؤسسات الدولة الشرعية والأمن القومي العربي والمشترك.</li>
    <li><strong>الأمانة المهنية:</strong> عدم انتحال المقالات أو المواد الإعلامية وحفظ الحقوق الفكرية لأصحابها.</li>
    <li><strong>المسؤولية القانونية:</strong> تحمّل المسؤولية المهنية والقانونية الكاملة عن المواد التي أقوم بصياغتها ونشرها عبر حسابي الرسمي.</li>
  </ol>
`;

// ==================== 2. حالة غرفة الأخبار (Newsroom State) ====================
const nrState = {
  currentUser: null,
  settings: {
    siteName: "حُجرية بريس",
    charterHtml: DEFAULT_CHARTER_HTML,
    charterVersion: 1,
    unifiedTags: ["اليمن", "السعودية", "تعز", "الحجرية", "عدن", "صنعاء", "الرياض", "عاجل", "تحليل_سياسي", "اقتصاد"]
  },
  categories: [...DEFAULT_CATEGORIES],
  staff: [],
  posts: [],
  currentStep: 1,
  editingPostId: null,
  mainImageDataUrl: "",
  capturedSignatures: [],
  requiredSignatureCount: 3,
  isUpdateCharterMode: false,
  selectedDossierStaffId: null
};

// ==================== 3. دوال مساعدة (الأمان، الهوية الصحفية، حساب العمر، وضغط الصور) ====================
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showAdminToast(message) {
  const toast = document.getElementById("admin-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(window.__nrToastTimer);
  window.__nrToastTimer = setTimeout(() => toast.classList.add("hidden"), 3200);
}

// توليد هوية صحفية فريدة بصيغة HP متبوعة بـ 5 أرقام بدون شرطة (مثال: HP10482)
function generateUniquePressId(existingStaff = []) {
  const usedIds = new Set(
    existingStaff.map((s) => String(s.pressId || "").toUpperCase().replace(/[^A-Z0-9]/g, ""))
  );
  for (let i = 0; i < 500; i++) {
    const fiveDigits = Math.floor(10000 + Math.random() * 90000);
    const candidate = `HP${fiveDigits}`;
    if (!usedIds.has(candidate)) return candidate;
  }
  return `HP${String(Date.now()).slice(-5)}`;
}

function normalizePressId(raw = "") {
  const clean = String(raw || "").trim().toUpperCase().replace(/[\s-]+/g, "");
  if (/^HP\d{5}$/.test(clean)) return clean;
  return "";
}

// حساب العمر التلقائي الدقيق بالسنوات من تاريخ الميلاد
function calculateExactAgeFromDob(dobString = "") {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 && age < 120 ? age : null;
}

function getTimestampMs(item) {
  const t = item?.createdAt || item?.updatedAt || item?.signedAt;
  if (!t) return 0;
  if (typeof t.toMillis === "function") return t.toMillis();
  if (typeof t.seconds === "number") return t.seconds * 1000;
  const parsed = new Date(t).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

function formatArabicDateTime(itemOrMs) {
  const ms = typeof itemOrMs === "number" ? itemOrMs : getTimestampMs(itemOrMs);
  if (!ms) return "منذ قليل";
  return new Date(ms).toLocaleDateString("ar-YE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ضغط الصور برمجياً لتعمل غرفة الأخبار بسرعة فائقة حتى مع الإنترنت الضعيف
function compressImageFileToDataUrl(file, maxWidth = 1080, quality = 0.78) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isUserMasterOrAdmin(user) {
  if (!user) return false;
  return Boolean(user.isMasterAdmin || user.role === "admin" || user.role === "editor_in_chief");
}

function canUserPublishDirectly(user) {
  if (!user) return false;
  return Boolean(isUserMasterOrAdmin(user) || user.canPublishDirectly || user.directPublish);
}

// ==================== 4. التخزين المحلي الفوري (0ms Local Cache) ====================
function saveNewsroomCache() {
  try {
    localStorage.setItem(
      NEWSROOM_CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        settings: nrState.settings,
        categories: nrState.categories,
        staff: nrState.staff,
        posts: nrState.posts.slice(0, 100)
      })
    );
  } catch (_) {}
}

function restoreNewsroomCache() {
  try {
    const raw = localStorage.getItem(NEWSROOM_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.settings) nrState.settings = { ...nrState.settings, ...parsed.settings };
    if (Array.isArray(parsed?.categories) && parsed.categories.length) {
      nrState.categories = parsed.categories;
    }
    if (Array.isArray(parsed?.staff)) nrState.staff = parsed.staff;
    if (Array.isArray(parsed?.posts)) nrState.posts = parsed.posts;
  } catch (_) {}
}

// ==================== 5. حقن العناصر التكميلية وتطهير الواجهة من أي إيموجي ====================
function enhanceNewsroomDomAndStyles() {
  // حقن تنسيقات إضافية دقيقة للواجهة، شاشة الدخول، التوقيعات الثلاثة، والملف الشخصي الشامل (Dossier)
  const extraStyle = document.createElement("style");
  extraStyle.textContent = `
    .nr-icon-inline { vertical-align: middle; font-size: 19px; color: var(--brand-red); margin-left: 4px; }
    .nr-card-surface { background: #fff; border: 1px solid var(--border-light); border-radius: 8px; padding: 18px; margin-bottom: 16px; box-shadow: 0 3px 12px rgba(184,13,56,0.05); }
    .dashboard-grid { display: grid; grid-template-columns: 1fr; gap: 18px; }
    .quick-stats-card { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; background: #fff; border: 1px solid var(--border-light); border-right: 4px solid var(--brand-red); border-radius: 8px; padding: 16px; }
    .stat-item { background: #f8f9fb; padding: 12px; border-radius: 6px; border: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 4px; }
    .stat-label { font-size: 0.8rem; color: #636770; font-weight: 700; }
    .stat-value { font-size: 1.45rem; font-weight: 900; color: var(--brand-red); }
    .articles-list { display: flex; flex-direction: column; gap: 10px; }
    .nr-post-row { background: #fff; border: 1px solid var(--border-light); border-radius: 8px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .nr-post-row:hover { border-color: rgba(184,13,56,0.35); }
    .status-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 99px; font-size: 0.74rem; font-weight: 800; }
    .st-pub { background: #dcfce7; color: #15803d; }
    .st-pend { background: #fef3c7; color: #b45309; }
    .st-draft { background: #f1f5f9; color: #475569; }
    .char-counter-badge { float: left; font-size: 0.75rem; font-weight: 800; color: var(--brand-red); background: rgba(184,13,56,0.08); padding: 2px 8px; border-radius: 99px; }
    .sig-slots-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 10px 0; }
    .sig-slot-box { border: 1.5px dashed var(--border-light); border-radius: 6px; height: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fafafa; overflow: hidden; position: relative; font-size: 0.72rem; color: #666; font-weight: 700; }
    .sig-slot-box.filled { border-style: solid; border-color: #16a34a; background: #f0fdf4; }
    .sig-slot-box img { max-height: 56px; object-fit: contain; }
    .charter-update-banner { background: #fff8f1; border: 1px solid #fdba74; border-right: 4px solid var(--brand-red); padding: 10px 16px; border-radius: 8px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; font-size: 0.85rem; font-weight: 700; }
    .staff-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 14px; margin-top: 14px; }
    .staff-card { background: #fff; border: 1px solid var(--border-light); border-right: 4px solid var(--brand-red); border-radius: 8px; padding: 15px; cursor: pointer; transition: all 0.2s ease; display: flex; flex-direction: column; gap: 10px; }
    .staff-card:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(184,13,56,0.12); }
    .staff-card-top { display: flex; align-items: center; gap: 11px; }
    .staff-card-top img, .profile-avatar { width: 54px; height: 54px; border-radius: 50%; object-fit: cover; border: 2px solid var(--brand-red); }
    .age-live-badge { display: inline-flex; align-items: center; gap: 4px; background: rgba(184,13,56,0.09); color: var(--brand-red); padding: 3px 9px; border-radius: 99px; font-size: 0.76rem; font-weight: 800; }
    .contact-action-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 6px; font-size: 0.78rem; font-weight: 800; text-decoration: none; border: 1px solid var(--border-light); background: #fff; color: var(--text-main); }
    .contact-action-btn.wa-btn { background: #16a34a; color: #fff; border-color: #16a34a; }
    .contact-action-btn.mail-btn { background: var(--brand-red); color: #fff; border-color: var(--brand-red); }
    .tabs-header { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; border-bottom: 1px solid var(--border-light); padding-bottom: 10px; }
    .tab-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 6px; border: 1px solid var(--border-light); background: #fff; font-weight: 800; cursor: pointer; }
    .tab-btn.active { background: var(--brand-red); color: #fff; border-color: var(--brand-red); }
    .nr-login-overlay { position: fixed; inset: 0; background: #f4f6f8; z-index: 9500; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .nr-login-card { background: #fff; width: 100%; max-width: 430px; border-radius: 10px; border-top: 5px solid var(--brand-red); padding: 28px 24px; box-shadow: 0 12px 36px rgba(184,13,56,0.14); }
    .dossier-modal-overlay { position: fixed; inset: 0; background: rgba(12,13,14,0.68); backdrop-filter: blur(4px); z-index: 9200; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .dossier-modal-sheet { background: #fff; width: 100%; max-width: 860px; max-height: 90vh; overflow-y: auto; border-radius: 10px; border-top: 5px solid var(--brand-red); padding: 24px; box-shadow: 0 16px 48px rgba(0,0,0,0.28); }
    .kyc-docs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 10px; }
    .kyc-doc-box { border: 1px solid var(--border-light); border-radius: 6px; padding: 8px; background: #fafafa; text-align: center; }
    .kyc-doc-box img { width: 100%; height: 120px; object-fit: cover; border-radius: 4px; margin-top: 6px; }
    .tag-sug-chip { display: inline-block; padding: 4px 10px; margin: 3px; border-radius: 99px; background: #f1f5f9; border: 1px solid var(--border-light); font-size: 0.75rem; font-weight: 800; cursor: pointer; }
    .tag-sug-chip:hover { background: var(--brand-red); color: #fff; border-color: var(--brand-red); }
  `;
  document.head.appendChild(extraStyle);

  // 1. تطهير تبويبات المراجعة من أي إيموجي واستبدالها بأيقونات Google Material Symbols الرسمية
  const tabPostsBtn = document.querySelector('[data-tab="tab-rev-posts"]');
  if (tabPostsBtn) {
    tabPostsBtn.innerHTML = `<span class="material-symbols-rounded" translate="no">article</span><span>مراجعة الأخبار</span>`;
  }
  const tabSigsBtn = document.querySelector('[data-tab="tab-rev-sigs"]');
  if (tabSigsBtn) {
    tabSigsBtn.innerHTML = `<span class="material-symbols-rounded" translate="no">draw</span><span>مراجعة التوقيعات</span>`;
  }
  const tabVerifyBtn = document.querySelector('[data-tab="tab-rev-verify"]');
  if (tabVerifyBtn) {
    tabVerifyBtn.innerHTML = `<span class="material-symbols-rounded" translate="no">verified_user</span><span>طلبات التوثيق والهوية</span>`;
  }

  // 2. إضافة زر إعدادات الميثاق والمنصة للأدمن + زر تسجيل الخروج في الهيدر
  const headerNav = document.querySelector(".header-nav");
  if (headerNav && !document.getElementById("nav-settings-btn")) {
    const settingsBtn = document.createElement("button");
    settingsBtn.type = "button";
    settingsBtn.id = "nav-settings-btn";
    settingsBtn.className = "nav-btn hidden";
    settingsBtn.setAttribute("data-target-view", "view-settings");
    settingsBtn.innerHTML = `<span class="material-symbols-rounded" translate="no">policy</span><span>إعدادات الميثاق</span>`;
    headerNav.appendChild(settingsBtn);

    const logoutBtn = document.createElement("button");
    logoutBtn.type = "button";
    logoutBtn.id = "nav-logout-btn";
    logoutBtn.className = "nav-btn";
    logoutBtn.title = "تسجيل الخروج";
    logoutBtn.innerHTML = `<span class="material-symbols-rounded" translate="no">logout</span>`;
    headerNav.appendChild(logoutBtn);
  }

  // 3. ترقية نافذة التوقيع لدعم التوقيعات الثلاثة المتطابقة + زر تخطي مؤقت عند التحديث
  const sigArea = document.querySelector(".pledge-signature-area");
  if (sigArea && !document.getElementById("sig-slots-container")) {
    const noticeDiv = document.createElement("div");
    noticeDiv.id = "pledge-rule-notice";
    noticeDiv.style.cssText = "font-size:0.82rem;color:#b80d38;font-weight:800;margin-bottom:8px;";
    noticeDiv.textContent = "تنبيه: يرجى رسم توقيعك الرسمي 3 مرات متطابقة ليتم إحالته لاعتماد رئيس التحرير.";
    sigArea.insertBefore(noticeDiv, sigArea.firstChild);

    const slotsDiv = document.createElement("div");
    slotsDiv.id = "sig-slots-container";
    slotsDiv.className = "sig-slots-grid";
    slotsDiv.innerHTML = `
      <div class="sig-slot-box" id="sig-slot-1">التوقيع الأول (1/3)</div>
      <div class="sig-slot-box" id="sig-slot-2">التوقيع الثاني (2/3)</div>
      <div class="sig-slot-box" id="sig-slot-3">التوقيع الثالث (3/3)</div>
    `;
    sigArea.insertBefore(slotsDiv, document.querySelector(".signature-actions"));

    const sigActions = document.querySelector(".signature-actions");
    if (sigActions) {
      sigActions.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:10px;";
      sigActions.innerHTML = `
        <div style="display:flex;gap:8px;">
          <button type="button" id="clear-signature-btn" class="btn-secondary">مسح اللوحة</button>
          <button type="button" id="capture-sig-step-btn" class="btn-secondary" style="border:1px solid var(--brand-red);color:var(--brand-red);">تثبيت التوقيع في الخانة</button>
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" id="postpone-charter-btn" class="btn-secondary hidden">تأجيل مؤقت لمتابعة العمل</button>
          <button type="button" id="submit-pledge-btn" class="btn-primary">اعتماد وإرسال التوقيع</button>
        </div>
      `;
    }
  }

  // 4. استكمال حقول استديو النشر المرحلي (عدادات الحروف، الفرعيات، الفيديو، الخبر العاجل، وإدراج الصور)
  const step1 = document.getElementById("studio-step-1");
  if (step1 && !document.getElementById("title-char-counter")) {
    const titleLabel = step1.querySelector("label");
    if (titleLabel) {
      titleLabel.innerHTML = `العنوان الرئيسي للخبر <span id="title-char-counter" class="char-counter-badge">0 / 110</span>`;
    }
    const sumLabels = step1.querySelectorAll("label");
    if (sumLabels[1]) {
      sumLabels[1].innerHTML = `الملخص الإخباري (الزبدة لمحركات البحث) <span id="summary-char-counter" class="char-counter-badge">0 / 220</span>`;
      document.getElementById("post-summary")?.setAttribute("maxlength", "220");
    }

    const flagsDiv = document.createElement("div");
    flagsDiv.className = "form-group";
    flagsDiv.style.cssText = "display:flex;gap:16px;flex-wrap:wrap;background:#f8f9fb;padding:12px;border-radius:6px;border:1px solid var(--border-light);";
    flagsDiv.innerHTML = `
      <label style="display:inline-flex;align-items:center;gap:6px;margin:0;cursor:pointer;">
        <input type="checkbox" id="post-is-breaking"> <span>خبر عاجل (شريط العاجل)</span>
      </label>
      <label style="display:inline-flex;align-items:center;gap:6px;margin:0;cursor:pointer;">
        <input type="checkbox" id="post-is-quick"> <span>موجز النبض السريع</span>
      </label>
      <label style="display:inline-flex;align-items:center;gap:6px;margin:0;cursor:pointer;">
        <input type="checkbox" id="post-is-featured"> <span>تغطية رئيسية (Hero)</span>
      </label>
    `;
    step1.insertBefore(flagsDiv, step1.querySelector(".step-actions"));
  }

  const step2 = document.getElementById("studio-step-2");
  if (step2 && !document.getElementById("post-subcategory")) {
    const extraStep2 = document.createElement("div");
    extraStep2.innerHTML = `
      <div class="form-group">
        <label>التصنيف الفرعي</label>
        <select id="post-subcategory" class="form-select"></select>
      </div>
      <div class="form-group">
        <label>أو رابط مباشر للصورة البارزة (اختياري)</label>
        <input type="url" id="post-image-url" class="form-input" placeholder="https://..." dir="ltr">
        <div id="main-image-preview-box" class="hidden" style="margin-top:8px;">
          <img id="main-image-preview-el" src="" alt="" style="max-height:130px;border-radius:6px;border:1px solid var(--border-light);">
        </div>
      </div>
      <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label>رابط فيديو (يوتيوب أو MP4 - اختياري)</label>
          <input type="url" id="post-video-url" class="form-input" placeholder="https://youtube.com/..." dir="ltr">
        </div>
        <div>
          <label>نمط عرض الفيديو</label>
          <select id="post-video-type" class="form-select">
            <option value="none">بدون فيديو</option>
            <option value="standard">فيديو عريض (16:9)</option>
            <option value="short_vertical">فيديو قصير عمودي (9:16)</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>الوسوم الموحدة المقترحة (اضغط لإضافتها بحد أقصى 3 وسوم لتحسين SEO)</label>
        <div id="unified-tags-suggestions"></div>
      </div>
    `;
    step2.insertBefore(extraStep2, step2.querySelector(".step-actions"));
  }

  // إضافة مدخل خفي لرفع الصور المتعددة بين الفقرات في الخطوة 3
  const step3 = document.getElementById("studio-step-3");
  if (step3 && !document.getElementById("inline-image-file-input")) {
    const fileInp = document.createElement("input");
    fileInp.type = "file";
    fileInp.id = "inline-image-file-input";
    fileInp.accept = "image/*";
    fileInp.className = "hidden";
    step3.appendChild(fileInp);
  }

  // 5. استكمال حقول الملف الشخصي ونموذج الهوية الرسمية (KYC) وحساب العمر التلقائي
  const profileForm = document.querySelector("#view-profile .profile-form");
  if (profileForm && !document.getElementById("my-contact-email")) {
    const headerInfo = document.querySelector("#view-profile .profile-header-info");
    if (headerInfo) {
      const ageSpan = document.createElement("div");
      ageSpan.style.marginTop = "6px";
      ageSpan.innerHTML = `<span id="my-live-age-badge" class="age-live-badge">العمر: غير محدد</span> <span id="my-verify-status-badge" class="status-pill st-draft">غير موثق</span>`;
      headerInfo.querySelector("div")?.appendChild(ageSpan);
    }

    profileForm.innerHTML = `
      <div class="aj-block-header" style="margin-top:18px;">
        <span class="aj-crimson-pillar"></span>
        <h3>البيانات المهنية والتواصل المباشر مع الإدارة</h3>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;">
        <div class="form-group">
          <label>الاسم الصحفي الظاهر للقراء</label>
          <input type="text" id="my-display-name" class="form-input">
        </div>
        <div class="form-group">
          <label>اسم المستخدم (يمكنك تغييره متى شئت)</label>
          <input type="text" id="my-username-input" class="form-input" dir="ltr">
        </div>
        <div class="form-group">
          <label>الصفة الصحفية / المسمى الوظيفي</label>
          <input type="text" id="my-job-title" class="form-input" placeholder="مثال: محرر الشؤون السياسية">
        </div>
        <div class="form-group">
          <label>الرمز السريع للدخول (PIN من 4 أرقام)</label>
          <input type="password" id="my-pin-code" class="form-input" maxlength="6" dir="ltr" placeholder="****">
        </div>
        <div class="form-group">
          <label>البريد الإلكتروني للتواصل (اختياري)</label>
          <input type="email" id="my-contact-email" class="form-input" dir="ltr" placeholder="name@example.com">
        </div>
        <div class="form-group">
          <label>رقم الجوال (واتساب للتواصل المباشر)</label>
          <input type="tel" id="my-whatsapp" class="form-input" dir="ltr" placeholder="+9677...">
        </div>
      </div>
      <div class="form-group">
        <label>النبذة التعريفية المختصرة</label>
        <textarea id="my-bio-input" class="form-textarea" rows="2"></textarea>
      </div>
      <div class="form-group">
        <label>تحديث الصورة الشخصية</label>
        <input type="file" id="my-avatar-file" class="form-input" accept="image/*">
      </div>
      <button type="button" id="save-basic-profile-btn" class="btn-primary">حفظ البيانات المهنية</button>

      <div class="aj-block-header" style="margin-top:28px;">
        <span class="aj-crimson-pillar"></span>
        <h3>نموذج توثيق الهوية الرسمية والشارة الزرقاء (KYC)</h3>
      </div>
      <p style="font-size:0.84rem;color:#636770;margin-bottom:14px;">
        يرجى إدخال البيانات مطابقة تماماً للوثيقة الرسمية. يتم حساب العمر تلقائياً من تاريخ الميلاد ويظهر للإدارة للتحقق من مطابقة الوثيقة.
      </p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;">
        <div class="form-group">
          <label>الاسم الكامل كما هو مدون في الهوية</label>
          <input type="text" id="kyc-legal-name" class="form-input" placeholder="الاسم الرباعي الرسمي">
        </div>
        <div class="form-group">
          <label>نوع الوثيقة الرسمية</label>
          <select id="kyc-doc-type" class="form-select">
            <option value="id_card">بطاقة شخصية (وجه + ظهر + سيلفي)</option>
            <option value="passport">جواز سفر (صفحة البيانات + سيلفي)</option>
          </select>
        </div>
        <div class="form-group">
          <label>رقم الهوية / جواز السفر</label>
          <input type="text" id="kyc-doc-number" class="form-input" dir="ltr">
        </div>
        <div class="form-group">
          <label>تاريخ الميلاد (يُحسب العمر تلقائياً)</label>
          <input type="date" id="my-dob" class="form-input">
        </div>
        <div class="form-group">
          <label>تاريخ إصدار الوثيقة</label>
          <input type="date" id="kyc-issue-date" class="form-input">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:8px;">
        <div class="form-group">
          <label id="kyc-front-label">1. صورة وجه البطاقة الشخصية (أو الجواز)</label>
          <input type="file" id="kyc-front-file" class="form-input" accept="image/*">
        </div>
        <div class="form-group" id="kyc-back-group">
          <label>2. صورة ظهر البطاقة الشخصية</label>
          <input type="file" id="kyc-back-file" class="form-input" accept="image/*">
        </div>
        <div class="form-group">
          <label>3. صورة سيلفي واضحة لك مع الوثيقة</label>
          <input type="file" id="kyc-selfie-file" class="form-input" accept="image/*">
        </div>
      </div>

      <button type="button" id="request-verification-btn" class="btn-primary" style="margin-top:12px;">
        إرسال بيانات الهوية لطلب التوثيق والشارة الزرقاء
      </button>
    `;
  }

  // 6. إنشاء قسم إعدادات الميثاق وإضافة صحفي جديد للأدمن
  const workspace = document.querySelector(".newsroom-workspace");
  if (workspace && !document.getElementById("view-settings")) {
    const settingsSection = document.createElement("section");
    settingsSection.id = "view-settings";
    settingsSection.className = "nr-view hidden";
    settingsSection.innerHTML = `
      <div class="nr-card-surface">
        <div class="aj-block-header">
          <span class="aj-crimson-pillar"></span>
          <h2>تحرير وتحديث ميثاق الشرف الصحفي</h2>
        </div>
        <p style="font-size:0.85rem;color:#636770;margin-bottom:12px;">
          عند تعديل نص الميثاق والضغط على «حفظ وإصدار تحديث للميثاق»، سيرتفع رقم الإصدار تلقائياً ويظهر تنبيه لجميع الكتّاب لقراءته والتوقيع عليه (دون تعطيل عمل الكتّاب المعتمدين أثناء انتظار مراجعتك لتوقيعهم).
        </p>
        <div class="form-group">
          <label>نص ميثاق الشرف الصحفي (يدعم HTML أو النص المباشر)</label>
          <textarea id="admin-charter-editor" class="form-textarea" rows="8"></textarea>
        </div>
        <button type="button" id="save-charter-bump-btn" class="btn-primary">حفظ وإصدار تحديث للميثاق لكافة الكتّاب</button>
      </div>

      <div class="nr-card-surface">
        <div class="aj-block-header">
          <span class="aj-crimson-pillar"></span>
          <h2>إضافة صحفي أو محرر جديد إلى الكادر</h2>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;">
          <div class="form-group">
            <label>اسم الصحفي</label>
            <input type="text" id="new-staff-name" class="form-input" placeholder="الاسم الكامل">
          </div>
          <div class="form-group">
            <label>اسم المستخدم للدخول</label>
            <input type="text" id="new-staff-username" class="form-input" dir="ltr" placeholder="username">
          </div>
          <div class="form-group">
            <label>كلمة المرور أو رمز PIN</label>
            <input type="text" id="new-staff-password" class="form-input" dir="ltr" placeholder="1234">
          </div>
          <div class="form-group">
            <label>الصلاحية</label>
            <select id="new-staff-role" class="form-select">
              <option value="writer">صحفي / كاتب (يخضع للمراجعة)</option>
              <option value="trusted_writer">صحفي معتمد (نشر مباشر)</option>
              <option value="admin">رئيس تحرير / أدمن</option>
            </select>
          </div>
        </div>
        <button type="button" id="create-new-staff-btn" class="btn-primary">توليد الهوية الصحفية (HP) وإضافة الصحفي</button>
      </div>
    `;
    workspace.appendChild(settingsSection);
  }

  // 7. إنشاء شاشة تسجيل الدخول + نافذة الملف الشامل للصحفي (Dossier Modal)
  if (!document.getElementById("nr-login-overlay")) {
    const loginDiv = document.createElement("div");
    loginDiv.id = "nr-login-overlay";
    loginDiv.className = "nr-login-overlay hidden";
    loginDiv.innerHTML = `
      <div class="nr-login-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
          <span class="aj-crimson-pillar"></span>
          <h2 style="font-size:1.3rem;font-weight:900;">غرفة الأخبار — حُجرية بريس</h2>
        </div>
        <p style="font-size:0.84rem;color:#636770;margin-bottom:18px;">
          سجّل دخولك باستخدام <strong>الهوية الصحفية (مثال: HP10042)</strong> أو <strong>اسم المستخدم</strong> أو البريد الإلكتروني.
        </p>
        <form id="nr-login-form">
          <div class="form-group">
            <label>الهوية الصحفية (HP) أو اسم المستخدم</label>
            <input type="text" id="login-identifier" class="form-input" required placeholder="HP10042 أو username" dir="ltr">
          </div>
          <div class="form-group">
            <label>كلمة المرور أو الرمز السريع (PIN)</label>
            <input type="password" id="login-secret" class="form-input" required placeholder="••••••••" dir="ltr">
          </div>
          <button type="submit" class="btn-primary" style="width:100%;padding:12px;">دخول إلى غرفة الأخبار</button>
        </form>
      </div>
    `;
    document.body.appendChild(loginDiv);
  }

  if (!document.getElementById("staff-dossier-modal")) {
    const dossierModal = document.createElement("div");
    dossierModal.id = "staff-dossier-modal";
    dossierModal.className = "dossier-modal-overlay hidden";
    dossierModal.innerHTML = `
      <div class="dossier-modal-sheet">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-light);padding-bottom:12px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="aj-crimson-pillar"></span>
            <h2 id="dossier-header-title" style="font-size:1.2rem;">الملف الشخصي والقانوني الشامل للصحفي</h2>
          </div>
          <button type="button" id="close-dossier-modal-btn" class="btn-secondary">إغلاق</button>
        </div>
        <div id="dossier-modal-body"></div>
      </div>
    `;
    document.body.appendChild(dossierModal);
  }
}

// ==================== 6. إدارة الجلسة وتسجيل الدخول بالهوية الصحفية (HP#####) أو اسم المستخدم ====================
function checkActiveSessionAndPermissions() {
  try {
    const savedId = localStorage.getItem(SESSION_USER_KEY);
    if (savedId) {
      const matched = nrState.staff.find((s) => s.id === savedId);
      if (matched) {
        nrState.currentUser = matched;
      }
    }
  } catch (_) {}

  const loginOverlay = document.getElementById("nr-login-overlay");
  if (!nrState.currentUser) {
    loginOverlay?.classList.remove("hidden");
    return;
  }

  loginOverlay?.classList.add("hidden");

  // إخفاء أزرار الإدارة عن الكاتب العادي تماماً ليرى واجهة موحدة دون شعور بنقص الصلاحيات
  const isAdmin = isUserMasterOrAdmin(nrState.currentUser);
  document.getElementById("nav-reviews-btn")?.classList.toggle("hidden", !isAdmin);
  document.getElementById("nav-staff-btn")?.classList.toggle("hidden", !isAdmin);
  document.getElementById("nav-settings-btn")?.classList.toggle("hidden", !isAdmin);

  evaluateCharterPledgeRequirement();
  populateProfileViewFields();
  renderDashboardAndArticles();
  if (isAdmin) {
    renderAdminReviewsTabs();
    renderStaffDirectoryGrid();
    const charterEd = document.getElementById("admin-charter-editor");
    if (charterEd && !charterEd.value) {
      charterEd.value = nrState.settings.charterHtml || DEFAULT_CHARTER_HTML;
    }
  }
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const identRaw = (document.getElementById("login-identifier")?.value || "").trim();
  const secretRaw = (document.getElementById("login-secret")?.value || "").trim();
  if (!identRaw || !secretRaw) return;

  const identClean = identRaw.toLowerCase();
  const normalizedHp = normalizePressId(identRaw);

  // البحث بالهوية الصحفية (HP#####) أو اسم المستخدم أو البريد الإلكتروني أو الاسم
  let matchedUser = nrState.staff.find((s) => {
    const sHp = String(s.pressId || "").toUpperCase().replace(/[\s-]+/g, "");
    const sUser = String(s.username || "").toLowerCase();
    const sMail = String(s.contactEmail || s.email || "").toLowerCase();
    const sName = String(s.name || "").toLowerCase();

    const idMatches =
      (normalizedHp && sHp === normalizedHp) ||
      sHp.toLowerCase() === identClean ||
      sUser === identClean ||
      sMail === identClean ||
      sName === identClean;

    if (!idMatches) return false;
    const passMatches =
      String(s.password || "") === secretRaw ||
      String(s.pinCode || "") === secretRaw ||
      String(s.pin || "") === secretRaw;
    return passMatches;
  });

  // في حال كانت قاعدة بيانات الكادر فارغة عند أول تشغيل، نسمح بإنشاء حساب المدير العام تلقائياً
  if (!matchedUser && nrState.staff.length === 0) {
    const masterPressId = "HP10001";
    const newMaster = {
      id: "master_admin",
      pressId: masterPressId,
      name: identRaw,
      username: identClean,
      password: secretRaw,
      pinCode: secretRaw,
      role: "admin",
      isMasterAdmin: true,
      verified: true,
      canPublishDirectly: true,
      charterSignedVersion: nrState.settings.charterVersion || 1,
      charterStatus: "approved"
    };
    setDoc(doc(db, "staff", "master_admin"), newMaster).catch(() => {});
    nrState.staff.push(newMaster);
    matchedUser = newMaster;
  }

  if (!matchedUser) {
    showAdminToast("بيانات الدخول غير صحيحة. تأكد من الهوية الصحفية (HP) أو كلمة المرور.");
    return;
  }

  if (matchedUser.frozen) {
    showAdminToast("هذا الحساب موقوف مؤقتاً من قبل الإدارة.");
    return;
  }

  // ضمان امتلاك المستخدم لهوية صحفية ثابتة بصيغة HP#####
  if (!normalizePressId(matchedUser.pressId)) {
    const newHp = generateUniquePressId(nrState.staff);
    matchedUser.pressId = newHp;
    updateDoc(doc(db, "staff", matchedUser.id), { pressId: newHp }).catch(() => {});
  }

  nrState.currentUser = matchedUser;
  localStorage.setItem(SESSION_USER_KEY, matchedUser.id);
  showAdminToast(`مرحباً بك في غرفة الأخبار: ${matchedUser.name} (${matchedUser.pressId})`);
  checkActiveSessionAndPermissions();
}

// ==================== 7. محرك ميثاق الشرف والتوقيع الرقمي (3 مرات للجدد / غير معطل للمعتمدين) ====================
let sigCanvasCtx = null;
let isDrawingSig = false;
let hasDrawnOnCurrentPad = false;

function initSignaturePadCanvas() {
  const canvas = document.getElementById("signature-pad");
  if (!canvas) return;
  sigCanvasCtx = canvas.getContext("2d");
  sigCanvasCtx.strokeStyle = "#0c0d0e";
  sigCanvasCtx.lineWidth = 2.4;
  sigCanvasCtx.lineCap = "round";

  const getPos = (evt) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const startDraw = (evt) => {
    isDrawingSig = true;
    hasDrawnOnCurrentPad = true;
    const p = getPos(evt);
    sigCanvasCtx.beginPath();
    sigCanvasCtx.moveTo(p.x, p.y);
  };

  const moveDraw = (evt) => {
    if (!isDrawingSig) return;
    evt.preventDefault();
    const p = getPos(evt);
    sigCanvasCtx.lineTo(p.x, p.y);
    sigCanvasCtx.stroke();
  };

  const endDraw = () => {
    isDrawingSig = false;
  };

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", moveDraw);
  window.addEventListener("mouseup", endDraw);

  canvas.addEventListener("touchstart", startDraw, { passive: false });
  canvas.addEventListener("touchmove", moveDraw, { passive: false });
  window.addEventListener("touchend", endDraw);
}

function clearSignatureCanvas() {
  const canvas = document.getElementById("signature-pad");
  if (!canvas || !sigCanvasCtx) return;
  sigCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  hasDrawnOnCurrentPad = false;
}

function evaluateCharterPledgeRequirement() {
  const user = nrState.currentUser;
  if (!user) return;

  const currentCharterVer = Number(nrState.settings.charterVersion || 1);
  const userSignedVer = Number(user.charterSignedVersion || 0);
  const hasEverBeenApproved = user.charterStatus === "approved" || Boolean(user.charterEverApproved);

  const pledgeOverlay = document.getElementById("pledge-overlay");
  const pledgeTextBox = document.getElementById("pledge-text-box");
  const ruleNotice = document.getElementById("pledge-rule-notice");
  const postponeBtn = document.getElementById("postpone-charter-btn");
  const slotsContainer = document.getElementById("sig-slots-container");

  if (pledgeTextBox) {
    pledgeTextBox.innerHTML = nrState.settings.charterHtml || DEFAULT_CHARTER_HTML;
  }

  // إزالة أي شريط تنبيه قديم
  document.getElementById("non-blocking-charter-banner")?.remove();

  // إذا كان الكاتب قد وقّع على آخر إصدار وليس مرفوضاً، لا نعرض النافذة
  if (userSignedVer >= currentCharterVer && user.charterStatus !== "rejected") {
    pledgeOverlay?.classList.add("hidden");
    return;
  }

  nrState.capturedSignatures = [];

  // الحالة 1: صحفي قديم ومعتمد سابقاً وصدر تحديث جديد للميثاق (توقيع مرة واحدة فقط + غير معطل للعمل)
  if (hasEverBeenApproved && userSignedVer > 0 && userSignedVer < currentCharterVer && user.charterStatus !== "rejected") {
    nrState.requiredSignatureCount = 1;
    nrState.isUpdateCharterMode = true;

    if (ruleNotice) {
      ruleNotice.textContent = "تم تحديث ميثاق الشرف الصحفي. يرجى التوقيع مرة واحدة فقط للموافقة على التحديث (حسابك مستمر في العمل والنشر بشكل طبيعي).";
    }
    postponeBtn?.classList.remove("hidden");
    if (slotsContainer) {
      slotsContainer.style.gridTemplateColumns = "1fr";
      slotsContainer.innerHTML = `<div class="sig-slot-box" id="sig-slot-1">توقيع الموافقة على التحديث (1/1)</div>`;
    }

    // شريط تنبيه علوي غير معطل للعمل في حال قام بتأجيل التوقيع لنشر خبر عاجل
    const ws = document.querySelector(".newsroom-workspace");
    if (ws) {
      const banner = document.createElement("div");
      banner.id = "non-blocking-charter-banner";
      banner.className = "charter-update-banner";
      banner.innerHTML = `
        <span>تنبيه: تم تحديث ميثاق الشرف الصحفي (الإصدار ${currentCharterVer}). يرجى قراءته والتوقيع عليه.</span>
        <button type="button" class="btn-primary" id="reopen-charter-modal-btn" style="padding:6px 14px;font-size:0.8rem;">قراءة الميثاق والتوقيع الآن</button>
      `;
      ws.insertBefore(banner, ws.firstChild);
      banner.querySelector("#reopen-charter-modal-btn")?.addEventListener("click", () => {
        pledgeOverlay?.classList.remove("hidden");
      });
    }

    pledgeOverlay?.classList.remove("hidden");
    return;
  }

  // الحالة 2: صحفي جديد لأول مرة أو تم رفض توقيعه (إلزامي 3 توقيعات متطابقة)
  nrState.requiredSignatureCount = 3;
  nrState.isUpdateCharterMode = false;
  if (ruleNotice) {
    ruleNotice.textContent =
      user.charterStatus === "rejected"
        ? "تنبيه من الإدارة: تم رفض توقيعك السابق لعدم المطابقة. يرجى رسم توقيعك الحقيقي 3 مرات متطابقة."
        : "لإكمال تفعيل حسابك الصحفي: يرجى رسم توقيعك الرسمي 3 مرات متطابقة تماماً ليتم اعتماده من الإدارة.";
  }
  postponeBtn?.classList.add("hidden");
  if (slotsContainer) {
    slotsContainer.style.gridTemplateColumns = "repeat(3, 1fr)";
    slotsContainer.innerHTML = `
      <div class="sig-slot-box" id="sig-slot-1">التوقيع الأول (1/3)</div>
      <div class="sig-slot-box" id="sig-slot-2">التوقيع الثاني (2/3)</div>
      <div class="sig-slot-box" id="sig-slot-3">التوقيع الثالث (3/3)</div>
    `;
  }
  pledgeOverlay?.classList.remove("hidden");
}

function handleCaptureSignatureStep() {
  const canvas = document.getElementById("signature-pad");
  if (!canvas || !hasDrawnOnCurrentPad) {
    showAdminToast("يرجى رسم توقيعك داخل المربع أولاً قبل التثبيت.");
    return;
  }

  if (nrState.capturedSignatures.length >= nrState.requiredSignatureCount) {
    showAdminToast("لقد أكملت تثبيت جميع التوقيعات المطلوبة. اضغط على اعتماد وإرسال.");
    return;
  }

  const dataUrl = canvas.toDataURL("image/png");
  nrState.capturedSignatures.push(dataUrl);
  const slotIdx = nrState.capturedSignatures.length;
  const slotEl = document.getElementById(`sig-slot-${slotIdx}`);
  if (slotEl) {
    slotEl.classList.add("filled");
    slotEl.innerHTML = `<img src="${dataUrl}" alt="توقيع ${slotIdx}">`;
  }

  clearSignatureCanvas();
  showAdminToast(`تم تثبيت التوقيع (${slotIdx} من ${nrState.requiredSignatureCount}) بنجاح.`);
}

async function handleSubmitCharterPledge() {
  // إذا رسم التوقيع الأخير ولم يضغط تثبيت، نلتقطه تلقائياً للتسهيل
  if (
    hasDrawnOnCurrentPad &&
    nrState.capturedSignatures.length < nrState.requiredSignatureCount
  ) {
    handleCaptureSignatureStep();
  }

  if (nrState.capturedSignatures.length < nrState.requiredSignatureCount) {
    showAdminToast(
      `يرجى إكمال تثبيت التوقيع ${nrState.requiredSignatureCount} مرات متطابقة قبل الإرسال.`
    );
    return;
  }

  const user = nrState.currentUser;
  if (!user) return;

  const currentCharterVer = Number(nrState.settings.charterVersion || 1);
  const isAdmin = isUserMasterOrAdmin(user);

  const updatePayload = {
    charterSignedVersion: currentCharterVer,
    charterSignatures: nrState.capturedSignatures,
    charterLatestSignature: nrState.capturedSignatures[nrState.capturedSignatures.length - 1],
    charterSignedAt: Date.now(),
    // إذا كان صحفياً معتمداً سابقاً ويوقع على تحديث، يظلcharterEverApproved=true ليتمكن من النشر أثناء مراجعة توقيعه
    charterEverApproved: Boolean(user.charterEverApproved || user.charterStatus === "approved" || isAdmin),
    charterStatus: isAdmin ? "approved" : "pending_review"
  };

  try {
    await updateDoc(doc(db, "staff", user.id), updatePayload);
    nrState.currentUser = { ...user, ...updatePayload };
    document.getElementById("pledge-overlay")?.classList.add("hidden");
    document.getElementById("non-blocking-charter-banner")?.remove();
    showAdminToast("تم حفظ توقيعك على ميثاق الشرف الصحفي وإحالته للاعتماد.");
  } catch (_) {
    showAdminToast("تم حفظ التوقيع محلياً وسيتم مزامنته.");
    document.getElementById("pledge-overlay")?.classList.add("hidden");
  }
}

// ==================== 8. استديو النشر المرحلي (Multi-Step Article Studio) + الحفظ التلقائي ====================
function switchStudioStep(stepNumber) {
  nrState.currentStep = stepNumber;
  [1, 2, 3].forEach((num) => {
    document
      .getElementById(`studio-step-${num}`)
      ?.classList.toggle("hidden", num !== stepNumber);
    document
      .querySelector(`.step-indicator[data-step="${num}"]`)
      ?.classList.toggle("active", num === stepNumber);
  });
  saveStudioDraftToLocalStorage();
}

function populateCategoryAndSubcategorySelects() {
  const catSelect = document.getElementById("post-category");
  const subSelect = document.getElementById("post-subcategory");
  if (!catSelect) return;

  const currentVal = catSelect.value;
  catSelect.innerHTML = nrState.categories
    .map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`)
    .join("");

  if (currentVal) catSelect.value = currentVal;

  const updateSubs = () => {
    if (!subSelect) return;
    const selectedCat = nrState.categories.find((c) => c.name === catSelect.value) || nrState.categories[0];
    const subs = selectedCat?.subcategories || [];
    subSelect.innerHTML = [
      `<option value="">— اختر التصنيف الفرعي —</option>`,
      ...subs.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
    ].join("");
  };

  catSelect.onchange = updateSubs;
  updateSubs();

  // رسم الوسوم الموحدة المقترحة
  const sugBox = document.getElementById("unified-tags-suggestions");
  const tagsInput = document.getElementById("post-tags");
  if (sugBox && tagsInput) {
    sugBox.innerHTML = (nrState.settings.unifiedTags || [])
      .map((t) => `<span class="tag-sug-chip" data-add-tag="${escapeHtml(t)}">#${escapeHtml(t)}</span>`)
      .join("");

    sugBox.querySelectorAll("[data-add-tag]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const tag = chip.getAttribute("data-add-tag");
        const existing = (tagsInput.value || "")
          .split(/\s+/)
          .map((x) => x.replace(/^#+/, "").trim())
          .filter(Boolean);
        if (existing.includes(tag)) return;
        if (existing.length >= 3) {
          showAdminToast("الحد الأقصى هو 3 وسوم لكل خبر لتركيز قوة الفهرسة (SEO).");
          return;
        }
        existing.push(tag);
        tagsInput.value = existing.map((x) => `#${x}`).join(" ");
        saveStudioDraftToLocalStorage();
      });
    });
  }
}

// الحفظ التلقائي الفوري للمرحلة والمحتوى (Auto-Save)
function saveStudioDraftToLocalStorage() {
  try {
    const payload = {
      savedAt: Date.now(),
      currentStep: nrState.currentStep,
      editingPostId: nrState.editingPostId,
      title: document.getElementById("post-title")?.value || "",
      summary: document.getElementById("post-summary")?.value || "",
      category: document.getElementById("post-category")?.value || "",
      subcategory: document.getElementById("post-subcategory")?.value || "",
      tags: document.getElementById("post-tags")?.value || "",
      imageUrl: document.getElementById("post-image-url")?.value || nrState.mainImageDataUrl || "",
      videoUrl
