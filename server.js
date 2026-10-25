import http from "http";
import path from "path";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");

const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = "gpt-5.6-luna";
const APP_VERSION = "3.9.0-prestige-power-search";

const MODES = {
  reasonable: {
    label: "Reasonable",
    geography: "Belgium, with Antwerp/Kapellen/Brasschaat and Brussels first; Mechelen/Ghent/Leuven next. Hybrid roles are welcome.",
    focus: "Fintech-first realistic next-step roles. Highest priority: Business Operations Manager and Strategy & Operations. Then search Product Operations, Payments Operations, Customer/Client Operations, Implementation, Business Manager, Chief of Staff, Strategic Partnerships, Programme/Project Operations, Transformation Operations and high-ownership operational roles in fintech, payments, digital banking, wealth/investment tech, regtech, insurtech and financial infrastructure. The candidate should be able to compete strongly using banking, audit/control, fraud, IAM/security, stakeholder management, project/process ownership, analytics, entrepreneurship and AI/automation experience. Prefer dynamic international teams, visible ownership, people contact and career progression. Avoid junior/repetitive back-office roles, narrow IAM-only roles and pure compliance/audit jobs unless the scope is broader and strategically attractive."
  },
  creative: {
    label: "Creative",
    geography: "Kapellen, Brasschaat, Antwerp and Antwerp port region first; wider Belgium only for an exceptional fit.",
    focus: "Niche, boutique, practical and enjoyable roles in premium automotive, workshops or ateliers, yacht/marine, luxury brands, travel or experience agencies, interior/design/renovation, premium hospitality, sports/padel/leisure, animal or dog businesses, estates, family offices, founder-led companies and startups. Value client contact, operational ownership, technology, entrepreneurship, hands-on problem solving, design/renovation experience, cars, sport, travel and boutique dog-hotel experience."
  },
  corporate: {
    label: "Corporate",
    geography: "Antwerp and Brussels first; then Ghent, Leuven and wider Belgium for strong banking roles.",
    focus: "Banking-sector focused roles that make strong use of the candidate's 12+ years across banking, internal audit, fraud, internal control, IAM/access operations, IT risk/security and fintech. Search banks and banking groups intensively before adjacent sectors: Belgian banks, international banks with Belgian offices, digital banks, private banks, investment banks, custody/securities institutions and bank-owned technology or transformation teams. Prioritise senior operations, business management, transformation, programme/project leadership, investment/product operations, payments, financial-crime technology, security governance, controls, risk-tech and strategic operations. Prefer roles with management exposure, cross-functional ownership and compensation/career progression. Avoid junior roles, narrow back-office IAM work and positions fundamentally dependent on mandatory Dutch/French."
  },
  fintech: {
    label: "Fintech",
    geography: "Belgium only. Prioritise Antwerp and Brussels, then Mechelen, Ghent, Leuven and other Belgian locations for exceptional fit. Hybrid Belgium-based roles are welcome.",
    focus: "Dedicated fintech mode. Search current roles at fintech, payments, digital banking, wealth/investment technology, regtech, insurtech, financial-infrastructure, embedded-finance and banking-technology companies. Prioritise roles where the candidate can be genuinely competitive: Business Operations, Strategy & Operations, Operations Manager, Product Operations, Payments Operations, Customer/Client Operations, Implementation, Business Manager, Chief of Staff, Strategic Partnerships, Programme/Project Operations, Transformation, Financial Crime Technology, Security/Risk Governance and other high-ownership cross-functional roles. Use the candidate's banking, audit/control, fraud, IAM/security, stakeholder management, project/process ownership, analytics, entrepreneurship and AI/automation background as transferable evidence. Strongly prefer dynamic international teams, visible ownership, strong compensation/career progression and English-speaking environments. Reject junior roles, repetitive back-office work, narrow IAM-only roles and vacancies requiring mandatory fluent Dutch or French."
  },
  ai: {
    label: "AI",
    geography: "Belgium-wide. Prioritise Antwerp, Brussels, Mechelen, Ghent and Leuven. Hybrid roles based in Belgium are welcome.",
    focus: "Current English-speaking AI-related roles with strong growth potential and a credible fit to this candidate. Prioritise AI Operations, AI Product Operations, AI Product Manager, AI Transformation, GenAI Programme or Project roles, AI Strategy, AI Governance, Responsible AI, AI Risk, AI Adoption, AI Enablement, AI Solutions, AI Business Operations, AI Customer Success, AI Partnerships, AI Implementation, AI Consulting, AI/Data Transformation and AI-enabled fintech or banking roles. The candidate has an MSc in Information Technologies with machine-learning focus, strong data/analytics exposure, banking and IT-risk experience, IAM/security knowledge, operational ownership, stakeholder management, entrepreneurship, and hands-on experience building AI/API/GitHub/Railway web workflows. Prefer roles where technical literacy, business judgement, process design, implementation and stakeholder leadership matter more than being a full-time software engineer or research scientist. Pure ML research, PhD-level research, highly specialised model-training engineering and roles requiring deep production coding as a hard requirement should normally be rejected."
  },
  prestige: {
    label: "Prestige",
    geography: "Belgium first, especially Brussels and internationally connected institutions. If Belgium does not yield enough exceptional matches, allow other EU member states only for unusually strong English-speaking roles with clear EU-citizen eligibility and major prestige/career leverage.",
    focus: "Institutional power-track roles with international prestige, senior stakeholder exposure, visible responsibility and upward mobility. Search European Defence Agency, NATO and NATO bodies/agencies, EU institutions and agencies, European Commission, European Parliament, Council/EEAS-related bodies, central banks and financial-policy institutions, defence/security institutions, Belgian and allied defence ministries where civilian vacancies are public, embassies and diplomatic missions in Belgium, permanent representations, international organisations, chambers of commerce, banking/financial federations, major trade associations, geopolitical/security organisations, respected think tanks, policy institutes, public-affairs organisations and other high-reputation institutions. Prioritise professional roles such as Programme/Project Officer or Manager, Business/Operations Manager, Policy/Programme Advisor, Institutional Relations, Stakeholder Relations, Strategic Partnerships, Security Governance, Financial Services Policy, Regulatory Strategy, EU/Public Affairs, Government Affairs, Geopolitical/Strategic Risk, Transformation, Digital/Technology Programme roles and operational policy implementation. Use the candidate's Belgian/EU citizenship, International Relations degree, ING/banking background, audit/fraud/control experience, IAM/security/technology knowledge, operations, stakeholder management and certifications as transferable strengths. Candidate is 35 years old: reject age-limited traineeships, graduate schemes or young-professional programmes where 35 is ineligible, but do not treat age as a negative when no age restriction exists. Belgian-nationality or EU-nationality requirements are acceptable because the candidate is Belgian/EU. Reject only genuine blockers such as sworn military/police status, specialist legal/doctoral requirements, an already-active clearance when mandatory before application, or mandatory professional Dutch/French that cannot be substituted by English."
  },
  highpaid: {
    label: "High Paid",
    geography: "Belgium-wide, prioritising Antwerp and Brussels; hybrid Belgium-based roles are welcome.",
    focus: "Roles likely to move the candidate materially upward in total compensation, seniority and financial trajectory. Search senior manager, lead, head-of, business manager, chief-of-staff, transformation, strategic operations, programme leadership, AI transformation, product operations, fintech/payments, banking, technology, cybersecurity governance, risk-tech, financial-crime technology, consulting, investment operations and high-value client or partnership roles. Prefer employers and sectors known for strong compensation, bonus, mobility/car benefits, equity or rapid salary progression. When salary is not published, infer earning potential conservatively from seniority, employer quality, scope, market segment and responsibility; never invent a salary number. Fit score should combine candidate match with realistic compensation upside and career leverage. Reject junior roles, narrow back-office work, jobs with major must-have gaps, or positions requiring mandatory fluent Dutch/French."
  },
  linkedin: {
    label: "LinkedIn",
    geography: "Belgium only. Prioritise Antwerp and Brussels, then the rest of Belgium. Hybrid Belgium-based roles are welcome.",
    focus: "LinkedIn-only discovery mode for the strongest current opportunities for this candidate. Search LinkedIn job postings published within the LAST 7 DAYS ONLY. Prioritise roles where the candidate can plausibly be a top-tier applicant and enjoy the work: Business Operations Manager, Strategy & Operations, Chief of Staff, Business Manager, Product Operations, Customer/Client Operations, fintech/payments operations, programme or transformation leadership, founder/executive right-hand, partnerships, implementation and other high-ownership cross-functional roles. Strongly value dynamic teams, people contact, autonomy, visible impact, international exposure, energetic scale-up or quality corporate environments, and work that is not repetitive back-office administration. Also prioritise compensation upside, seniority, strong employers and roles that can materially improve career trajectory. Use banking, fintech, audit/control, IAM/security, operations, stakeholder management, entrepreneurship, MSc IT/ML and hands-on AI workflow experience as evidence of fit. Avoid roles with major must-have gaps, junior roles, narrow IAM administration, pure repetitive compliance work, mandatory fluent Dutch/French, or roles unlikely to offer meaningful ownership or progression."
  },
  global: {
    label: "Global",
    geography: "Remote roles that explicitly allow work from Belgium, the EU, Europe or EMEA. Prefer employers headquartered in the United States, United Kingdom, Switzerland or other globally prestigious markets, while requiring real eligibility for a Belgium-based candidate.",
    focus: "Exceptional international remote opportunities worth leaving a safe local role for. Prioritise prestigious, famous, high-growth or category-leading companies, financial institutions, technology companies, AI firms, fintech/payments companies, security/cyber firms, international organisations, globally respected consultancies and other elite employers. Strong role families include Business Operations, Strategy & Operations, Chief of Staff, Business Manager, Product Operations, AI/Transformation Operations, Programme Leadership, Strategic Partnerships, Customer/Client Operations, Implementation, Risk/Security Governance, fintech/payments operations and cross-functional leadership. The candidate should have a realistic chance to stand out because of the combination of 12+ years in banking/audit/fraud/controls/IAM/security, operational ownership, stakeholder management, entrepreneurship, MSc IT/ML, certifications and hands-on AI/API workflow building. Prefer roles that could move the candidate several steps forward in compensation, brand prestige, global network, responsibility, future optionality or access to high-growth sectors. Travel is acceptable. Remote-first or distributed European teams are ideal. Reject ordinary low-upside remote jobs, location-restricted US-only/UK-only/Swiss-only roles, contractor roles that cannot legally engage someone based in Belgium, junior positions, deep specialist engineering/research roles with major skill gaps, and any role requiring another language beyond English."
  },
  swmo: {
    label: "SW-MO",
    geography: "Switzerland and Monaco only. Prioritise Zurich, Geneva, Basel, Zug, Lausanne and Monaco/Monte Carlo. On-site, hybrid or locally based roles are acceptable when international applicants can realistically be considered.",
    focus: "High-quality Switzerland and Monaco opportunities where this candidate can realistically compete and enjoy the work. Prioritise strong-paying and career-enhancing employers in banking, private banking, wealth management, fintech/payments, technology, AI, cybersecurity/security governance, luxury, family offices, international organisations, global consultancies, strategic operations, business operations, Chief of Staff, business management, product/operations, programme leadership, partnerships, client operations and transformation. Prefer internationally oriented teams where English is the working language and the candidate's combination of 12+ years in banking/audit/fraud/controls/IAM/security, stakeholder management, operations, entrepreneurship, MSc IT/ML, certifications and hands-on AI/API workflow experience can stand out. Strongly value dynamic ownership, international exposure, client/stakeholder contact, visible impact, strong compensation and prestige. Reject roles requiring mandatory German, French, Italian or another language beyond English; reject local-only public-sector roles, highly specialised investment/front-office roles without transferable fit, deep engineering/research roles with major gaps, and junior roles. For Switzerland, do NOT treat lack of employer sponsorship as a blocker because the candidate is a Belgian/EU citizen; normal Swiss EU/EFTA registration/residence-permit formalities are acceptable. For Monaco, do not assume Belgian citizenship removes local work-authorisation formalities, but only reject when the vacancy explicitly restricts eligibility to Monaco/local residents or otherwise clearly excludes international EU applicants."
  },
  turkish: {
    label: "Turkish",
    geography: "Belgium only, with Antwerp and Brussels first; include other Belgian locations for a strong Turkey/Turkish-language connection.",
    focus: "Roles where native Turkish can be a meaningful advantage and the job is based in Belgium. Search companies serving the Turkish market, organisations trading with Turkey, Turkish-owned or Turkey-linked companies with Belgian operations, Belgian companies with Turkish clients/suppliers/partners, firms with offices or substantial business in both Belgium and Turkey, logistics/import-export businesses, airlines/travel, fintech/payments, banking, technology, customer success, account management, business development, operations, partnerships, market expansion and international trade roles. Turkish may be required, preferred or clearly commercially useful. English must still be sufficient for the working environment; mandatory fluent Dutch or French is normally a rejection criterion. Prioritise roles that also fit the candidate's operations, banking/fintech, stakeholder, technology, security/risk, entrepreneurship or business-management background rather than generic low-skill Turkish-speaking vacancies."
  }
};

