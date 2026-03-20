# Fork RTL Methodology — تعريب منصة مع البقاء قريب من upstream

> **المبدأ الأساسي:** كل تعديل RTL يجب أن يكون معزولاً، قابلاً للتعريف، وسهل إعادة التطبيق بعد أي rebase.

---

## لماذا هذه المنهجية؟

الـ fork بدون منهجية ينتهي بإحدى ثلاث:
1. **Fork ميت** — بعد 3 أشهر الفجوة مع upstream كبيرة لدرجة ما تقدر تسوي rebase
2. **Fork هش** — تسوي rebase بس كل مرة تقضي أسبوع تحل conflicts
3. **Fork ذكي** — تسوي rebase بسلاسة لأن تعديلاتك معزولة ومنظمة ← هذا الهدف

---

## القاعدة الذهبية: الطبقات الثلاث للعزل

```
┌─────────────────────────────────────────────┐
│  الطبقة A — ملفات منفصلة (صفر conflicts)    │
│  ar.json, rtl.css, RTLProvider.tsx           │
├─────────────────────────────────────────────┤
│  الطبقة B — تعديلات wrapper (conflicts نادرة)│
│  DirectionProvider في root, locale config    │
├─────────────────────────────────────────────┤
│  الطبقة C — تعديلات inline (conflicts متوقعة)│
│  CSS physical→logical, hardcoded strings     │
└─────────────────────────────────────────────┘
```

**القاعدة:** اشتغل من A إلى C. كل ما بقيت في A أكثر، الـ rebase أسهل.

---

## المرحلة 1: التحضير قبل أي كود

### 1.1 — Branch strategy

```bash
# الهيكل المطلوب
main              ← upstream فقط — لا تلمسه أبداً
rtl/base          ← كل تعديلات RTL تبدأ من هنا
rtl/direction     ← الطبقة 2: dir + DirectionProvider
rtl/translations  ← الطبقة 4: ar.json
rtl/css           ← الطبقة 3: CSS logical properties
rtl/release       ← merge الكل — هذا اللي تنشره

# الإعداد
git remote add upstream https://github.com/original/platform.git
git checkout -b rtl/base upstream/main
```

**ليش branches منفصلة؟**
- لما upstream يحدّث CSS → conflict بس في `rtl/css`
- لما upstream يحدّث i18n → conflict بس في `rtl/translations`
- باقي الـ branches ما تتأثر
- تقدر تسوي rebase لكل branch على حدة

### 1.2 — إنشاء مجلد RTL مخصص

```bash
mkdir -p rtl-overrides/{styles,components,config,patches}
```

```
rtl-overrides/
├── styles/
│   └── rtl.css              ← كل CSS overrides هنا (ما تعدّل ملفات المنصة)
├── components/
│   ├── RTLProvider.tsx       ← wrapper component
│   └── LocaleSwitcher.tsx    ← اختيار اللغة
├── config/
│   └── rtl-config.json       ← إعدادات RTL مركزية
└── patches/
    └── README.md             ← توثيق أي تعديل inline ضروري
```

**ليش مجلد منفصل؟**
- ملفاتك ما تتعارض مع ملفات upstream أبداً
- لو upstream حذف ملف أو غيّر هيكل — ملفاتك ما تتأثر
- `git diff --stat rtl/base..rtl/release` يبيّن بوضوح وش تعديلاتك

---

## المرحلة 2: التنفيذ بالترتيب

### الخطوة 1: الترجمات (الطبقة A — صفر conflicts)

هذا أسهل شي وأأمن شي — ملفات جديدة 100%.

```bash
git checkout rtl/translations

# انسخ ملف الترجمة
cp i18n/en.json i18n/ar.json

# سجّل اللغة في الـ config
# (هذا التعديل الوحيد في ملف موجود — وثّقه)
```

**القاعدة:** لا تعدّل en.json أبداً. لو فيه مفتاح ناقص، أضفه في ar.json بالإنجليزي مؤقتاً وسجّله في `rtl-overrides/patches/README.md`.

**ملف التوثيق:**
```markdown
# RTL Patches Log

## ar.json additions (not in en.json)
- `app.rtl.direction_label`: "اتجاه" — مفتاح خاص بنا
- `app.settings.language`: "اللغة" — ناقص من upstream
```

---

