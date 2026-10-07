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
const APP_VERSION = "2.4.0-five-independent";

const MODES = {
  reasonable: {
    label: "Reasonable",
    geography: "Kapellen, Brasschaat and Antwerp first; then Mechelen and Brussels if needed.",
    focus: "Dynamic but realistic next-step roles combining business operations, ownership, entrepreneurship, technology, finance/banking and coordination. Strong examples: Business Operations Manager, Operations Manager, Business Manager, Chief of Staff, Strategy & Operations, founder or executive right-hand, family-office operations, fintech or tech operations, port/logistics or other managerial operational roles. Prefer growing credible companies, international environments, people contact, autonomy and visible impact. Avoid repetitive back-office roles, pure audit/compliance and narrow IAM administration."
  },
  creative: {
    label: "Creative",
    geography: "Kapellen, Brasschaat, Antwerp and Antwerp port region first; wider Belgium only for an exceptional fit.",
    focus: "Niche, boutique, practical and enjoyable roles in premium automotive, workshops or ateliers, yacht/marine, luxury brands, travel or experience agencies, interior/design/renovation, premium hospitality, sports/padel/leisure, animal or dog businesses, estates, family offices, founder-led companies and startups. Value client contact, operational ownership, technology, entrepreneurship, hands-on problem solving, design/renovation experience, cars, sport, travel and boutique dog-hotel experience."
  },
  corporate: {
    label: "Corporate",
    geography: "Antwerp preferred; Brussels, Ghent, Leuven and wider Belgium are acceptable for strong roles.",
    focus: "Prestigious, well-paid corporate roles leveraging 12+ years across banking, internal audit, fraud, internal control, IAM/access operations, IT risk/security and fintech. Target banks, payments, fintech, international financial institutions, respected advisory firms and quality scale-ups. Strong fits include senior operations, financial-crime technology, risk-tech, transformation, business management, security governance, controls, programme/project leadership and strategic operations. Avoid junior roles and narrow back-office IAM work."
  },
  politics: {
    label: "Politics",
    geography: "Brussels first; Antwerp and wider Belgium when the role has strong international, EU, NATO, policy, public-affairs or defence relevance.",
    focus: "Prestigious English-speaking roles connecting banking/fintech/technology experience with an International Relations degree. Search EU institutions and agencies, NATO-related organisations, UN-linked bodies, think tanks, trade associations, public affairs, government relations, policy institutes, lobbying/public-policy consultancies, international organisations, defence/security companies, financial-services federations and policy-facing teams in banks, fintech and payments. Strong titles include Policy Advisor, EU Affairs, Public Affairs, Government Affairs, Regulatory Strategy, Institutional Relations, Geopolitical or Strategic Risk, Financial Services Policy, Defence Policy, Programme Officer, Stakeholder Relations and Strategic Partnerships. Prioritise prestige, senior stakeholder exposure, network-building and international visibility. Reject roles fundamentally requiring a legal/diplomatic career, research doctorate, active security clearance or mandatory fluent Dutch/French."
  }
};