const CANDIDATE = `Candidate:
- Kapellen, Belgium; Belgian/EU citizen; age 35; fluent English.
- 12+ years: ING Belgium + banking, audit, fraud, internal control, IAM/access, IT risk/security, fintech.
- BA Business Administration + BA International Relations + MSc Information Technologies (ML); CISA/CIA/CIAM/CFE/CFSA/CMB3.
- Strong operations, stakeholder management, process improvement, data/AI automation; builds OpenAI/GitHub/Railway apps; entrepreneurial.
- Best work: dynamic ownership, people contact, international teams, visible impact, business/operations leadership. Avoid junior, repetitive back-office and roles with major must-have gaps.`;

const NEVER_REPEAT = [
  "Cross Chartering Yacht Transport — Operations & Documentation Coordinator",
  "ElevenLabs — Enterprise Deployment Chief of Staff",
  "Lighthouse — Senior Project Manager / Business",
  "Paynovate — Financial Crime Technology Manager",
  "WORXINVEST / HR Pay Solutions — Payment Operations Expert",
  "Shiperise — Operations & Customer Success Manager",
  "A&O Shearman — Policy Advisor Financial Services",
  "Shield AI — Business Development Lead Belgium NATO & Luxembourg",
  "SWIFT — Compliance Assurance Specialist",
  "SWIFT — Enterprise Risk Analyst",
  "Revolut — Operations Manager Banking",
  "bunq — Deputy AML Branch Manager",
  "ING — Project Manager Core Banking Transformation",
  "Dries Van Noten — IT Business Application Manager",
  "FLYINGGROUP — Airworthiness Executive",
  "FLYINGGROUP — OCC Flight Care Agent",
  "EXMAR — Fleet Personnel Coordinator",
  "Tomorrowland — Music Cluster & Studio Coordinator"
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

async function readJson(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 250000) throw new Error("Request too large.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function normalizeUrl(value) {
  try {
    const u = new URL(String(value));
    u.hash = "";
    ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","gh_src","src","source","ref"].forEach(k => u.searchParams.delete(k));
    return u.toString().replace(/\/$/, "");
  } catch {
    return String(value || "").trim();
  }
}

function extractOutputText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  return (data?.output || [])
    .flatMap(item => item?.content || [])
    .filter(item => item?.type === "output_text" && typeof item?.text === "string")
    .map(item => item.text)
    .join("\n")
    .trim();
}

