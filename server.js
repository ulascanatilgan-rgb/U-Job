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
const APP_VERSION = "3.1.0-linkedin-mode";

const MODES = {
  reasonable: {
    label: "Reasonable",
    geography: "Kapellen, Brasschaat and Antwerp first; then Mechelen and Brussels; wider Belgium only for an unusually strong fit.",
    focus: "Fintech-heavy, realistic next-step roles with strong ownership and people/stakeholder contact. Prioritise Business Operations Manager, Strategy & Operations, Operations Manager, Business Manager, Chief of Staff, founder or executive right-hand, Product Operations, Customer Operations, fintech operations, payments operations, implementation, partnerships and operational programme roles. Search fintechs, payments companies, financial technology scale-ups and founder-led technology businesses first, but allow any sector when the role is an unusually strong match. Value international environments, visible impact, process building, automation, cross-functional ownership and a path toward broader leadership. Avoid repetitive back-office roles, pure audit/compliance and narrow IAM administration."
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
  ai: {
    label: "AI",
    geography: "Belgium-wide. Prioritise Antwerp, Brussels, Mechelen, Ghent and Leuven. Hybrid roles based in Belgium are welcome.",
    focus: "Current English-speaking AI-related roles with strong growth potential and a credible fit to this candidate. Prioritise AI Operations, AI Product Operations, AI Product Manager, AI Transformation, GenAI Programme or Project roles, AI Strategy, AI Governance, Responsible AI, AI Risk, AI Adoption, AI Enablement, AI Solutions, AI Business Operations, AI Customer Success, AI Partnerships, AI Implementation, AI Consulting, AI/Data Transformation and AI-enabled fintech or banking roles. The candidate has an MSc in Information Technologies with machine-learning focus, strong data/analytics exposure, banking and IT-risk experience, IAM/security knowledge, operational ownership, stakeholder management, entrepreneurship, and hands-on experience building AI/API/GitHub/Railway web workflows. Prefer roles where technical literacy, business judgement, process design, implementation and stakeholder leadership matter more than being a full-time software engineer or research scientist. Pure ML research, PhD-level research, highly specialised model-training engineering and roles requiring deep production coding as a hard requirement should normally be rejected."
  },
  prestige: {
    label: "Prestige",
    geography: "Belgium only, primarily Brussels; Antwerp and wider Belgium when the institution or role has strong national or international relevance.",
    focus: "Broad prestige and institutional mode combining policy, politics, finance, security and international affairs. Search respected institutions and reputation-building employers such as NATO and NATO-adjacent bodies, EU institutions/agencies and European Commission related organisations, National Bank of Belgium and other central-bank/financial-policy bodies, banking federations and associations, chambers of commerce, government-linked agencies, embassies and diplomatic missions when publicly recruiting, international organisations, defence/security organisations, geopolitical and intelligence/security consultancies, major think tanks, trade associations, public-affairs organisations, policy institutes, royal foundations or royal-household related organisations when publicly recruiting, strategic partnerships teams and other internationally connected institutions. Strong role families include Policy Advisor, Financial Services Policy, Programme Officer/Manager, Institutional Relations, EU/Public Affairs, Government Affairs, Strategic Partnerships, Stakeholder Relations, Regulatory Strategy, Geopolitical/Strategic Risk, Security Governance, Business/Operations Management and policy implementation. Use the candidate's International Relations degree together with banking, audit, fraud, IAM/security, technology and stakeholder-management background. Prioritise reputation, international network, senior stakeholder exposure and realistic career leverage. Reject jobs requiring Belgian nationality, sworn police/military status, an already-active security clearance, mandatory fluent Dutch/French, a diplomatic career track, or specialist legal/doctoral credentials the candidate lacks."
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
  turkish: {
    label: "Turkish",
    geography: "Belgium only, with Antwerp and Brussels first; include other Belgian locations for a strong Turkey/Turkish-language connection.",
    focus: "Roles where native Turkish can be a meaningful advantage and the job is based in Belgium. Search companies serving the Turkish market, organisations trading with Turkey, Turkish-owned or Turkey-linked companies with Belgian operations, Belgian companies with Turkish clients/suppliers/partners, firms with offices or substantial business in both Belgium and Turkey, logistics/import-export businesses, airlines/travel, fintech/payments, banking, technology, customer success, account management, business development, operations, partnerships, market expansion and international trade roles. Turkish may be required, preferred or clearly commercially useful. English must still be sufficient for the working environment; mandatory fluent Dutch or French is normally a rejection criterion. Prioritise roles that also fit the candidate's operations, banking/fintech, stakeholder, technology, security/risk, entrepreneurship or business-management background rather than generic low-skill Turkish-speaking vacancies."
  }
};

const CANDIDATE = `Candidate profile:
- Based in Kapellen, Belgium.
- 12+ years across banking, internal audit, fraud investigation, internal control, IAM/access operations, IT risk/security and fintech-related work.
- Current employer: ING Belgium.
- Bachelor's degrees in Business Administration and International Relations; MSc in Information Technologies with machine-learning focus.
- Certifications include CISA, CIA, CIAM, CFE, CFSA and CMB3.
- Entrepreneurial experience: boutique dog hotel and interior/renovation venture.
- Highly tech-savvy and builds AI/web-app workflows using OpenAI APIs, GitHub and Railway; comfortable combining business processes, data analysis and AI automation.
- Prefers dynamic ownership, people contact, planning, coordination, visible impact and international environments.
- English fluent. Dutch is still developing. Mandatory fluent Dutch or French is normally a rejection criterion.`;

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
    score: Math.round(Math.max(0, Math.min(10, Number(job?.score) || 0)) * 10) / 10,
    whyFit: Array.isArray(job?.whyFit)
      ? job.whyFit.slice(0, 3).map(v => String(v).trim()).filter(Boolean)
      : []
  };
}

