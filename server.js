import http from "http";
import path from "path";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");

const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-6-sol";

const MODES = {
  reasonable: {
    label: "Reasonable",
    geography: "Kapellen, Brasschaat, Antwerp and nearby are strongly preferred. Mechelen or Brussels only for unusually strong matches.",
    focus: "Balanced next-step roles combining business operations, ownership, entrepreneurship, technology, finance/banking and coordination. Target Business Operations Manager, Operations Manager, Business Manager, Chief of Staff, Strategy & Operations, founder/executive right-hand, family-office operations, fintech/tech operations, port/logistics or similar. Prefer growing but credible companies, international environments, people contact, autonomy and visible impact. Avoid repetitive back-office, pure audit/compliance and narrow IAM administration."
  },
  creative: {
    label: "Creative",
    geography: "Kapellen, Brasschaat, Antwerp and the Antwerp port region are the priority. Widen only for exceptional dream-job fit.",
    focus: "Bold, niche, boutique and hands-on roles: premium automotive, workshop/atelier, yacht/marine, luxury brands, travel/experience agencies, interior/design/renovation, premium hospitality, sports/padel/leisure, animal/dog businesses, estates, family offices, founder-led companies and startups. Value operational ownership, client contact, practical problem-solving, technology, entrepreneurship, design/renovation experience, cars, sport, travel and boutique dog-hotel experience."
  },
  corporate: {
    label: "Corporate",
    geography: "Antwerp preferred, but Brussels, Ghent, Leuven and other Belgian business hubs are acceptable for a strong role.",
    focus: "Prestigious, well-paid corporate roles leveraging 12+ years across banking, internal audit, fraud, internal control, IAM/access operations, IT risk/security and fintech. Target banks, payments/fintech, financial institutions, respected advisory firms, international organisations and quality scale-ups. Strong fits include senior operations, financial-crime technology, risk-tech, transformation, business management, security governance, controls, programme/project leadership and strategic operations. Avoid junior positions and narrow back-office IAM work."
  },
  politics: {
    label: "Politics",
    geography: "Brussels is the primary hub. Also consider Antwerp and other Belgian locations for unusually strong EU, NATO, international-policy, public-affairs or defence relevance.",
    focus: "Prestigious English-speaking roles connecting banking/fintech/technology experience with an International Relations academic background. Search EU institutions and agencies, NATO-related organisations, UN-linked bodies, think tanks, trade associations, public affairs, government relations, policy institutes, lobbying/public-policy consultancies, international organisations, defence/security companies, financial-services federations and policy-facing teams in banks/fintech/payments. Target Policy Advisor, EU Affairs, Public Affairs, Government Affairs, Regulatory Strategy, International or Institutional Relations, Geopolitical/Strategic Risk, Financial Services Policy, Defence Policy, Programme Officer, Stakeholder Relations and Strategic Partnerships. Prioritise senior stakeholder exposure, prestige, international visibility and network-building potential. Reject roles that fundamentally require a legal/diplomatic career, advanced economics research, active security clearance, or mandatory fluent Dutch/French."
  }
};

const CANDIDATE = `Candidate profile:
- Based in Kapellen, Belgium.
- 12+ years across banking, internal audit, fraud investigation, internal control, IAM/access operations, IT risk/security and fintech-related work.
- Current employer: ING Belgium; current area: IAM / access operations.
- Academic background includes Business Administration and International Relations, plus an MSc in Information Technologies.
- Certifications include CISA, CIA, CIAM, CFE, CFSA and CMB3.
- Entrepreneurial and operational experience includes a boutique dog hotel and an interior/renovation venture.
- Highly tech-savvy; builds AI/web-app workflows with APIs, GitHub and Railway.
- Prefers dynamic ownership, people contact, planning, coordination, visible impact and international environments.
- English fluent. Dutch is developing. Jobs requiring fluent/professional Dutch or French are normally unsuitable.`;