function parseJsonObject(text) {
  const cleaned = String(text || "")
    .trim()
    .replace(/^\`\`\`json\s*/i, "")
    .replace(/\`\`\`$/i, "")
    .trim();

  try { return JSON.parse(cleaned); } catch {}

  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) return JSON.parse(cleaned.slice(first, last + 1));

  throw new Error("OpenAI returned text but not valid job JSON.");
}

function cleanJob(job) {
  return {
    title: String(job?.title || "").trim(),
    company: String(job?.company || "").trim(),
    location: String(job?.location || "").trim(),
    url: normalizeUrl(job?.url),
    publishedDate: String(job?.publishedDate || "").trim(),
    languageCheck: String(job?.languageCheck || "").trim(),
    remoteCheck: String(job?.remoteCheck || "").trim(),
    mobilityCheck: String(job?.mobilityCheck || "").trim(),
    ageCheck: String(job?.ageCheck || "").trim(),
    score: Math.round(Math.max(0, Math.min(10, Number(job?.score) || 0)) * 10) / 10,
    whyFit: Array.isArray(job?.whyFit)
      ? job.whyFit.slice(0, 3).map(v => String(v).trim()).filter(Boolean)
      : []
  };
}

function buildPrompt(mode, seenUrls) {
  const cfg = MODES[mode];
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());

  const seen = seenUrls.slice(-80).map(normalizeUrl).filter(Boolean);
  const maxAge = mode === "linkedin" ? 7 : (mode === "global" || mode === "swmo") ? 30 : 60;
  const target = mode === "prestige" ? 15 : mode === "reasonable" ? 12 : (mode === "global" || mode === "swmo") ? 9 : 7;
  const finalTarget = (mode === "reasonable" || mode === "prestige") ? "6-10" : "3-5";
  const stopAt = (mode === "reasonable" || mode === "prestige") ? 10 : 5;

  const special = mode === "linkedin"
    ? "LINKEDIN: LinkedIn job pages only; <=7 days; final URL must be the LinkedIn vacancy."
    : mode === "global"
      ? "GLOBAL: remote must explicitly allow Belgium/EU/Europe/EMEA; reject US/UK/Swiss-only remote. Prefer elite US/UK/Swiss/global employers and Europe-facing teams. REMOTE_CHECK is mandatory."
      : mode === "swmo"
        ? "SW-MO: Switzerland/Monaco only; English sufficient; reject mandatory German/French/Italian. Belgian/EU citizen: Swiss sponsorship is not required; normal EU/EFTA registration is acceptable. Monaco local-only restrictions still matter. MOBILITY_CHECK is mandatory."
        : mode === "prestige"
          ? "PRESTIGE: Belgium first. Candidate is Belgian/EU citizen and age 35. Belgian/EU-nationality requirements are acceptable. Reject only if an explicit age cap makes age 35 ineligible, or another hard eligibility requirement is not met. AGE_CHECK is mandatory."
          : "";

  return `Find CURRENT vacancies using live web search.
TODAY: ${today}
MODE: ${cfg.label}
${CANDIDATE}
TARGET: ${cfg.focus}
GEOGRAPHY: ${cfg.geography}
${special}

SEARCH PLAN
- Discover about ${target} serious candidates, then return the best ${finalTarget}. Stop once ${stopAt} strong verified roles are found.
- Search source groups efficiently. Use discovery platforms to find candidates, but verify final roles on official/ATS pages whenever possible. Do not repeatedly search the same source/query family.
- If fewer than 3 valid roles are found, exhaust the relevant source groups before returning. For Reasonable and Prestige, continue through all focused waves unless 10 strong verified roles are already found.
- Freshness: prefer <=7 days, then <=14, then <=30; max age ${maxAge} days. LinkedIn never exceeds 7 days.
- Verify EACH final role: exact YYYY-MM-DD publication date, vacancy still open, direct application page, English sufficient, no mandatory extra language, real profile fit.
- Reject stale/closed/generic-careers pages, guessed dates, major must-have gaps, junior/repetitive roles and irrelevant matches.
- Prefer unseen roles. Seen URLs may be reused only if still live and needed for a strong result set.
- Fit score 0-10. Minimum: ${mode === "global" ? "7.5" : mode === "swmo" ? "7.2" : "6.5"}.
- Prestige mode: candidate is Belgian/EU citizen and age 35. Check explicit age, nationality, clearance and status requirements. Do not reject Belgian/EU nationality requirements. Reject age-capped programmes if 35 is outside the allowed range. Output AGE_CHECK with the eligibility conclusion.
- Fintech mode: the employer/business must genuinely operate in fintech, payments, digital banking, regtech, insurtech, wealth-tech, financial infrastructure or closely related financial technology; do not fill with ordinary banks unless the role sits in a clearly fintech/technology venture or product unit.
- WHY_FIT lines must be short and specific: profile fit; work/scope appeal; career/compensation leverage. Never invent salary.

MODE-SPECIFIC SOURCE PRIORITY
- Reasonable WAVE 1: fintech/payments/digital-bank companies + exact Business Operations Manager, Business Operations, Strategy & Operations, Operations Manager.
- Reasonable WAVE 2: same sectors + Product Ops, Payments Ops, Implementation, Customer/Client Ops, Partnerships, Business Manager, Chief of Staff, Transformation/Programme Ops.
- Reasonable WAVE 3: adjacent high-fit roles at strong fintech/payment/financial-infrastructure employers. Discovery sources may include LinkedIn Jobs, Welcome to the Jungle, Wellfound and current recruiter boards such as Robert Walters, Hays and Michael Page; then cross-check the employer/ATS vacancy.
- Corporate: bank career pages first; senior operations, transformation, investment/product ops, payments, risk-tech.
- Fintech: fintech/payments/digital-bank/regtech/wealth-tech company career pages and ATS first; then LinkedIn Jobs, Welcome to the Jungle, Wellfound and specialist/recruiter discovery; verify on official vacancy pages.
- AI: AI/GenAI product, operations, transformation, governance, implementation.
- Prestige WAVE 1 — power institutions in Belgium: NATO Careers and NATO bodies/agencies including NCIA/NSPA where relevant; European Defence Agency; EU Careers/EPSO; European Commission; European Parliament; Council/EEAS-related vacancies; EU agencies with Brussels/Belgium roles.
- Prestige WAVE 2 — defence/diplomatic/international: Belgian/allied defence institutions with civilian vacancies, embassies and diplomatic missions in Belgium, permanent representations, international organisations, security/defence organisations and international programme offices.
- Prestige WAVE 3 — financial/institutional influence: National Bank of Belgium/central-bank ecosystem, European financial institutions, banking/financial federations, chambers of commerce, major trade associations, regulatory/policy bodies and strategic institutional-relations teams.
- Prestige WAVE 4 — policy/intellectual influence: respected think tanks, geopolitical/security institutes, public-affairs organisations, policy institutes and international advisory bodies.
- Prestige WAVE 5 — only if Belgium yields fewer than 6 strong matches: search other EU member states for exceptional English-speaking EU/NATO/defence/international-institution roles where Belgian/EU citizenship makes the candidate clearly eligible.
- High Paid: senior/executive recruiter + employer pages; high-scope manager/lead/head roles.
- Turkish: Belgium roles where Turkish/Turkey-market exposure is commercially useful.
- Creative: boutique/premium/luxury/automotive/yacht/travel/sport/founder-led operational roles.
- LinkedIn: LinkedIn vacancy pages plus employer cross-check.
- Global: global career pages + Europe/EMEA remote sources.
- SW-MO: Swiss/Monaco banks, fintech, tech, luxury, family office, international organisations and specialist recruiters.

ALREADY SEEN URLS:
${seen.length ? seen.join("\n") : "None"}

OUTPUT plain text only:
For each accepted role:
---JOB---
VERIFIED_OPEN: YES
TITLE: ...
COMPANY: ...
LOCATION: ...
DIRECT_URL: https://...
PUBLISHED_DATE: YYYY-MM-DD
LANGUAGE_CHECK: English sufficient; no other language mandatory.
AGE_CHECK: ${mode === "prestige" ? "Eligible at age 35; explicit age rule checked: ..." : "N/A"}
REMOTE_CHECK: ${mode === "global" ? "Belgium/Europe/EMEA eligibility verified: ..." : "N/A"}
MOBILITY_CHECK: ${mode === "swmo" ? "Belgian/EU-citizen eligibility: ..." : "N/A"}
SCORE: 8.7
WHY_FIT_1: ...
WHY_FIT_2: ...
WHY_FIT_3: ...

For Reasonable and Prestige, return up to 10 verified roles; for every other mode return up to 5. If fewer than 3 roles survive only after fully checking the relevant sources, return those valid roles. If none survive: NO_VERIFIED_JOBS.`;
}

function parseVerifiedJobs(text) {
  const blocks = String(text || "").split("---JOB---").slice(1);
  const jobs = [];

  for (const block of blocks) {
    const fields = {};
    for (const rawLine of block.split("\n")) {
      const line = rawLine.trim();
      const i = line.indexOf(":");
      if (i <= 0) continue;
      const key = line.slice(0, i).trim().toUpperCase();
      const value = line.slice(i + 1).trim();
      fields[key] = value;
    }

    if (String(fields.VERIFIED_OPEN || "").toUpperCase() !== "YES") continue;

    const score = Number(fields.SCORE);
    const whyFit = [
      fields.WHY_FIT_1,
      fields.WHY_FIT_2,
      fields.WHY_FIT_3
    ].map(v => String(v || "").trim()).filter(Boolean);

    jobs.push({
      title: fields.TITLE || "",
      company: fields.COMPANY || "",
      location: fields.LOCATION || "",
      url: fields.DIRECT_URL || "",
      publishedDate: fields.PUBLISHED_DATE || "",
      languageCheck: fields.LANGUAGE_CHECK || "",
      ageCheck: fields.AGE_CHECK || "",
      remoteCheck: fields.REMOTE_CHECK || "",
      mobilityCheck: fields.MOBILITY_CHECK || "",
      score: Number.isFinite(score) ? score : 0,
      whyFit
    });
  }

  return { jobs };
}

function buildStrictPrompt(prompt, mode) {
  return `${prompt}

FINAL CHECK BEFORE OUTPUT
- Re-open/check each final vacancy or ATS page in this same run.
- Exact date + currently accepting applications + direct vacancy URL are mandatory.
- English must be sufficient; mandatory Dutch/French rejects the role. SW-MO also rejects mandatory German/Italian.
- LinkedIn: <=7 days and LinkedIn job URL.
- Global: <=30 days and explicit Belgium/EU/Europe/EMEA remote eligibility.
- SW-MO: <=30 days and realistic Belgian/EU-citizen mobility.
- PRESTIGE: candidate is Belgian/EU citizen, age 35. Check explicit age/nationality/clearance/status rules. Reject only if a real rule makes the candidate ineligible; Belgian/EU-nationality requirements are acceptable.
- ${(mode === "reasonable" || mode === "prestige") ? (mode === "prestige" ? "Prestige: aim for 6-10 excellent institutional roles, maximum 10." : "Reasonable: aim for 6-10 excellent roles, maximum 10.") : "Aim for 3-5 excellent roles, maximum 5."} Never pad with weak/stale roles.
- Do not output rejected roles or commentary.`;
}

function isAllowedPublishedDate(value, mode = "") {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;

  const [year, month, day] = text.split("-").map(Number);
  const published = Date.UTC(year, month - 1, day);

  const todayText = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  const [ty, tm, td] = todayText.split("-").map(Number);
  const today = Date.UTC(ty, tm - 1, td);
  const ageDays = (today - published) / 86400000;

  const maxAgeDays = mode === "linkedin" ? 7 : (mode === "global" || mode === "swmo") ? 30 : 60;
  return Number.isFinite(ageDays) && ageDays >= 0 && ageDays <= maxAgeDays;
}

function isLinkedInJobUrl(value) {
  try {
    const u = new URL(String(value || ""));
    return /(^|\.)linkedin\.com$/i.test(u.hostname) && /\/jobs\/(view\/|collections\/|search\/)?/i.test(u.pathname);
  } catch {
    return false;
  }
}

function hasVerifiedEuropeRemote(job) {
  const check = String(job?.remoteCheck || "");
  if (!check) return false;
  const allowed = /\b(belgium|europe|european union|eu|emea)\b/i.test(check);
  const restrictedOnly = /\b(us|united states|uk|united kingdom|switzerland)\s*[- ]?only\b/i.test(check);
  return allowed && !restrictedOnly;
}

function hasRealisticSwmoMobility(job) {
  const check = String(job?.mobilityCheck || "");
  const location = String(job?.location || "");
  if (!check) return false;

  const isSwiss = /\b(switzerland|swiss|zurich|geneva|gen[eè]ve|basel|zug|lausanne|bern)\b/i.test(location);
  const isMonaco = /\b(monaco|monte carlo|monte-carlo)\b/i.test(location);

  if (isSwiss) {
    if (/\b(swiss nationals? only|swiss citizenship required|must already be swiss resident)\b/i.test(check)) return false;
    return /\b(belgian|eu|european union|eea|efta|free movement|residence permit|registration|eligible|international|open to)\b/i.test(check);
  }

  if (isMonaco) {
    if (/\b(monaco residents? only|monegasque nationals? only|local candidates only|must already reside in monaco|not eligible)\b/i.test(check)) return false;
    return /\b(belgian|eu|international|eligible|considered|open to|work authori[sz]ation|permit|relocation)\b/i.test(check);
  }

  return false;
}

function finalizeJobsFromResponse(data, mode = "") {
  const outputText = extractOutputText(data);
  if (!outputText) return [];

  const parsed = outputText.includes("NO_VERIFIED_JOBS")
    ? { jobs: [] }
    : parseVerifiedJobs(outputText);

  const duplicates = new Set();

  return (Array.isArray(parsed.jobs) ? parsed.jobs : [])
    .map(cleanJob)
    .filter(job => job.title && job.company && /^https?:\/\//i.test(job.url) && job.whyFit.length === 3)
    .filter(job => isAllowedPublishedDate(job.publishedDate, mode))
    .filter(job => job.score >= (mode === "global" ? 7.5 : mode === "swmo" ? 7.2 : 6.5))
    .filter(job => mode !== "linkedin" || isLinkedInJobUrl(job.url))
    .filter(job => mode !== "global" || hasVerifiedEuropeRemote(job))
    .filter(job => mode !== "swmo" || hasRealisticSwmoMobility(job))
    .filter(job => {
      if (mode !== "prestige") return true;
      const age = String(job.ageCheck || "");
      if (!age) return false;
      return !/\b(ineligible|not eligible|too old|maximum age\s*(?:of|is|:)?\s*(?:18|19|2\d|3[0-4])|under\s*35|younger than\s*35)\b/i.test(age);
    })
    .filter(job => {
      const lang = String(job.languageCheck || "");
      const cleaned = lang
        .replace(/\bnot\s+(mandatory|required)\b/gi, "")
        .replace(/\bno\s+(mandatory|required)\b/gi, "");
      const blockedLanguages = mode === "swmo" ? "dutch|french|german|italian" : "dutch|french";
      const languagePattern = new RegExp("\\b(" + blockedLanguages + ")\\b.{0,30}\\b(required|mandatory|fluent|professional|native)\\b","i");
      return /english/i.test(lang) && !languagePattern.test(cleaned);
    })
    .filter(job => {
      const key = `${job.company.toLowerCase()}|${job.title.toLowerCase()}`;
      if (duplicates.has(key)) return false;
      duplicates.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, (mode === "reasonable" || mode === "prestige") ? 10 : 5);
}


function cleanGeneratedText(value) {
  return String(value || "")
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/gi, "$1")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/www\.\S+/gi, "")
    .replace(/cite[^]+/g, "")
    .replace(/【[^】]+】/g, "")
    .replace(/\(\s*source\s*:\s*[^)]+\)/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function cleanGeneratedLabel(value) {
  return cleanGeneratedText(value)
    .replace(/\s*[|·•-]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const MS_PROFILE = `Use only these established candidate facts:
- Ulas Atilgan lives in Kapellen, Belgium; Belgian/EU citizen; no visa sponsorship required.
- 12+ years across ING Belgium, banking, fintech-related work, internal audit, fraud investigation, internal control, IAM/access operations and IT risk/security.
- Strong operational capability: coordinates business, IT, risk and support stakeholders; follows projects/transformation, owns operational processes, reporting, controls, issue follow-up and process improvement.
- Good with numbers and analytical work: comfortable with reconciliations, financial/payment processes, dashboards, data interpretation, controls and structured decision-making.
- Tech-savvy and curious: MSc Information Technologies with data/ML focus; builds AI-assisted workflows/apps with OpenAI APIs, GitHub and Railway; actively looks for automation opportunities.
- Works already in an international banking environment in English and is comfortable with senior/cross-functional stakeholders.
- Entrepreneurial and hands-on: built/operates Hondinn, a boutique dog-hotel business, involving customer experience, planning, operations, pricing and ownership.
- BA Business Administration; BA International Relations; MSc Information Technologies. Certifications include CISA, CIA, CIAM, CFE, CFSA and CMB3.
- Earlier BPN/Western Union Turkey experience includes transaction/reconciliation and payment-process exposure.
- Investment/UlasTrade examples may be used when they strengthen the specific role fit.`;

function buildMsPrompt(job, note) {
  const safeNote = String(note || "").trim().slice(0, 1200);
  return `Write a concise one-page MSVersion1 motivation statement for this exact vacancy.

VACANCY TO RESEARCH
Role: ${job.title}
Company: ${job.company}
Location: ${job.location || ""}
Research URL: ${job.url}

${MS_PROFILE}

USER NOTE
${safeNote || "No extra note."}

RESEARCH FIRST
Read the current vacancy and identify its actual responsibilities, must-haves and working style. Use the URL only for research. NEVER print, mention, cite or reproduce the URL, website, source link or citation in the motivation statement.

WRITING METHOD
Create one short intro + exactly 7 points. Every point must connect ONE concrete employer need from the vacancy to ONE concrete candidate fact. Do not write generic personality claims without evidence.

Across the 7 points, cover these themes when compatible with the vacancy:
1. Direct match to the role's core operational/business responsibility.
2. Operational ownership, coordination and stakeholder management.
3. Numbers, analytics, reporting, reconciliation, controls or data-driven judgement.
4. Tech-savvy/AI/automation mindset and MSc IT/ML.
5. Existing international English-speaking banking environment and cross-functional communication.
6. Hondinn/entrepreneurial hands-on ownership, customer focus and practical execution.
7. Belgian/EU citizenship, Belgium base and no visa sponsorship requirement.

Use banking/fintech, fraud/control, IAM/security, payment-process, certifications, International Relations, UlasTrade or other facts only where the vacancy makes them relevant.

STYLE
- First person natural English. Short, confident, factual and human.
- Mention only the company name and position title where useful. Never show a URL, domain, hyperlink, citation, source marker or job-board name.
- Paraphrase the employer's requirement; do not copy long vacancy wording.
- Make the match concrete: "you need X; I have done Y" logic without sounding formulaic.
- No invented achievements, percentages, team sizes, software, languages or responsibilities.
- Intro <=50 words. Each point <=42 words, ideally 1-2 sentences.
- No Dear/Sincerely/contact details/closing paragraph.

OUTPUT EXACTLY:
INTRO: ...

---POINT---
NUMBER: 01
TITLE: ...
TEXT: ...

Repeat through NUMBER: 07. Plain text only. No links, citations or markdown.`;
}

function parseMsOutput(text) {
  const raw = String(text || "").trim();
  const introMatch = raw.match(/INTRO:\s*([\s\S]*?)(?=\n---POINT---)/i);
  const intro = cleanGeneratedText(introMatch?.[1] || "");
  const points = raw.split("---POINT---").slice(1).map(block => {
    const number = (block.match(/NUMBER:\s*(\d{1,2})/i) || [])[1] || "";
    const title = (block.match(/TITLE:\s*([^\n]+)/i) || [])[1] || "";
    const textMatch = block.match(/TEXT:\s*([\s\S]*?)(?=$|\n---POINT---)/i);
    return {
      number: String(number).padStart(2,"0"),
      title: cleanGeneratedLabel(title),
      text: cleanGeneratedText(textMatch?.[1] || "")
    };
  }).filter(p => p.title && p.text);

  if (!intro || points.length !== 7) throw new Error("Could not create a valid seven-point motivation statement.");
  return { intro, points: points.slice(0, 7) };
}

function pdfSafeText(value) {
  return String(value || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pdfEscape(value) {
  return pdfSafeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapPdfText(value, maxChars) {
  const words = pdfSafeText(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (next.length <= maxChars || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function buildMotivationPdf(job, ms) {
  const W = 595.28, H = 841.89;
  const commands = [];
  const text = (value, x, y, size=9, bold=false, gray=0.12) => {
    commands.push(`BT /F${bold ? 2 : 1} ${size.toFixed(1)} Tf ${gray} g 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${pdfEscape(value)}) Tj ET`);
  };
  const rule = (x1,y1,x2,y2,gray=0.88) => commands.push(`${gray} G 0.6 w ${x1} ${y1} m ${x2} ${y2} l S`);

  let y = 794;
  text("Ulas Atilgan", 48, y, 10.2, true, 0.10); y -= 16;
  text(job.title || "Application", 48, y, 9.1, false, 0.28); y -= 13;
  if (job.company) { text(job.company, 48, y, 9.1, false, 0.28); y -= 24; }
  rule(48,y+9,547,y+9,0.90);
  text("Motivation Statement", 48, y-7, 17.2, true, 0.08); y -= 32;

  const introLines = wrapPdfText(ms.intro, 99).slice(0,5);
  for (const line of introLines) { text(line,48,y,9.0,false,0.20); y -= 11.5; }
  y -= 10;

  const bodySize = 8.35, bodyLead = 10.0;
  for (let i=0;i<7;i++) {
    const p = ms.points[i];
    const num = String(i+1).padStart(2,"0");
    text(num,48,y,9.3,true,0.42);
    text(p.title,78,y,9.3,true,0.12);
    y -= 13;
    const lines = wrapPdfText(p.text, 96).slice(0,5);
    for (const line of lines) { text(line,78,y,bodySize,false,0.24); y -= bodyLead; }
    y -= 7;
  }

  if (y < 35) throw new Error("Generated motivation statement is too long for the one-page format.");

  const stream = commands.join("\n");
  const objects = [
    null,
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W.toFixed(2)} ${H.toFixed(2)}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(stream,"latin1")} >>\nstream\n${stream}\nendstream`
  ];

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];
  for (let i=1;i<objects.length;i++) {
    offsets[i] = Buffer.byteLength(pdf,"latin1");
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf,"latin1");
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i=1;i<objects.length;i++) pdf += String(offsets[i]).padStart(10,"0") + " 00000 n \n";
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf,"latin1");
}