function buildPrompt(mode, seenUrls) {
  const cfg = MODES[mode];
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  const seen = seenUrls.slice(-250).map(normalizeUrl).filter(Boolean);

  return `Perform live web searches for CURRENT job vacancies in Belgium.

Today: ${today}
Mode: ${cfg.label}

${CANDIDATE}

SEARCH TARGET:
${cfg.focus}

GEOGRAPHY:
${cfg.geography}

${mode === "linkedin" ? `LINKEDIN MODE — HARD RULES:
- Search LinkedIn job postings specifically, using LinkedIn Jobs result pages/job-view pages as the discovery source.
- Publication date must be within the last 7 calendar days inclusive. Do NOT widen beyond 7 days.
- The final DIRECT_URL should be the specific LinkedIn job posting URL whenever it is accessible.
- Verify the LinkedIn posting is still active. Cross-check company/title on the employer's official career/ATS page when possible, but keep the LinkedIn vacancy as the final link.
- Rank toward roles where this candidate has unusually strong fit, high ownership, likely enjoyment/energy, strong compensation or career upside, and a realistic chance of standing out.
- WHY_FIT_1 should explain profile fit; WHY_FIT_2 should explain why the work environment/scope may be energising and enjoyable; WHY_FIT_3 should explain compensation/career-leverage potential without inventing salary.
` : ""}

RULES:
1. Search broadly and deeply across multiple source types, then verify up to 12 promising vacancies so the backend can select the strongest 5. Return up to 5 final roles; there is no minimum count. Quality, recency and verification are more important than filling the list.
2. Return up to 5 results. Use this search ladder in order and continue only while additional roles remain genuinely relevant and verifiable:
   TIER A: published in the last 7 days, preferred geography and exact mode fit.
   TIER B: last 14 days, widen geography across Belgium.
   TIER C: last 30 days, include adjacent but still clearly relevant titles/sectors.
   TIER D: up to 60 days old only when the vacancy is demonstrably still live and accepting applications now.
   Never use an older posting merely because it is indexed; live status must be verified.
3. A precise publication date is mandatory. Verify it from the live vacancy/ATS page, employer metadata, or a reliable current dated vacancy source. If you cannot establish an exact YYYY-MM-DD date, exclude it.
4. The vacancy must be currently open and accepting applications. Ignore cached, archived, expired, removed, filled, unavailable, 404, or "no longer accepting applications" pages.
5. English must be sufficient for doing the job. Reject roles that require fluent/professional Dutch or French. Do not assume English is sufficient just because the ad is written in English.
6. Prefer the employer's official career page or active ATS direct vacancy page. A generic careers homepage or stale aggregator is not an acceptable final link.
7. Check the actual requirements against this candidate profile. Return only meaningfully relevant roles with a fit score of at least 6.5/10. Reject roles with a major must-have gap.
8. Search across multiple source classes and query families, not one job board only. Use official employer/institution career pages, direct ATS pages such as Workday/Greenhouse/Lever/SmartRecruiters, public-sector or institutional vacancy portals, recognised recruiter/HR agency listings, specialist sector job boards and major current job platforms. For Prestige actively inspect institutional, policy, banking-association, central-bank, think-tank, EU/NATO-adjacent and international-organisation career sites. For Corporate search bank career pages intensively. For Reasonable search fintech/payments/scale-up career pages intensively. For Turkish search both Turkey-linked employers and Belgian employers with Turkey-market exposure. For High Paid also inspect executive/senior recruiter portals. For each candidate separately cross-check (a) current live status, (b) exact posting date, (c) language requirements and (d) direct application availability. Do not rely on an old search-engine snippet alone.
9. NEVER REPEAT entries remain excluded. For ALREADY SEEN URLs, prefer new/unseen roles first; however, if fewer than five unseen verified live roles exist, previously seen URLs may be reused to fill the list to exactly five.
10. Search the freshness/geography/source ladder thoroughly and return the best 0–5 verified roles. Never weaken the rules merely to increase the count. Never invent jobs, dates, companies, compensation, language requirements or URLs.

NEVER REPEAT:
${NEVER_REPEAT.join("\n")}

ALREADY SEEN URLS — avoid when possible, but reuse only if needed to reach five verified live results:
${seen.length ? seen.join("\n") : "None"}

After completing the web research, return only vacancies that pass every rule.
For each accepted vacancy include these exact fields on separate lines:
TITLE, COMPANY, LOCATION, DIRECT_URL, PUBLISHED_DATE, LANGUAGE_CHECK, SCORE, WHY_FIT_1, WHY_FIT_2, WHY_FIT_3.
Always write the full direct vacancy URL explicitly as plain text.
PUBLISHED_DATE must be exact YYYY-MM-DD.
LANGUAGE_CHECK must explicitly confirm that English is sufficient and that Dutch/French is not mandatory.
Do not use markdown tables.
If any required fact cannot be verified, exclude that vacancy rather than writing unknown.`;
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
      score: Number.isFinite(score) ? score : 0,
      whyFit
    });
  }

  return { jobs };
}