const CANDIDATE = `Candidate profile:
- Based in Kapellen, Belgium.
- 12+ years across banking, internal audit, fraud investigation, internal control, IAM/access operations, IT risk/security and fintech-related work.
- Current employer: ING Belgium.
- Bachelor's degrees in Business Administration and International Relations; MSc in Information Technologies.
- Certifications include CISA, CIA, CIAM, CFE, CFSA and CMB3.
- Entrepreneurial experience: boutique dog hotel and interior/renovation venture.
- Highly tech-savvy and builds AI/web-app workflows using APIs, GitHub and Railway.
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

RULES:
1. Find up to 5 promising vacancies, but return only those that pass final live verification.
2. RETURN EXACTLY 5 RESULTS whenever five valid live vacancies can be found. Use this search ladder in order and stop once five verified roles are available:
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
8. For each candidate, do a separate verification search using company + exact title where needed. Cross-check both (a) current live status and (b) posting date. Do not rely on an old search-engine snippet alone.
9. Never return a role from NEVER REPEAT or a URL from ALREADY SEEN.
10. Do not invent jobs, dates, companies, language requirements or URLs. Fewer verified vacancies are better than stale or weak matches.

NEVER REPEAT:
${NEVER_REPEAT.join("\n")}

ALREADY SEEN URLS:
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

async function callOpenAI(prompt) {
  const headers = {
    "Authorization": `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json"
  };

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  const strictPrompt = `${prompt}

FINAL VERIFICATION MUST HAPPEN IN THIS SAME LIVE WEB SEARCH RUN.

Today is ${today} in Belgium.

Before returning ANY vacancy:
- Open/check the exact current vacancy or ATS page.
- Confirm the specific job is still live and accepting applications now.
- Confirm an exact publication/posting date from a credible source. Prefer the vacancy/ATS metadata; if needed cross-check a reliable dated vacancy source.
- Prefer vacancies from the last 7 days. If fewer than five pass, widen to 14 days, then 30 days, then at most 60 days.
- Every accepted vacancy must still be live and accepting applications today.
- If exact date cannot be established as YYYY-MM-DD, REJECT the vacancy. Do not output "date not shown".
- If the page is unavailable, expired, archived, removed, 404, redirects to a generic careers page, or says no longer accepting applications, REJECT it.
- If the employer/ATS vacancy is dead, do not substitute an aggregator copy.
- Confirm from the requirements that English is sufficient. Mandatory fluent/professional Dutch or French means REJECT.
- The role must have a genuine fit to the candidate profile and score at least 6.5/10.
- Keep searching and widening within the stated ladder until you have exactly 5 verified roles whenever five exist.
- Never include a closed, language-mismatched or clearly irrelevant vacancy just to reach five results.

OUTPUT FORMAT:
Return plain text only. For each accepted vacancy use exactly this block:

---JOB---
VERIFIED_OPEN: YES
TITLE: ...
COMPANY: ...
LOCATION: ...
DIRECT_URL: https://...
PUBLISHED_DATE: YYYY-MM-DD
LANGUAGE_CHECK: ...
SCORE: 8.7
WHY_FIT_1: ...
WHY_FIT_2: ...
WHY_FIT_3: ...

Do not output rejected vacancies.
Do not use markdown tables.
Do not output "date not shown", "unknown", relative dates, or guessed dates.
If nothing passes all checks, output exactly: NO_VERIFIED_JOBS
`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL,
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
        max_output_tokens: 4200
      })
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      const e = new Error("Live search timed out. Please run it again.");
      e.httpStatus = 504;
      throw e;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const raw = await response.text();

  if (!response.ok) {
    let detail = "";
    try {
      const parsed = JSON.parse(raw);
      detail = parsed?.error?.message ? String(parsed.error.message) : "";
    } catch {}
    const error = new Error(detail || `OpenAI web-search error (${response.status}).`);
    error.httpStatus = response.status;
    throw error;
  }

  const data = JSON.parse(raw);
  const outputText = extractOutputText(data);
  const webSearchCalls = (data.output || []).filter(item => item?.type === "web_search_call").length;

  if (!outputText) {
    throw new Error("Live web search completed but returned no vacancy text.");
  }

  const parsed = outputText.includes("NO_VERIFIED_JOBS")
    ? { jobs: [] }
    : parseVerifiedJobs(outputText);

  return {
    parsed,
    diagnostics: {
      webSearchCalls,
      responseId: data.id || null,
      responseStatus: data.status || null,
      outputTextLength: outputText.length
    }
  };
}


async function searchJobs(req, res) {
  if (!OPENAI_API_KEY) {
    return sendJson(res, 503, { error: "OPENAI_API_KEY is not configured in Railway." });
  }

  const body = await readJson(req);
  const mode = String(body?.mode || "");
  if (!MODES[mode]) return sendJson(res, 400, { error: "Unknown mode." });

  const seenUrls = Array.isArray(body?.seenUrls) ? body.seenUrls.map(String) : [];

  try {
    const result = await callOpenAI(buildPrompt(mode, seenUrls));
    const excluded = new Set(seenUrls.map(normalizeUrl));
    const duplicates = new Set();

    const jobs = (Array.isArray(result.parsed?.jobs) ? result.parsed.jobs : [])
      .map(cleanJob)
      .filter(job => job.title && job.company && /^https?:\/\//i.test(job.url) && job.whyFit.length === 3)
      .filter(job => isAllowedPublishedDate(job.publishedDate))
      .filter(job => job.score >= 6.5)
      .filter(job => /english/i.test(job.languageCheck) && !/mandatory.*(dutch|french)|(dutch|french).*mandatory/i.test(job.languageCheck))
      .filter(job => !excluded.has(job.url))
      .filter(job => {
        const key = `${job.company.toLowerCase()}|${job.title.toLowerCase()}`;
        if (duplicates.has(key)) return false;
        duplicates.add(key);
        return true;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return sendJson(res, 200, {
      jobs,
      searchedAt: new Date().toISOString(),
      model: OPENAI_MODEL,
      diagnostics: result.diagnostics
    });
  } catch (error) {
    console.error("U-Job search error:", error);
    let status = 500;
    if (error.httpStatus === 401) status = 502;
    else if (error.httpStatus === 429) status = 502;
    else if (error.httpStatus >= 400 && error.httpStatus < 500) status = 502;

    return sendJson(res, status, {
      error: error.message || "Search failed."
    });
  }
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
      "Cache-Control": relative === "service-worker.js"
        ? "no-cache, no-store, must-revalidate"
        : "public, max-age=60"
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