function safePdfFilename(job) {
  const slug = [job.company, job.title].filter(Boolean).join("_")
    .replace(/[^A-Za-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,90);
  return `Ulas_Atilgan_${slug || "Motivation_Statement"}_MSVersion1.pdf`;
}

function sendPdf(res, pdf, filename) {
  res.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename.replace(/"/g,"")}"`,
    "Cache-Control": "no-store",
    "Content-Length": pdf.length
  });
  res.end(pdf);
}

async function generateMotivationStatement(req, res) {
  if (!OPENAI_API_KEY) return sendJson(res, 503, { error: "OPENAI_API_KEY is not configured in Railway." });
  const body = await readJson(req);
  const rawJob = body?.job || {};
  const job = {
    title: cleanGeneratedLabel(String(rawJob.title || "").slice(0,180)),
    company: cleanGeneratedLabel(String(rawJob.company || "").slice(0,140)),
    location: cleanGeneratedLabel(String(rawJob.location || "").slice(0,140)),
    url: normalizeUrl(rawJob.url),
    publishedDate: String(rawJob.publishedDate || "").trim().slice(0,20)
  };
  const note = String(body?.note || "").trim().slice(0,1200);
  if (!job.title || !job.company || !/^https?:\/\//i.test(job.url)) {
    return sendJson(res, 400, { error: "A valid watched vacancy is required." });
  }

  try {
    const data = await openAIRequest("https://api.openai.com/v1/responses", {
      method: "POST",
      body: JSON.stringify({
        model: OPENAI_MODEL,
        store: false,
        tools: [{ type: "web_search", search_context_size: "low" }],
        tool_choice: "required",
        input: buildMsPrompt(job, note),
        max_output_tokens: 1800
      })
    });
    const ms = parseMsOutput(extractOutputText(data));
    const pdf = buildMotivationPdf(job, ms);
    return sendPdf(res, pdf, safePdfFilename(job));
  } catch (error) {
    console.error("U-Job MS generation error:", error);
    return sendJson(res, 502, { error: error?.message || "Could not generate motivation statement." });
  }
}


function buildAskPrompt(url) {
  return `Analyze this exact vacancy for Ulas Atilgan. Use the URL only to inspect the vacancy:
${url}

${CANDIDATE}

TASK
- Read the exact vacancy and cross-check the official/ATS version only if necessary.
- Identify the correct position title and company.
- Score fit 0.0-10.0 based on realistic candidacy, transferable experience, seniority, language/location eligibility, operational scope, career upside and likely enjoyment.
- Give exactly 3 short, concrete reasons. Each reason must connect a real vacancy requirement/responsibility to a real candidate strength.
- Be demanding and penalize major must-have gaps.
- Never print or mention the URL, domain, website, source, citation or job-board name anywhere in the output.

OUTPUT EXACTLY:
STATUS: OPEN
TITLE: ...
COMPANY: ...
LOCATION: ...
PUBLISHED_DATE: YYYY-MM-DD or N/A
LANGUAGE_CHECK: ...
SCORE: 8.4
WHY_FIT_1: ...
WHY_FIT_2: ...
WHY_FIT_3: ...

Plain text only. No links, citations or extra commentary.`;
}

function parseAskOutput(text, originalUrl) {
  const fields = {};
  for (const raw of String(text || "").split("\n")) {
    const line = raw.trim();
    const i = line.indexOf(":");
    if (i <= 0) continue;
    fields[line.slice(0,i).trim().toUpperCase()] = line.slice(i+1).trim();
  }

  const status = String(fields.STATUS || "UNKNOWN").toUpperCase();
  const score = Math.round(Math.max(0, Math.min(10, Number(fields.SCORE) || 0)) * 10) / 10;
  const whyFit = [fields.WHY_FIT_1,fields.WHY_FIT_2,fields.WHY_FIT_3]
    .map(v=>cleanGeneratedText(v)).filter(Boolean);

  if (!fields.TITLE || !fields.COMPANY || whyFit.length < 2 || !Number.isFinite(score)) {
    throw new Error("Could not identify and evaluate this vacancy reliably.");
  }

  return {
    status,
    title:cleanGeneratedLabel(fields.TITLE),
    company:cleanGeneratedLabel(fields.COMPANY),
    location:cleanGeneratedLabel(fields.LOCATION||""),
    publishedDate:/^\d{4}-\d{2}-\d{2}$/.test(String(fields.PUBLISHED_DATE||"").trim()) ? String(fields.PUBLISHED_DATE).trim() : "",
    languageCheck:cleanGeneratedText(fields.LANGUAGE_CHECK||""),
    score,
    whyFit:whyFit.slice(0,3),
    url:normalizeUrl(originalUrl)
  };
}

async function analyzeAskLink(req, res) {
  if (!OPENAI_API_KEY) return sendJson(res, 503, { error: "OPENAI_API_KEY is not configured in Railway." });

  const body = await readJson(req);
  const url = normalizeUrl(body?.url);
  if (!/^https?:\/\//i.test(url)) return sendJson(res, 400, { error: "Enter a valid job vacancy URL." });

  try {
    const data = await openAIRequest("https://api.openai.com/v1/responses", {
      method: "POST",
      body: JSON.stringify({
        model: OPENAI_MODEL,
        store: false,
        tools: [{ type: "web_search", search_context_size: "low" }],
        tool_choice: "required",
        input: buildAskPrompt(url),
        max_output_tokens: 900
      })
    });
    const job = parseAskOutput(extractOutputText(data), url);
    return sendJson(res, 200, { job, analyzedAt: new Date().toISOString(), appVersion: APP_VERSION });
  } catch (error) {
    console.error("U-Job Ask analysis error:", error);
    return sendJson(res, 502, { error: error?.message || "Could not analyze this vacancy." });
  }
}

async function openAIRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}

  if (!response.ok) {
    const detail = data?.error?.message || `OpenAI API error (${response.status}).`;
    const error = new Error(detail);
    error.httpStatus = response.status;
    throw error;
  }

  return data;
}

async function startSearch(req, res) {
  if (!OPENAI_API_KEY) {
    return sendJson(res, 503, { error: "OPENAI_API_KEY is not configured in Railway." });
  }

  const body = await readJson(req);
  const mode = String(body?.mode || "");
  if (!MODES[mode]) return sendJson(res, 400, { error: "Unknown mode." });

  const seenUrls = Array.isArray(body?.seenUrls) ? body.seenUrls.map(String) : [];
  const strictPrompt = buildStrictPrompt(buildPrompt(mode, seenUrls), mode);

  try {
    const data = await openAIRequest("https://api.openai.com/v1/responses", {
      method: "POST",
      body: JSON.stringify({
        model: OPENAI_MODEL,
        background: true,
        store: true,
        tools: [{
          type: "web_search",
          search_context_size: "medium",
          user_location: {
            type: "approximate",
            country: "BE",
            city: "Antwerp",
            region: "Flanders",
            timezone: "Europe/Brussels"
          }
        }],
        tool_choice: "required",
        input: strictPrompt,
        max_output_tokens: mode === "prestige" ? 3900 : mode === "reasonable" ? 3600 : 3200
      })
    });

    if (!data?.id) {
      return sendJson(res, 502, { error: "OpenAI did not return a background response ID." });
    }

    return sendJson(res, 202, {
      searchId: data.id,
      mode,
      status: data.status || "queued",
      appVersion: APP_VERSION
    });
  } catch (error) {
    console.error("U-Job start search error:", error);
    return sendJson(res, 502, { error: error?.message || "Could not start search." });
  }
}

async function getSearchStatus(url, res) {
  if (!OPENAI_API_KEY) {
    return sendJson(res, 503, { error: "OPENAI_API_KEY is not configured in Railway." });
  }

  const id = String(url.searchParams.get("id") || "");
  const mode = String(url.searchParams.get("mode") || "");
  if (!id) return sendJson(res, 400, { error: "Missing search id." });
  if (mode && !MODES[mode]) return sendJson(res, 400, { error: "Unknown mode." });

  try {
    const data = await openAIRequest(
      `https://api.openai.com/v1/responses/${encodeURIComponent(id)}`,
      { method: "GET", headers: { "Content-Type": "application/json" } }
    );

    const status = String(data?.status || "in_progress");

    if (status === "completed") {
      const jobs = finalizeJobsFromResponse(data, mode);
      const webSearchCalls = (data.output || []).filter(item => item?.type === "web_search_call").length;

      return sendJson(res, 200, {
        searchId: id,
        mode: mode || null,
        status: "done",
        jobs,
        searchedAt: new Date().toISOString(),
        model: OPENAI_MODEL,
        diagnostics: {
          webSearchCalls,
          responseId: data.id || id,
          responseStatus: status,
          outputTextLength: extractOutputText(data).length
        }
      });
    }

    if (["failed","cancelled","incomplete"].includes(status)) {
      return sendJson(res, 200, {
        searchId: id,
        mode: mode || null,
        status: "error",
        error: data?.error?.message || data?.incomplete_details?.reason || `OpenAI response ended with status: ${status}`
      });
    }

    return sendJson(res, 200, {
      searchId: id,
      mode: mode || null,
      status: "running",
      openAIStatus: status
    });
  } catch (error) {
    console.error("U-Job status error:", error);
    const status = error?.httpStatus === 404 ? 404 : 502;
    return sendJson(res, status, { error: error?.message || "Could not read search status." });
  }
}