function buildStrictPrompt(prompt, mode) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  return `${prompt}

FINAL VERIFICATION MUST HAPPEN IN THIS SAME LIVE WEB SEARCH RUN.

Today is ${today} in Belgium.

Before returning ANY vacancy:
- Open/check the exact current vacancy or ATS page.
- Confirm the specific job is still live and accepting applications now.
- Confirm an exact publication/posting date from a credible source. Prefer vacancy/ATS metadata; if needed cross-check a reliable dated source.
${mode === "linkedin"
  ? "- LINKEDIN MODE: publication date MUST be within the last 7 days. Never widen beyond 7 days. The final URL must be a specific LinkedIn job posting."
  : "- Prefer the last 7 days. If fewer than five pass, widen to 14 days, then 30 days, then at most 60 days."}
- Every accepted vacancy must still be live and accepting applications today.
- If exact date cannot be established as YYYY-MM-DD, REJECT it.
- If the page is unavailable, expired, archived, removed, 404, redirects to a generic careers page, or says no longer accepting applications, REJECT it.
- Confirm English is sufficient. Mandatory fluent/professional Dutch or French means REJECT.
- The role must have genuine fit to the candidate and score at least 6.5/10.
- Search multiple source classes and find up to 12 strong candidates so the backend can select the best five. There is no minimum result count; verification and relevance take priority.
- Prefer unseen roles, but previously seen still-live roles may fill remaining slots.
- Never include a closed, language-mismatched or clearly irrelevant vacancy just to reach five.

OUTPUT FORMAT:
Return plain text only. For each accepted vacancy use exactly:

---JOB---
VERIFIED_OPEN: YES
TITLE: ...
COMPANY: ...
LOCATION: ...
DIRECT_URL: https://...
PUBLISHED_DATE: YYYY-MM-DD
LANGUAGE_CHECK: English sufficient; Dutch/French not mandatory.
SCORE: 8.7
WHY_FIT_1: ...
WHY_FIT_2: ...
WHY_FIT_3: ...

Do not output rejected vacancies.
Do not output "date not shown", "unknown", relative dates, or guessed dates.
If nothing passes all checks, output exactly: NO_VERIFIED_JOBS
`;
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

  const maxAgeDays = mode === "linkedin" ? 7 : 60;
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
    .filter(job => job.score >= 6.5)
    .filter(job => mode !== "linkedin" || isLinkedInJobUrl(job.url))
    .filter(job => {
      const lang = String(job.languageCheck || "");
      const cleaned = lang
        .replace(/\bnot\s+(mandatory|required)\b/gi, "")
        .replace(/\bno\s+(mandatory|required)\b/gi, "");
      return /english/i.test(lang) &&
        !/\b(dutch|french)\b.{0,30}\b(required|mandatory|fluent|professional)\b/i.test(cleaned);
    })
    .filter(job => {
      const key = `${job.company.toLowerCase()}|${job.title.toLowerCase()}`;
      if (duplicates.has(key)) return false;
      duplicates.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
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
          search_context_size: "high",
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
        max_output_tokens: 6400
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