### الخطوة 2: الاتجاه (الطبقة B — تعديل واحد في root)

```bash
git checkout rtl/direction
```

**الأسلوب المفضّل: wrapper مو inline edit**

```typescript
// rtl-overrides/components/RTLProvider.tsx
import { DirectionProvider } from '@radix-ui/react-direction';
import { useEffect } from 'react';

export function RTLProvider({ children, locale = 'ar' }) {
  const dir = ['ar', 'he', 'fa', 'ur'].includes(locale) ? 'rtl' : 'ltr';
  
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  return (
    <DirectionProvider dir={dir}>
      {children}
    </DirectionProvider>
  );
}
```

**التعديل الوحيد في كود المنصة:**
```typescript
// في root layout/app — سطر واحد فقط
import { RTLProvider } from '@/rtl-overrides/components/RTLProvider';

// لف الـ app بـ RTLProvider
<RTLProvider locale={currentLocale}>
  <App />
</RTLProvider>
```

**ليش wrapper؟**
- لو upstream غيّر الـ root layout، conflict في سطر واحد فقط
- كل منطق RTL في ملفك أنت — ما تلمس منطقهم
- تقدر تضيف ميزات (auto-detect, persist preference) بدون ما تعدّل كودهم

---

### الخطوة 3: CSS (الطبقة B أو C — حسب الأسلوب)

**فيه أسلوبين — اختر الأنسب:**

#### الأسلوب A: Override file (الطبقة B — مفضّل)

```css
/* rtl-overrides/styles/rtl.css */

/* بدال تعديل ملفات المنصة، override من برا */
[dir="rtl"] .sidebar {
  margin-inline-start: 0;
  margin-inline-end: 16px;
}

[dir="rtl"] .header-actions {
  flex-direction: row-reverse;
}

[dir="rtl"] .breadcrumb-separator {
  transform: scaleX(-1);
}
```

```typescript
// أضف import واحد في root
import '@/rtl-overrides/styles/rtl.css';
```

**المميزات:**
- صفر تعديل في ملفات CSS الأصلية
- الـ rebase ما يتأثر أبداً
- تقدر تشيله بحذف import واحد

**العيوب:**
- ملف override يكبر مع الوقت
- بعض الأشياء ما تنفع بـ override (CSS-in-JS مثلاً)

#### الأسلوب B: Codemod (الطبقة C — عند الحاجة)

```bash
# شغّل codemod بس احتفظ بالـ patch
npx rtl-codemod --dry-run ./src > .rtl-patches/css-changes.diff
npx rtl-codemod ./src

# وثّق
echo "CSS codemod applied: $(date)" >> rtl-overrides/patches/README.md
echo "Files changed: $(git diff --stat | tail -1)" >> rtl-overrides/patches/README.md

# commit في branch منفصل
git add -A
git commit -m "rtl: apply CSS logical properties codemod"
```

**متى تستخدم Codemod بدال Override؟**
- CSS-in-JS (styled-components, vanilla-extract) — ما ينفع override
- Tailwind classes في JSX — لازم تعدّل المصدر
- لما الـ override file يصير أكبر من 500 سطر — دليل إن الأسلوب ما يسكيل

---

### الخطوة 4: Hardcoded strings (الطبقة C — بحذر)

هذي أخطر طبقة على الـ rebase. كل تعديل في ملف JSX يعني conflict محتمل.

**القاعدة: عدّل بس اللي يبيّن للمستخدم مباشرة.**

```
❌ لا تعدّل: console.log("Loading...")
❌ لا تعدّل: // TODO: fix this later
✅ عدّل: <button>Download App</button>
✅ عدّل: <h1>Welcome to Platform</h1>
```

**الأسلوب:**
```typescript
// قبل (hardcoded)
<button>Download App</button>

// بعد (i18n)
<button>{t('app.download')}</button>

// وأضف المفتاح في ar.json
"app.download": "تحميل التطبيق"
```

**وثّق كل تعديل:**
```markdown
## Hardcoded string replacements
| File | Line | Original | Key |
|------|------|----------|-----|
| src/components/Header.tsx | 12 | "Download App" | app.download |
| src/components/Sidebar.tsx | 45 | "Settings" | app.settings |
```

---

## المرحلة 3: الـ Rebase Workflow

### كل أسبوع (أو كل release من upstream):