async function searchJobs(req, res) {
  return sendJson(res, 410, {
    error: "This endpoint was replaced by background search. Refresh U-Job and run again."
  });
}


async function serveStatic(req, res, pathname) {
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const root = path.resolve(PUBLIC_DIR);
  const resolved = path.resolve(PUBLIC_DIR, relative);

  if (!(resolved === path.join(root, "index.html") || resolved.startsWith(root + path.sep))) {
    return false;
  }

  try {
    const file = await readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();

    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0"
    });

    if (req.method === "HEAD") return res.end();
    res.end(file);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        configured: Boolean(OPENAI_API_KEY),
        model: OPENAI_MODEL,
        appVersion: APP_VERSION,
        railwayService: process.env.RAILWAY_SERVICE_NAME || null,
        railwayCommit: process.env.RAILWAY_GIT_COMMIT_SHA || null
      });
    }

    if (req.method === "POST" && url.pathname === "/api/search/start") {
      return await startSearch(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/ask/analyze") {
      return await analyzeAskLink(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/ms/generate") {
      return await generateMotivationStatement(req, res);
    }

    if (req.method === "GET" && url.pathname === "/api/search/status") {
      return getSearchStatus(url, res);
    }

    if (req.method === "POST" && url.pathname === "/api/search") {
      return await searchJobs(req, res);
    }

    if ((req.method === "GET" || req.method === "HEAD") && await serveStatic(req, res, url.pathname)) {
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      return await serveStatic(req, res, "/");
    }

    return sendJson(res, 404, { error: "Not found." });
  } catch (error) {
    console.error("U-Job server error:", error);
    return sendJson(res, 500, { error: "U-Job server error." });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`U-Job ${APP_VERSION} running on port ${PORT} with ${OPENAI_MODEL}`);
});