const PRIOR_SHOWN = [
  "Cross Chartering Yacht Transport — Operations & Documentation Coordinator",
  "ElevenLabs — Enterprise Deployment Chief of Staff",
  "Lighthouse — Senior Project Manager / Business",
  "Paynovate — Financial Crime Technology Manager",
  "WORXINVEST / HR Pay Solutions — Payment Operations Expert",
  "Shiperise — Operations & Customer Success Manager",
  "A&O Shearman — Policy Advisor Financial Services",
  "Mastercard — Director Product Manager Threat Protection & IP Intelligence",
  "SWIFT — Compliance Assurance Specialist",
  "SWIFT — Enterprise Risk Analyst",
  "Shield AI — Business Development Lead Belgium NATO & Luxembourg",
  "Flint Global — Financial Services Consultant / Senior Consultant / Manager",
  "EPI — Scheme Acceptance Rules Manager",
  "Revolut — Operations Manager Banking",
  "bunq — Deputy AML Branch Manager",
  "ING — Project Manager Core Banking Transformation",
  "Dries Van Noten — IT Business Application Manager",
  "FLYINGGROUP — Airworthiness Executive",
  "FLYINGGROUP — OCC Flight Care Agent",
  "EXMAR — Fleet Personnel Coordinator",
  "Tomorrowland — Music Cluster & Studio Coordinator",
  "Prosana — Executive Assistant to Founder",
  "extreme cashmere — Executive Assistant to Founder & Managing Director",
  "BioCompute — Executive Assistant to Founder"
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

function normaliseUrl(value) {
  try {
    const u = new URL(String(value));
    u.hash = "";
    ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","gh_src","src","source","ref"].forEach(k => u.searchParams.delete(k));
    return u.toString().replace(/\/$/, "");
  } catch {
    return String(value || "").trim();
  }
}

function extractText(response) {
  if (typeof response.output_text === "string" && response.output_text.trim()) return response.output_text;
  return (response.output || [])
    .flatMap(item => item.content || [])
    .filter(item => item.type === "output_text" && typeof item.text === "string")
    .map(item => item.text)
    .join("\n");
}

function parseJson(text) {
  const cleaned = String(text || "").trim().replace(/^\`\`\`json\s*/i, "").replace(/\`\`\`$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const a = cleaned.indexOf("{");
  const b = cleaned.lastIndexOf("}");
  if (a >= 0 && b > a) return JSON.parse(cleaned.slice(a, b + 1));
  throw new Error("Search response was not valid JSON.");
}

function cleanJob(job) {
  const whyFit = Array.isArray(job?.whyFit) ? job.whyFit.slice(0, 3).map(x => String(x).trim()).filter(Boolean) : [];
  return {
    title: String(job?.title || "").trim(),
    company: String(job?.company || "").trim(),
    location: String(job?.location || "").trim(),
    url: normaliseUrl(job?.url),
    publishedDate: String(job?.publishedDate || "").trim(),
    languageCheck: String(job?.languageCheck || "").trim(),
    score: Math.round(Math.max(0, Math.min(10, Number(job?.score) || 0)) * 10) / 10,
    whyFit
  };
}

function promptFor(mode, seenUrls) {
  const cfg = MODES[mode];
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  const excluded = seenUrls.slice(-200).map(normaliseUrl).filter(Boolean);

  return `You are U-Job, a rigorous live vacancy search and verification engine.
Today in Belgium: ${today}.

${CANDIDATE}

MODE: ${cfg.label}
TARGET PROFILE: ${cfg.focus}
GEOGRAPHY: ${cfg.geography}

Search the live web and return up to 5 genuinely strong OPEN vacancies.

STRICT RULES:
1. FRESHNESS: prioritise vacancies posted in the last 72 hours, then the last 7 days. Prefer a verified posting/update date. If the official vacancy is clearly live and accepting applications but no public posting date is shown, it may still be included and publishedDate should be "Live — date not shown".
2. OPEN STATUS: inspect the actual vacancy/application page and reject closed, expired, removed or archived listings.
3. LANGUAGE: double-check the actual requirements. English must be sufficient. Reject roles where fluent/professional Dutch or French is mandatory. At most one exceptional >=9.5/10 role may be included if Dutch/French is explicitly only preferred/asset, never mandatory.
4. LINK: return the direct official employer/ATS application URL whenever possible. Avoid generic home pages and search pages.
5. FIT: reject roles with major must-have requirements the candidate clearly lacks. Do not fill the list with weak matches.
6. QUALITY: prefer mid-senior or senior roles, ownership, credible employers, meaningful compensation, visibility and career value.
7. DUPLICATES: do not return a previously shown role, equivalent role, or already-seen URL.
8. SCORE: rate candidate fit 0.0–10.0. Be strict; 9+ should be rare. Sort highest score first.
9. WHY FIT: exactly 3 short, specific sentences.
10. Aim for 5 results, but never fabricate. If fewer than 5 strong matches exist in the preferred geography, widen geographically within Belgium before weakening role fit or language requirements.

PREVIOUSLY SHOWN ROLES:
${PRIOR_SHOWN.join("\n")}

ALREADY-SEEN U-JOB URLS:
${excluded.length ? excluded.join("\n") : "None"}

Return ONLY JSON:
{"jobs":[{"title":"Role","company":"Company","location":"City","url":"https://direct-application-url","publishedDate":"YYYY-MM-DD","languageCheck":"English sufficient; Dutch/French not mandatory.","score":8.7,"whyFit":["Short sentence 1.","Short sentence 2.","Short sentence 3."]}]}`;
}

async function callSearch(prompt) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      tools: [{ type: "web_search" }],
      tool_choice: "auto",
      input: prompt,
      max_output_tokens: 4200
    })
  });

  if (!response.ok) {
    const raw = await response.text();
    console.error("OpenAI API error", response.status, raw.slice(0, 1000));
    let error = `OpenAI API error (${response.status}).`;
    if (response.status === 401) error = "OpenAI API key is invalid or rejected.";
    else if (response.status === 403) error = "This OpenAI API key/project does not have access.";
    else if (response.status === 404) error = `Model '${OPENAI_MODEL}' is not available to this API project.`;
    else if (response.status === 429) error = "OpenAI API billing/quota limit reached.";
    const e = new Error(error);
    e.status = 502;
    throw e;
  }

  const data = await response.json();
  return parseJson(extractText(data));
}

function finaliseJobs(rawJobs, seenUrls, existing = []) {
  const excluded = new Set(seenUrls.map(normaliseUrl));
  const dedupe = new Set(existing.map(j => `${j.company.toLowerCase()}|${j.title.toLowerCase()}`));
  const out = [...existing];

  for (const raw of Array.isArray(rawJobs) ? rawJobs : []) {
    const j = cleanJob(raw);
    if (!j.title || !j.company || !/^https?:\/\//i.test(j.url)) continue;
    if (excluded.has(j.url)) continue;
    const key = `${j.company.toLowerCase()}|${j.title.toLowerCase()}`;
    if (dedupe.has(key)) continue;
    dedupe.add(key);
    out.push(j);
    if (out.length >= 5) break;
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 5);
}

function fallbackPrompt(mode, seenUrls, currentJobs) {
  return promptFor(mode, seenUrls) + `

FALLBACK PASS:
The strict first pass found too few results. Search again, using different queries and sources.
- Keep English-sufficient and open-status rules strict.
- Keep direct application links strict.
- Expand freshness to the last 14 days first, and only if necessary up to 21 days.
- Search official company career pages plus Greenhouse, Lever, Workday, SmartRecruiters, EuroBrussels, Euractiv Jobs, LinkedIn Jobs and relevant Belgian/international sector job boards.
- For Reasonable and Creative, search Antwerp/Kapellen/Brasschaat first, then Mechelen/Brussels/Belgium if needed.
- For Corporate and Politics, Brussels and wider Belgium are fully acceptable.
- Do NOT repeat these already selected roles: ${currentJobs.map(j => `${j.company} — ${j.title}`).join("; ") || "None"}.
Return only additional strong matches in the same JSON format.`;
}

async function searchJobs(req, res) {
  if (!OPENAI_API_KEY) return sendJson(res, 503, { error: "OPENAI_API_KEY is not configured in Railway." });

  const body = await readJson(req);
  const mode = String(body.mode || "");
  if (!MODES[mode]) return sendJson(res, 400, { error: "Unknown search mode." });
  const seenUrls = Array.isArray(body.seenUrls) ? body.seenUrls.map(String) : [];

  try {
    const first = await callSearch(promptFor(mode, seenUrls));
    let jobs = finaliseJobs(first.jobs, seenUrls);

    if (jobs.length < 4) {
      const second = await callSearch(fallbackPrompt(mode, seenUrls, jobs));
      jobs = finaliseJobs(second.jobs, seenUrls, jobs);
    }

    sendJson(res, 200, {
      jobs,
      searchedAt: new Date().toISOString(),
      model: OPENAI_MODEL,
      searchPasses: jobs.length < 4 ? 2 : 1
    });
  } catch (error) {
    console.error(error);
    return sendJson(res, error.status || 500, { error: error.message || "Search failed." });
  }
}

async function serveStatic(req, res, pathname) {
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const resolved = path.resolve(PUBLIC_DIR, relative);
  const root = path.resolve(PUBLIC_DIR);
  if (!(resolved === path.join(root, "index.html") || resolved.startsWith(root + path.sep))) return false;

  try {
    const file = await readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": relative === "service-worker.js" ? "no-cache" : "public, max-age=300"
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
        model: OPENAI_MODEL
      });
    }

    if (req.method === "POST" && url.pathname === "/api/search") {
      return await searchJobs(req, res);
    }

    if ((req.method === "GET" || req.method === "HEAD") && await serveStatic(req, res, url.pathname)) return;
    if (req.method === "GET" || req.method === "HEAD") return await serveStatic(req, res, "/");

    return sendJson(res, 404, { error: "Not found." });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "U-Job server error." });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`U-Job running on port ${PORT}`);
});