```bash
# 1. حدّث main
git checkout main
git pull upstream main

# 2. rebase كل branch على حدة
git checkout rtl/translations
git rebase main
# ← غالباً بدون conflicts (ملفات منفصلة)

git checkout rtl/direction
git rebase main
# ← conflict نادر (سطر واحد في root)

git checkout rtl/css
git rebase main
# ← هنا ممكن conflicts — حلّها

# 3. أعد بناء release branch
git checkout rtl/release
git reset --hard main
git merge rtl/translations
git merge rtl/direction
git merge rtl/css

# 4. شغّل audit وتأكد
npx rtl-audit ./
```

### لما الـ conflict يكون كبير:

```bash
# لو upstream غيّر هيكل i18n كامل مثلاً
# 1. شغّل audit جديد
npx rtl-audit ./ --json > audit-new.json

# 2. قارن مع آخر audit
diff audit-old.json audit-new.json

# 3. لو الفرق كبير، ابدأ الطبقة من جديد
git checkout rtl/translations
git reset --hard main
# أعد تطبيق الترجمات على الهيكل الجديد
```

---

## المرحلة 4: قياس صحة الـ Fork

### مقاييس الصحة

```bash
# كم commit بعيد عن upstream؟
git log main..rtl/release --oneline | wc -l
# المستهدف: أقل من 50 commit

# كم ملف معدّل من المنصة الأصلية؟
git diff --stat main..rtl/release | tail -1
# المستهدف: أقل من 5% من الملفات

# كم ملف في rtl-overrides مقابل ملفات inline؟
OVERRIDE=$(find rtl-overrides -type f | wc -l)
INLINE=$(git diff --name-only main..rtl/release | grep -v rtl-overrides | wc -l)
echo "Isolation ratio: $OVERRIDE override / $INLINE inline"
# المستهدف: ratio > 2 (ملفات override أكثر من inline بمرتين)
```

### RTL Fork Health Score

| المقياس | أخضر | أصفر | أحمر |
|---------|:-----:|:-----:|:-----:|
| Commits خلف upstream | < 50 | 50-150 | > 150 |
| ملفات inline معدّلة | < 20 | 20-50 | > 50 |
| Isolation ratio | > 2 | 1-2 | < 1 |
| وقت الـ rebase | < ساعة | 1-4 ساعات | > يوم |
| آخر rebase | < أسبوع | أسبوع-شهر | > شهر |

---

## المرحلة 5: خارطة الانتقال من Fork إلى Upstream

### متى ترجع لـ upstream؟

لما المنصة تقرر تدعم RTL رسمياً، تعديلاتك المنظمة تصير أساس للـ PRs:

```
rtl/translations  →  PR: "feat(i18n): add Arabic locale"
rtl/direction     →  PR: "feat(i18n): add RTL direction support"
rtl/css           →  PR: "refactor: convert CSS to logical properties"
                      أو PR: "docs: add rtl-codemod script"
```

**كل branch = PR واحد واضح.** هذا بالضبط ليش العزل مهم من البداية.

### سيناريو مثالي:

```
الشهر 1-3:  Fork + تعريب باستخدام rtl-first
الشهر 4:    المنصة تشوف الـ fork وتقرر تدعم RTL
الشهر 5:    تحوّل branches إلى PRs مرتبة
الشهر 6:    PRs تُدمج — تتخلى عن الـ fork وترجع upstream
```

---

## ملخص: القواعد العشر للـ Fork الذكي

1. **لا تلمس main** — خلّه نسخة طبق الأصل من upstream
2. **branch لكل طبقة** — عزل الـ conflicts
3. **مجلد rtl-overrides** — ملفاتك في بيتها
4. **Override قبل Inline** — CSS override file أفضل من codemod إلا لو ضروري
5. **وثّق كل تعديل inline** — في `patches/README.md`
6. **Rebase أسبوعياً** — كل ما طوّلت، صعب أكثر
7. **شغّل audit بعد كل rebase** — تأكد ما شي انكسر
8. **قِس صحة الـ fork** — الأرقام ما تكذب
9. **خلّ عينك على upstream** — لو بدوا RTL، حوّل branches لـ PRs
10. **الهدف النهائي: ما تحتاج الـ fork** — أفضل fork هو اللي ترجع منه لـ upstream
