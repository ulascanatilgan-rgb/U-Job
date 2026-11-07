import http from "http";
import path from "path";
import { readFile, writeFile, mkdir } from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");

const PORT = Number(process.env.PORT || 3000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = "gpt-5.6-luna";
const APP_VERSION = "5.1.0-fast-efficient-search";
const SYNC_FILE = process.env.UJOB_DATA_FILE || path.join(__dirname, "ujob-data.json");
let syncWriteQueue = Promise.resolve();

const MODES = {
  search: {
    label: "Search",
    geography: "Belgium first, prioritising Antwerp/Kapellen, Brussels and Ghent. Include strong hybrid Belgium roles. Also allow exceptional EU-institutional, Europe/EMEA remote, Switzerland/Monaco or other international roles only when they clearly outperform Belgian options on fit, prestige, compensation or career leverage.",
    focus: "Master search across every U-Job theme. Find the twelve strongest current vacancies for this candidate across every Details theme: reasonable/fintech/business operations, startups, family offices, investment/wealth/research/economics, banking/corporate, AI/technology, prestige/EU/NATO/international institutions, high-paid strategic roles, local Kapellen/Antwerp opportunities, creative/lifestyle/interior work, dog/pet-sector roles, Turkish-market roles and exceptional global/SW-MO opportunities. Rank by realistic candidacy first, then role quality, ownership, international exposure, compensation/career upside, enjoyment and future optionality. Do not include attractive roles with a hard domain-experience requirement the candidate does not meet. Prefer English-speaking roles and reject mandatory professional Dutch/French, junior/repetitive work and major must-have gaps."
  },
  reasonable: {
    label: "Reasonable",
    geography: "Belgium, with Antwerp/Kapellen/Brasschaat and Brussels first; Mechelen/Ghent/Leuven next. Hybrid roles are welcome.",
    focus: "Realistic next-step roles where this candidate can compete credibly without needing a long new-domain track record. Fintech/payments/digital banking remain first priority, especially Business Operations, Strategy & Operations, Operations Manager, Product Operations, Payments Operations, Customer/Client Operations, Implementation, Business Manager, Chief of Staff, Partnerships and Transformation/Programme Operations. If fintech is thin, broaden deliberately to high-fit startups/scale-ups, investment/wealth-tech and investment-product operations, AI/business transformation, banking/financial-services operations, family-office/business-manager roles, broad technology/security governance, and strong local Antwerp/Kapellen operations/project roles. Use banking, audit/control, fraud, IAM/security, project/stakeholder management, analytics, entrepreneurship and AI/automation as transferable evidence. Prefer ownership, English-speaking international teams, people contact, visible impact and progression. Reject junior/repetitive work, narrow IAM administration, pure compliance/audit, hard domain-experience gaps and mandatory professional Dutch/French."
  },
  creative: {
    label: "Creative",
    geography: "Antwerp province first, especially Kapellen/Brasschaat/Schoten/Ekeren/Antwerp; Brussels and wider Belgium only for an unusually strong premium/lifestyle/creative fit.",
    focus: "Niche, tasteful, high-character work with visible lifestyle appeal and real transferable fit. Keep interior design, renovation, painting/decorating, finishing, flooring, microcement/plastering, cabinetry/joinery/carpentry, furniture/workshop/atelier, premium fit-out and showroom/project operations. Add an 'old-money / modern gentleman / discreet luxury' layer: private members' clubs, boutique hotels, heritage hospitality, yacht/superyacht and marine businesses, classic/performance cars and premium automotive, watches/jewellery, tailoring/menswear, wine/spirits and fine-food houses, golf/equestrian/leisure clubs, private aviation, concierge/lifestyle services, estates/property management, auction/art/design houses, premium events, luxury travel and family-owned heritage brands. Prioritise Business/Operations Manager, Project/Experience Operations, Client Relations, Partnerships, Membership/Club Operations, Estate/Property Operations, Showroom/Commercial Operations, Events/Guest Experience, Founder/Owner Office, workshop/project coordination and technical-commercial roles where the candidate can realistically contribute. The target is not generic luxury retail or low-skill service work; look for distinctive, socially polished, international environments with ownership, discretion, customer contact, craft/design proximity and a strong lifestyle identity. Use interior/renovation experience, entrepreneurship, customer operations, project/stakeholder management and technology/automation where relevant. Reject junior retail-floor jobs, generic hospitality shifts, pure commission sales, craft roles requiring qualifications the candidate lacks and mandatory professional Dutch/French."
  },
  dogs: {
    label: "Dogs",
    geography: "Kapellen and Antwerp region first: Kapellen, Brasschaat, Kalmthout, Stabroek, Schoten, Ekeren, Antwerp and nearby northern Antwerp. Widen to Brussels, Ghent or wider Belgium only for an unusually strong English-speaking pet-sector role or attractive hybrid position.",
    focus: "Dedicated dogs and animal-sector mode built around the candidate's real Hondinn boutique dog-hotel experience. Search dog hotels, daycare/boarding businesses, premium pet services, pet-tech, pet food and products, animal-health/veterinary groups, pet insurance, pet retail headquarters, distributors and other dog/pet-focused companies. Prioritise roles with meaningful transferable fit: Operations Manager or Coordinator, Customer/Client Operations, Customer Success, Account Management, Partnerships, Business Development, Project/Programme Operations, Service Operations, Business Manager, Implementation, Product/Commercial Operations and other ownership-heavy roles. Hondinn provides direct evidence of dog-care operations, customer communication, scheduling/capacity planning, pricing, service quality, practical problem-solving and entrepreneurship. Combine that with the candidate's banking/operations, stakeholder-management, analytics and technology/automation background where useful. English must be sufficient; Dutch may be optional/preferred but not mandatory. Prefer dynamic roles with responsibility, people/customer contact and growth. Reject generic low-skill kennel/animal-care labour, veterinary-clinician roles, grooming roles requiring specialist qualifications, junior retail-floor jobs and vacancies requiring mandatory professional Dutch/French."
  },
  kapellen: {
    label: "Kapellen",
    geography: "STRICT LOCAL ONLY: Kapellen, Brasschaat, Kalmthout, Stabroek, Schoten, Ekeren and Hoevenen. Do not return central Antwerp, Merksem, Brussels, Ghent, Leuven, Mechelen or any role whose actual workplace is outside this northern-Antwerp area. Hybrid is acceptable only when the listed base/workplace itself is in this area.",
    focus: "LOCAL PREMIUM ARTISAN / ATELIER MODE. This category should feel materially different from Corporate. Search the local affluent northern-Antwerp market for niche, productive, hands-on and craft-adjacent work where the candidate can combine USTO/interior-finishing experience, entrepreneurship, project/operations discipline and client handling. Strong targets include bespoke interiors, cabinetry/joinery, custom furniture, interior finishing, decorative painting and premium surfaces, restoration, workshop/atelier operations, premium renovation/property services, kitchen/interior studios, yacht or marine interiors, classic/performance-car restoration/detailing/workshop operations, specialist automotive, artisan manufacturing, premium home services, design-build firms, family-owned ateliers, owner-led SMEs, boutique family offices/estate operations and discreet businesses serving high-income clients in Kapellen/Brasschaat/Kalmthout. Prioritise Workshop/Operations Manager, Project Coordinator/Manager, Production or Planning Coordinator, Client/Project Advisor, Showroom/Commercial Operations, Owner/Founder right-hand, Business Manager, Estate/Property Operations and hands-on project roles where a formal master-craft qualification is NOT a hard requirement. Search actual local employers and ateliers, not only large job boards. English must genuinely be sufficient; Dutch may be optional/preferred but not mandatory. Reject generic retail, low-skill hospitality, repetitive administration, narrow back-office jobs and craft roles requiring a qualification the candidate does not have. If the market is thin, keep the strongest recent verified local roles visible rather than padding with unrelated corporate vacancies."
  },
  corporate: {
    label: "Corporate",
    geography: "Antwerp and Brussels first; then Ghent, Leuven and wider Belgium for strong banking roles.",
    focus: "Banking-sector focused roles that make strong use of the candidate's 12+ years across banking, internal audit, fraud, internal control, IAM/access operations, IT risk/security and fintech. Search banks and banking groups intensively before adjacent sectors: Belgian banks, international banks with Belgian offices, digital banks, private banks, investment banks, custody/securities institutions and bank-owned technology or transformation teams. Prioritise senior operations, business management, transformation, programme/project leadership, investment/product operations, payments, financial-crime technology, security governance, controls, risk-tech and strategic operations. Prefer roles with management exposure, cross-functional ownership and compensation/career progression. Avoid junior roles, narrow back-office IAM work and positions fundamentally dependent on mandatory Dutch/French."
  },
  familyoffice: {
    label: "Family O.",
    geography: "Belgium first, especially Antwerp and Brussels; Ghent and wider Belgium for unusually strong fit. English-speaking or genuinely international environments are preferred.",
    focus: "Family offices, multi-family offices, family-owned investment holdings, entrepreneurial family groups, private investment offices, family capital/wealth-management boutiques, owner/founder offices and small management teams around wealthy families or family-controlled companies. Prioritise roles where the candidate can show breadth and ownership rather than requiring an established private-banking sales book: Business/Operations Manager, Family Office Operations, Fund/Investment Operations, Portfolio/Reporting Operations, Chief of Staff, Executive/Owner Office, Strategic Projects, Governance, Risk/Control, Technology/Transformation, Client/Family Coordination, Partnerships and right-hand roles. Also search family-owned operating companies where the family/owners remain close to management and a broad operator can have visible impact. Use banking/fintech, controls/audit, stakeholder management, numbers/reporting, technology, entrepreneurship and international experience as strengths. Avoid pure tax/legal estate-planning roles, private-banker roles requiring an existing HNW client book, specialist portfolio-manager roles without transferable fit, and mandatory professional Dutch/French."
  },
  startup: {
    label: "Startup",
    geography: "Belgium only, with Antwerp first, then Brussels and Ghent; include Leuven/Mechelen only for unusually strong fit. Hybrid Belgium-based roles are welcome.",
    focus: "High-potential modern-technology startups and scale-ups with real growth signals, differentiated technology or a strong digital product. Prioritise companies in AI, fintech/payments, cybersecurity, SaaS, data/infrastructure, robotics, climate/energy tech, space/deep-tech, mobility, biotech/health-tech and other future-facing sectors. Search roles where the candidate can genuinely compete: Business Operations, Strategy & Operations, Operations Manager, Chief of Staff, Business Manager, Customer Success/Client Operations, Implementation, Partnerships, Product Operations, Programme/Project Operations, Commercial Operations, Transformation and founder/executive right-hand roles. Prefer English-speaking international teams, visible ownership, direct founder/leadership exposure, meaningful responsibility, fast learning and credible career/equity upside. Use the candidate's banking/fintech, operations, stakeholder management, controls/security, analytics, entrepreneurship and hands-on AI/web-app building as strengths. Reject pre-revenue hobby projects with no hiring substance, junior roles, pure coding/research roles with major gaps, generic sales-only roles and mandatory professional Dutch/French."
  },
  investment: {
    label: "Investment",
    geography: "Belgium first, prioritising Antwerp and Brussels; then Ghent/Leuven/Mechelen for strong English-speaking fit. Hybrid roles are welcome. Exceptional Luxembourg/nearby EU opportunities only when the match is unusually strong and realistic.",
    focus: "Investment and markets roles that combine business judgement, analytics, banking knowledge and technology without demanding a long established front-office investment track record. Search investment/product operations, wealth-management operations/strategy, investment product specialist or product management, portfolio/reporting analytics, investment data/market-data roles, research operations, market intelligence, economic/market analysis, investment solutions, securities/custody/product roles, investment technology/fintech, client investment operations and selected Equity Research/Investment Research Associate or Economist/Research Analyst roles where adjacent banking/analytics experience is accepted. The candidate follows financial markets and macroeconomics, builds UlasTrade for fundamental/technical investment research, has strong banking/control/operations/data experience and an MSc IT background, but does NOT have years of professional portfolio-management, equity-research or private-banking advisory experience. Prefer roles where analytical ability, structured thinking, product/process knowledge, data/technology and stakeholder skills matter. Reject Portfolio Manager, Senior Equity Analyst, Senior Economist, Investment Director, relationship/private-banker roles requiring an existing HNW book, CFA-mandatory roles, and vacancies requiring 5+ years specifically in professional equity research, asset management, portfolio management, M&A/IB execution or investment advisory unless the requirement explicitly accepts broad banking/operations experience."
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
    geography: "Belgium first, especially Brussels and internationally connected institutions. Other EU member states only for unusually strong English-speaking roles with clear EU-citizen eligibility and substantially higher institutional prestige or career leverage.",
    focus: "STRICT PRESTIGE MODE. Return only roles whose employer itself carries clear institutional, policy, diplomatic, defence/security, international-organisational or elite public-affairs reputation AND where the role can materially improve the candidate's network, credibility, influence or future options. Prioritise EU institutions/agencies, NATO and NATO bodies, European Defence Agency, EEAS, European Commission/Parliament/Council ecosystems, central banks and financial-policy bodies, major international organisations, embassies/permanent representations, respected defence/security institutions, top-tier policy institutes/think tanks, major banking/financial federations and genuinely influential trade/public-affairs organisations. Roles should involve programme/project management, operations/business management, policy implementation, institutional/stakeholder relations, strategic partnerships, security governance, financial-services policy/regulatory strategy, transformation or digital/technology programmes. Do not include ordinary private-company roles merely because the company is famous. Do not pad with generic associations or low-impact coordinator/admin roles. Use Belgian/EU citizenship, International Relations, banking/audit/control/IAM/security, operations and stakeholder management as transferable strengths. Candidate is 35: reject age-limited programmes where ineligible. Reject specialist legal/doctoral/military requirements, mandatory pre-existing clearance, or mandatory professional Dutch/French."
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
    if (bytes > 5000000) throw new Error("Request too large.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function readSyncStore() {
  try {
    const raw = await readFile(SYNC_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid sync store.");
    return {
      revision: Number(parsed.revision || 0),
      updatedAt: parsed.updatedAt || null,
      state: parsed.state && typeof parsed.state === "object" ? parsed.state : null
    };
  } catch (error) {
    if (error?.code === "ENOENT") return { revision: 0, updatedAt: null, state: null };
    console.error("U-Job sync read error:", error);
    return { revision: 0, updatedAt: null, state: null };
  }
}

async function writeSyncStore(state, baseRevision) {
  const task = async () => {
    const current = await readSyncStore();
    if (Number.isFinite(Number(baseRevision)) && Number(baseRevision) !== current.revision) {
      return { conflict: true, current };
    }
    const next = {
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
      state
    };
    await mkdir(path.dirname(SYNC_FILE), { recursive: true });
    await writeFile(SYNC_FILE, JSON.stringify(next), "utf8");
    return { conflict: false, current: next };
  };
  const resultPromise = syncWriteQueue.then(task, task);
  syncWriteQueue = resultPromise.then(() => undefined, () => undefined);
  return resultPromise;
}

async function getSyncedState(res) {
  const current = await readSyncStore();
  return sendJson(res, 200, current);
}

async function putSyncedState(req, res) {
  const body = await readJson(req);
  if (!body?.state || typeof body.state !== "object" || Array.isArray(body.state)) {
    return sendJson(res, 400, { error: "A valid U-Job state is required." });
  }
  const result = await writeSyncStore(body.state, body.baseRevision);
  if (result.conflict) {
    return sendJson(res, 409, {
      error: "Sync conflict.",
      revision: result.current.revision,
      updatedAt: result.current.updatedAt,
      state: result.current.state
    });
  }
  return sendJson(res, 200, result.current);
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
    openCheck: String(job?.openCheck || "").trim(),
    matchCheck: String(job?.matchCheck || "").trim(),
    languageCheck: String(job?.languageCheck || "").trim(),
    remoteCheck: String(job?.remoteCheck || "").trim(),
    mobilityCheck: String(job?.mobilityCheck || "").trim(),
    ageCheck: String(job?.ageCheck || "").trim(),
    modeCheck: String(job?.modeCheck || "").trim(),
    score: Math.round(Math.max(0, Math.min(10, Number(job?.score) || 0)) * 10) / 10,
    whyFit: Array.isArray(job?.whyFit)
      ? job.whyFit.slice(0, 3).map(v => String(v).trim()).filter(Boolean)
      : []
  };
}

const MODE_SOURCE_PLANS = {
  "search": [
    "COVERAGE 1 — core realistic moves: Reasonable + Fintech + Startup + Corporate; operations, strategy, business manager, product/customer ops, implementation and transformation.",
    "COVERAGE 2 — money & ownership: Investment + Family O. + High Paid; investment product/operations/data/research, family capital, owner office, strategic and compensation-upside roles.",
    "COVERAGE 3 — future & influence: AI + Prestige; technology/AI adoption and EU/NATO/EDA/international institutional roles.",
    "COVERAGE 4 — location & lifestyle: Kapellen + Creative + Dogs; local northern-Antwerp roles, niche classy/luxury/interior businesses and pet-sector opportunities.",
    "COVERAGE 5 — channels & optionality: LinkedIn + Turkish + Global + SW-MO; recent LinkedIn discovery, Turkey-linked roles and exceptional international options.",
    "Touch every Details theme during discovery, but do not impose final category quotas. Rank all surviving vacancies together and return the overall best twelve.",
    "Use official employer/ATS pages first where practical; specialist recruiters, niche boards, portfolio-company ecosystems, LinkedIn, Welcome to the Jungle, Wellfound, VDAB/Jobat and credible public company/founder posts for hidden-gem discovery."
  ],

  "reasonable": [
    "WAVE 1: fintech/payments/digital-bank/financial-infrastructure employers — Business Operations, Strategy & Operations, Operations Manager, Product/Payments Ops, Implementation, Customer/Client Ops and Partnerships.",
    "WAVE 2: Belgian startups/scale-ups, wealth-tech/investment-tech, AI/business-transformation and technology companies — Business Manager, Chief of Staff, Strategy/Operations, Customer Success, Implementation and Programme/Project Ops.",
    "WAVE 3: banks/financial services excluding ING, investment-product/operations, family-office/business-manager, security-governance/transformation and cross-functional corporate operations where broad banking experience transfers directly.",
    "WAVE 4: Antwerp/Kapellen local employers and strong SMEs with operations/project/client ownership; use VDAB, Jobat, LinkedIn, specialist recruiters and direct employer sites.",
    "WAVE 5 hidden gems: boutique recruiters, portfolio-company pages, founder/company posts and niche sector boards. Re-open the exact vacancy and verify current application status before accepting.",
    "Do not stop after one narrow category. Continue through all waves until at least 5 credible current matches are available, aiming for 5-10."
  ],
  "creative": [
    "WAVE 1 — crafted interiors: premium interior studios, renovation/fit-out firms, cabinetry/joinery, furniture ateliers, kitchens, lighting, materials, architectural showrooms and high-end residential project companies around Antwerp.",
    "WAVE 2 — gentleman/lifestyle: private members' clubs, golf/equestrian clubs, heritage/boutique hotels, concierge and luxury-experience companies, estates/property operations, premium event houses and discreet service businesses.",
    "WAVE 3 — objects & mobility: yacht/superyacht/marine firms, classic/performance-car specialists, premium automotive/importers, watches/jewellery, tailoring/menswear, wine/spirits/fine-food houses, private aviation and luxury travel.",
    "WAVE 4 — culture & ownership: auction houses, galleries/design houses, family-owned heritage brands, founder/owner offices and small premium businesses where a broad operator/project/client role can have visible impact.",
    "HIDDEN-GEM DISCOVERY: search boutique recruiter pages, specialist trade/luxury boards, employer newsletters, public LinkedIn/company posts, founder/owner posts and credible public social-media career announcements. A social post is discovery only: the final result must still have a current identifiable vacancy/application page or a direct recruiter vacancy page.",
    "Search role synonyms such as Club Manager/Operations, Membership Operations, Guest Experience, Client Relations, Estate/Property Operations, Experience Manager, Project Coordinator, Showroom Operations, Partnerships, Founder/Owner Office and Business Manager. Do not fill with generic retail/hospitality."
  ],
  "dogs": [
    "WAVE 1: dog hotel/daycare/boarding, premium pet-service and dog-care businesses in Kapellen/Antwerp; search operations, coordination, customer and business roles rather than generic animal-care labour.",
    "WAVE 2: pet food/products, pet-tech, animal-health/veterinary groups, pet insurance, distributors and pet-retail HQ employers in Antwerp/Belgium; prioritise operations, customer success, account management, partnerships, business development and project roles.",
    "WAVE 3: use employer sites plus LinkedIn Jobs, VDAB, Jobat, Indeed and relevant pet/animal-sector job boards or recruiters for discovery; verify the final role on the employer/ATS page where possible.",
    "Only widen beyond Antwerp when the role is unusually strong, English-speaking and clearly leverages Hondinn plus the candidate's operations/business background."
  ],
  "familyoffice": [
    "WAVE 1: direct family-office and multi-family-office career pages in Belgium plus private investment/wealth boutiques; target operations, reporting, governance, fund/investment operations, strategic projects, family/client coordination and business-management roles.",
    "WAVE 2: boutique executive-search and specialist recruiters such as Morgan Philips, Sander and similar private-wealth/family-office recruiters; include confidential/off-market searches when a real vacancy page exists.",
    "WAVE 3: family-owned investment holdings, entrepreneurial family groups and portfolio-company ecosystems; search owner office, investment office, chief of staff, business manager, strategic projects and portfolio operations roles.",
    "WAVE 4: Antwerp/Belgium private banks or investment houses with genuine family-owned/boutique culture only when the role offers broad ownership rather than a mandatory existing client book.",
    "Use official pages and direct recruiter vacancy pages; hidden-gem discovery may include portfolio-company pages, spontaneous-opportunity pages and specialist executive-search listings, but never invent an opening."
  ],
  "startup": [
    "WAVE 1: Antwerp startups/scale-ups with modern technology; search company career pages, Start it @KBC ecosystem/company lists, accelerator/VC portfolio companies and current startup job boards for Business/Strategy/Operations, Chief of Staff, Customer Success, Implementation and Partnerships roles.",
    "WAVE 2: Brussels and Ghent high-growth startups/scale-ups in AI, fintech, SaaS, cyber, data, robotics, climate/energy, mobility, deep-tech and health-tech; favour English-speaking international teams.",
    "WAVE 3: use Wellfound, LinkedIn Jobs, Welcome to the Jungle, Belgian startup/VC ecosystems and specialist recruiters for discovery, then verify the exact role on employer/ATS pages.",
    "Prioritise credible growth signals: active hiring, funded/scale-up stage, real customers/market traction or strong institutional/VC backing. Do not invent funding or growth claims."
  ],
  "kapellen": [
    "WAVE 1: exact-location searches for Kapellen, Brasschaat, Kalmthout, Stabroek, Schoten and Ekeren across operations/project/business/customer roles.",
    "WAVE 2: local employers/SMEs, banks/financial services, fintech/technology, logistics/port-related employers, premium services and renovation/interior firms; include Hoevenen/Mariaburg/Merksem only when clearly local.",
    "WAVE 3: use VDAB, Jobat, LinkedIn Jobs, Indeed and local/specialist recruiters for discovery, then verify employer/ATS. Do not widen to distant cities."
  ],
  "corporate": [
    "Bank/private-bank/international-bank career pages first; senior operations, business management, transformation, investment/product ops, payments, financial-crime technology, security governance and risk-tech."
  ],
  "investment": [
    "WAVE 1: Belgian asset managers, private banks, wealth/investment platforms, securities/custody firms and investment-product teams; target Investment Product, Investment Operations, Portfolio/Reporting Analytics, Investment Data, Product/Proposition and Client Investment Operations.",
    "WAVE 2: research/economics/markets teams at banks, brokers, exchanges, financial-data providers, fintechs, consultancies, federations and institutions; search Market Intelligence, Research Analyst/Associate, Economic Analyst, Investment Research Operations and market-data roles where adjacent banking/analytics experience is accepted.",
    "WAVE 3: investment-tech/wealth-tech/fintech employers where finance knowledge and technology/process skills intersect; include product operations, implementation, solutions, data/reporting and investment-platform roles.",
    "WAVE 4: boutique investment houses, family offices and specialist recruiters for hidden-gem analyst/operations/product roles. Verify exact experience requirements before accepting.",
    "Reject roles requiring 5+ years specifically in equity research, portfolio management, asset management, investment banking/M&A execution or professional investment advisory unless the vacancy explicitly treats broader banking/operations/analytics experience as equivalent. CFA can be preferred but must not be mandatory unless another stated route clearly fits."
  ],
  "fintech": [
    "Fintech/payments/digital-bank/regtech/wealth-tech/financial-infrastructure company career pages and ATS first; then LinkedIn, Welcome to the Jungle, Wellfound and specialist recruiters for discovery; verify official vacancy."
  ],
  "ai": [
    "AI/GenAI employers plus banking/fintech/consulting transformation teams for AI product, operations, transformation, governance, adoption, implementation and customer/partner roles."
  ],
  "prestige": [
    "WAVE 1: NATO/NCIA/NSPA, European Defence Agency, EU Careers/EPSO, Commission, Parliament, Council/EEAS and EU agencies in Belgium.",
    "WAVE 2: civilian defence/security institutions, embassies/diplomatic missions, permanent representations and international organisations.",
    "WAVE 3: NBB/central-bank ecosystem, European financial institutions, banking federations, chambers, trade associations and policy/regulatory bodies.",
    "WAVE 4: respected think tanks, geopolitical/security institutes, public-affairs and policy organisations.",
    "WAVE 5 only if Belgium yields fewer than 6 strong matches: other EU states, English-speaking exceptional institutional roles with clear EU-citizen eligibility."
  ],
  "highpaid": [
    "Senior/executive employer pages and recruiters for manager/lead/head, business management, transformation, strategic operations, fintech/payments, AI, technology/security and high-value client/partnership roles."
  ],
  "turkish": [
    "Belgium roles at Turkey-linked employers or with Turkish clients/suppliers/market exposure; logistics/import-export, fintech/payments, banking, technology, operations, partnerships and account/client roles."
  ],
  "linkedin": [
    "LinkedIn Jobs only for final discovery; cross-check employer/ATS when possible. Posting <=7 days; final link remains the LinkedIn vacancy."
  ],
  "global": [
    "Global employer career pages plus Europe/EMEA-remote sources; explicit Belgium/EU/Europe/EMEA work eligibility mandatory."
  ],
  "swmo": [
    "Swiss/Monaco banks, private banks, fintech/tech, luxury, family-office, international-organisation and specialist recruiter sources; verify English suitability and mobility."
  ]
};

function getModeSourcePlan(mode) {
  return (MODE_SOURCE_PLANS[mode] || []).map(v => "- " + v).join("\n");
}

function buildPrompt(mode, seenUrls, candidatePool = []) {
  const cfg = MODES[mode];
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());

  const seen = seenUrls.slice(-50).map(normalizeUrl).filter(Boolean);
  const pool = candidatePool.slice(0, 48).map(job => ({
        title: String(job?.title || "").trim().slice(0,100),
        company: String(job?.company || "").trim().slice(0,80),
        location: String(job?.location || "").trim().slice(0,70),
        url: normalizeUrl(job?.url),
        publishedDate: String(job?.publishedDate || "").trim().slice(0,10),
        score: Math.round((Number(job?.score)||0)*10)/10,
        sourceMode: String(job?.sourceMode || "").trim().slice(0,24)
      })).filter(job => job.title && job.company && /^https?:\/\//i.test(job.url));
  const poolText = pool.length
    ? pool.map((job,i) => (i+1)+". ["+(job.sourceMode||"detail")+"] "+job.title+" | "+job.company+" | "+job.location+" | "+job.publishedDate+" | prior score "+job.score+" | "+job.url).join("\n")
    : "None.";
  const maxAge = mode === "linkedin" ? 7 : 30;
  const target = mode === "search" ? 14 : mode === "reasonable" ? 10 : mode === "prestige" ? 10 : mode === "creative" ? 8 : mode === "kapellen" ? 8 : 7;
  const finalTarget = mode === "search" ? "6-8" : mode === "reasonable" ? "4-6" : mode === "prestige" ? "4-6" : "3-5";
  const stopAt = mode === "search" ? 8 : (mode === "reasonable" || mode === "prestige") ? 6 : 5;

  const special = mode === "linkedin"
    ? "LINKEDIN: LinkedIn job pages only; <=7 days; final URL must be the LinkedIn vacancy."
    : mode === "global"
      ? "GLOBAL: remote must explicitly allow Belgium/EU/Europe/EMEA; reject US/UK/Swiss-only remote. Prefer elite US/UK/Swiss/global employers and Europe-facing teams. REMOTE_CHECK is mandatory."
      : mode === "swmo"
        ? "SW-MO: Switzerland/Monaco only; English sufficient; reject mandatory German/French/Italian. Belgian/EU citizen: Swiss sponsorship is not required; normal EU/EFTA registration is acceptable. Monaco local-only restrictions still matter. MOBILITY_CHECK is mandatory."
        : mode === "prestige"
          ? "PRESTIGE: Belgium first. Candidate is Belgian/EU citizen and age 35. Belgian/EU-nationality requirements are acceptable. Reject only if an explicit age cap makes age 35 ineligible, or another hard eligibility requirement is not met. AGE_CHECK is mandatory."
          : mode === "kapellen"
            ? "KAPELLEN: use artisan/atelier/local-premium discovery terms: bespoke interior, cabinetry, joinery, furniture, interior finishing, decorative surfaces, restoration, classic car, detailing, workshop, atelier, yacht/marine interior, premium renovation, estate/property, design-build, owner-led SME, family business. Final location must be in the specified local area. English sufficient; Dutch optional/preferred only."
            : mode === "reasonable"
              ? "REASONABLE: fintech first, but this is a realistic-career-match mode rather than a sector purity test. Continue into adjacent startup, investment/product, AI/transformation, corporate operations and local-business waves until a useful result set exists."
            : mode === "fintech"
              ? "FINTECH: employer must genuinely operate in fintech/payments/digital banking/regtech/insurtech/wealth-tech/financial infrastructure."
              : mode === "dogs"
                ? "DOGS: employer/business must genuinely operate in dog/pet/animal services, pet-tech, pet food/products, veterinary/animal health, pet insurance or closely related animal-sector activity. Prioritise Hondinn-relevant operational/commercial roles; reject generic low-skill animal-care jobs."
                : mode === "startup"
                  ? "STARTUP: employer must be a genuine startup/scale-up or modern high-growth technology company with current hiring substance. English must be sufficient."
                  : mode === "investment"
                    ? "INVESTMENT: prioritise bridge roles combining finance/markets with business, analytics, operations or technology. Reject hard requirements for long direct front-office investment experience that the candidate does not have."
                    : mode === "familyoffice"
                    ? "FAMILY O.: employer must genuinely be a family office, multi-family office, family investment/holding structure, owner office, wealth/investment boutique or family-controlled group. Reject roles whose core requirement is tax-law expertise, a pre-existing HNW sales book or specialist discretionary portfolio management."
                    : mode === "search"
                    ? "SEARCH: this is the master ranking across every U-Job theme. Re-check the prior candidate pool first, then search all Details themes until 12 strong verified roles are available. Do not stop early merely because one category produced only a few roles."
                    : "";

  return `Find CURRENT vacancies using live web search.
TODAY: ${today}
MODE: ${cfg.label}
${CANDIDATE}
TARGET: ${cfg.focus}
GEOGRAPHY: ${cfg.geography}
${special}

SEARCH PLAN
- COST DISCIPLINE: discover at most about ${target} serious candidates and stop as soon as ${stopAt} strong verified roles are found. Do not keep browsing once enough qualified roles exist. Return the best ${finalTarget}.
- Use a maximum of 3 focused discovery waves for this mode. Start with one broad query, then only targeted verification of promising vacancies. Avoid equivalent/repeated queries and never re-search the same domain without a specific reason.
- Prefer official employer/institution and direct ATS pages. Use job boards/recruiters mainly for discovery, then verify the final vacancy directly whenever possible.
- Hidden-gem layer: also inspect niche sector boards, boutique/executive recruiters, VC/PE or holding portfolio-company career pages, chambers/associations, accelerator ecosystems, local employer career pages and credible spontaneous-opportunity pages when relevant to the selected mode.
- Also use credible public employer/founder LinkedIn posts, public company social posts/newsletters and community pages as discovery signals for niche roles. Never return a social post by itself unless it contains a clear current application path and the vacancy can be independently verified.
- GLOBAL EMPLOYER EXCLUSION: never return ING, ING Bank, ING Belgium or any ING Group vacancy in ANY mode. The candidate's ING experience may be used as evidence of fit, but ING is not an eligible target employer.
- Search role synonyms and employer ecosystems, not only exact job titles. Example: Business Operations may appear as Business Manager, Strategic Projects, Portfolio Operations, Founder/Owner Office, Programme Operations or Chief of Staff.
- Broad aggregators are gap-fillers, not the primary evidence source. Final results should favour direct employer/ATS or identifiable recruiter vacancy pages.
- Drop obvious location/language/seniority/skill mismatches early instead of spending web calls on them.
- If fewer than 3 valid roles remain, complete the relevant waves before returning. Reasonable/Prestige may continue until 10 strong verified roles.
- Freshness: prefer <=7 days, then <=14, then <=30; absolutely reject anything older than ${maxAge} days. LinkedIn never exceeds 7 days.
- Verify EACH final role by RE-OPENING the exact vacancy in this run: exact YYYY-MM-DD publication date, role still visibly open, a live application path/button or explicit current application instruction, English sufficient, no mandatory extra language, real profile fit.
- Reject stale/closed/expired/cached-only/search-index-only listings, generic careers pages, guessed dates, missing application paths, major must-have gaps, junior/repetitive roles and irrelevant matches.
- Prefer unseen roles. Seen URLs may be reused only if still live and needed for a strong result set.
- Fit score 0-10. Minimum: ${mode === "global" ? "7.5" : mode === "swmo" ? "7.2" : mode === "search" ? "6.2" : mode === "reasonable" ? "6.0" : "6.5"}.
- HARD-MATCH RULE for every mode: read the must-have experience requirements, not only the title. If the vacancy requires multiple years of specific domain experience the candidate clearly does not possess, REJECT it even if the employer/sector is attractive. Transferable banking/operations/analytics experience counts only when the vacancy wording reasonably allows adjacent/relevant experience.
- For accepted roles output MATCH_CHECK: NO_HARD_GAP | short explanation of why the mandatory experience requirements are realistically met or transferable.
- Prestige mode: candidate is Belgian/EU citizen and age 35. Check explicit age, nationality, clearance and status requirements. Do not reject Belgian/EU nationality requirements. Reject age-capped programmes if 35 is outside the allowed range. Output AGE_CHECK with the eligibility conclusion.
- Creative mode: hands-on trade roles are acceptable only with credible transferable experience; reject mandatory craft licences/certificates or deep specialist experience the candidate lacks.
- Dogs mode: Hondinn is relevant operating experience. Require a genuine pet/animal-sector employer and favour operations/customer/commercial/project roles that use that experience; do not fill with generic kennel attendants, groomers or veterinary-clinician roles.
- Startup mode: require a genuine modern-technology startup/scale-up with credible hiring substance; favour roles with ownership and leadership exposure. Do not invent funding, runway, valuation or growth claims.
- Family O. mode: favour broad operator/right-hand/investment-operations/governance roles where banking, controls, reporting, stakeholder and entrepreneurial experience transfer directly. Reject pure estate-tax-law, client-book-dependent private banking and specialist portfolio-management roles.
- Investment mode: favour bridge roles in investment product/operations/data/research/economics/wealth-tech. Reject senior/specialist roles whose must-haves depend on years of direct professional investing, portfolio management, equity research, investment banking/M&A or a HNW client book.
- Search mode: cover every Details theme during discovery, enforce the same hard-match rule, then rank all categories on one common score and return the overall top twelve. Diversity is desirable only among genuinely strong matches; never add a weaker role just to represent a category.
- Search completion rule: DO NOT voluntarily stop at 2, 3, 5 or 8 results. Re-check the prior candidate pool and continue through all coverage waves until 12 eligible roles are found. Return fewer than 12 only if the full candidate pool and all search waves have genuinely been exhausted after current-page verification.
- Detail-mode completion rule: for every non-Search mode, aim for at least 3 strong verified roles and preferably 5. If fewer than 3 survive, re-check the related prior candidate pool and broaden role-title synonyms/sources within the SAME mode before returning. Do not stop after the first weak/empty query wave.
- Reasonable completion rule: do not return NO_VERIFIED_JOBS after only a fintech pass. Re-check the related prior candidate pool and continue through startup, investment/product, AI/transformation, corporate-operations and Antwerp/Kapellen waves. Aim for at least 5 current credible roles.
- Fintech mode: employer must genuinely operate in fintech/payments/digital banking/regtech/insurtech/wealth-tech/financial infrastructure; ordinary banks qualify only for a clearly fintech/technology venture or product unit.
- WHY_FIT lines must be short and specific: profile fit; work/scope appeal; career/compensation leverage. Never invent salary.

FOCUSED SOURCE PLAN
${getModeSourcePlan(mode)}

PRIOR CANDIDATE POOL TO RE-VERIFY
${poolText}
${pool.length ? "These prior candidates came from related U-Job modes. They are NOT automatically valid today. Re-open them now. Keep only those that satisfy this mode, freshness, open/application, English and hard-match rules. They are candidates to reuse, not URLs to avoid." : "No prior candidates available; rely on fresh web discovery."}

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
OPEN_CHECK: CURRENTLY_OPEN ${today} | exact vacancy page re-opened; application path verified
MATCH_CHECK: NO_HARD_GAP | mandatory experience realistically matched: ...
LANGUAGE_CHECK: English sufficient; no other language mandatory.
AGE_CHECK: ${mode === "prestige" ? "Eligible at age 35; explicit age rule checked: ..." : "N/A"}
REMOTE_CHECK: ${mode === "global" ? "Belgium/Europe/EMEA eligibility verified: ..." : "N/A"}
MOBILITY_CHECK: ${mode === "swmo" ? "Belgian/EU-citizen eligibility: ..." : "N/A"}
MODE_CHECK: ${mode.toUpperCase()}_MATCH | explain in one short sentence why this vacancy belongs specifically in this selected Details category
SCORE: 8.7
WHY_FIT_1: ...
WHY_FIT_2: ...
WHY_FIT_3: ...

For Search return up to 12 verified roles. For Reasonable and Prestige return up to 10. For every other mode return up to 5. If fewer than 3 roles survive only after fully checking the relevant sources, return those valid roles. If none survive: NO_VERIFIED_JOBS.`;
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

    if (!/^(YES|OPEN|CURRENT|TRUE)$/i.test(String(fields.VERIFIED_OPEN || "").trim())) continue;

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
      openCheck: fields.OPEN_CHECK || "",
      matchCheck: fields.MATCH_CHECK || "",
      languageCheck: fields.LANGUAGE_CHECK || "",
      ageCheck: fields.AGE_CHECK || "",
      remoteCheck: fields.REMOTE_CHECK || "",
      mobilityCheck: fields.MOBILITY_CHECK || "",
      modeCheck: fields.MODE_CHECK || "",
      score: Number.isFinite(score) ? score : 0,
      whyFit
    });
  }

  return { jobs };
}

function buildStrictPrompt(prompt, mode) {
  return `${prompt}

FINAL CHECK BEFORE OUTPUT
- Re-open/check each final vacancy or ATS/recruiter page in this same run. Do not rely on search snippets, cached pages or old indexed copies.
- Exact date + currently accepting applications + direct vacancy URL + visible application path are mandatory. OPEN_CHECK must explicitly confirm the page was re-opened today.
- MATCH_CHECK is mandatory: output NO_HARD_GAP only after checking the vacancy must-haves against the candidate.
- MODE_CHECK is mandatory. It must start with the exact token for the selected mode (for example KAPELLEN_MATCH or PRESTIGE_MATCH). Reject a role if it merely fits another Details category better. Reject roles with a hard specific-experience gap.
- ING / ING Bank / ING Belgium / ING Group vacancies are forbidden in every mode.
- English must be sufficient; mandatory Dutch/French rejects the role. SW-MO also rejects mandatory German/Italian.
- LinkedIn: <=7 days and LinkedIn job URL.
- Global: <=30 days and explicit Belgium/EU/Europe/EMEA remote eligibility.
- SW-MO: <=30 days and realistic Belgian/EU-citizen mobility.
- PRESTIGE: employer and role must both pass a genuine prestige test: institutional reputation + meaningful responsibility + future career leverage. Ordinary private-company jobs, generic associations and low-impact admin/coordinator roles do not qualify. Candidate is Belgian/EU citizen, age 35; check explicit age/nationality/clearance/status rules.
- KAPELLEN: final listed workplace must be Kapellen, Brasschaat, Kalmthout, Stabroek, Schoten, Ekeren or Hoevenen. No central Antwerp/Brussels fallback. Prioritise bespoke interiors, cabinetry/joinery, furniture, interior finishing, decorative surfaces, restoration, ateliers/workshops, classic/performance cars, detailing/restoration, marine/yacht interiors, premium renovation/property services, family businesses and owner-led SMEs. Prefer productive craft-adjacent roles over screen-heavy corporate work.
- CREATIVE: seek distinctive premium/lifestyle/heritage environments (clubs, yachts, classic/performance cars, tailoring, watches, estates, private aviation, boutique hospitality, wine/spirits, design/interiors). Reject generic retail/hospitality filler and hands-on trade jobs requiring qualifications the candidate lacks.
- DOGS: final employer must be genuinely dog/pet/animal-sector related; English sufficient; reject mandatory professional Dutch/French and low-skill animal-care filler roles.
- ${(mode === "search" || mode === "reasonable" || mode === "prestige") ? (mode === "search" ? "Search: cover all Details themes, rank them together and return up to 12 excellent roles." : mode === "prestige" ? "Prestige: aim for 6-10 excellent institutional roles, maximum 10." : "Reasonable: search all fallback waves and aim for 5-10 credible roles, maximum 10; do not stop after a narrow fintech pass.") : "Aim for 3-5 excellent roles, maximum 5."} Never pad with weak/stale roles.
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

  const maxAgeDays = mode === "linkedin" ? 7 : 30;
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

function isKapellenArea(job) {
  const location = String(job?.location || "");
  return /\b(kapellen|brasschaat|kalmthout|stabroek|schoten|ekeren|hoevenen|mariaburg|merksem|antwerp[- ]north|antwerpen[- ]noord)\b/i.test(location);
}

function isBlockedTargetEmployer(job) {
  const company = String(job?.company || "").trim();
  return /^(?:ING|ING Bank|ING Belgium|ING Group)(?:\b|\s|[-–—])/i.test(company) || /\bING\s+(?:Bank|Belgium|Group)\b/i.test(company);
}

function hasCurrentOpenCheck(job) {
  const check = String(job?.openCheck || "").trim();
  if (!check) return false;
  const positiveOpen = /\b(currently[_ -]?open|open|active|accepting applications|live vacancy)\b/i.test(check);
  const application = /\b(application|apply|application path|application instruction|apply button|apply now)\b/i.test(check);
  const blocked = /\b(closed|expired|no longer available|position filled|archived|applications closed)\b/i.test(check);
  return positiveOpen && application && !blocked;
}

function hasNoHardExperienceGap(job) {
  const check = String(job?.matchCheck || "").trim();
  if (!check) return false;
  const positive = /\b(NO_HARD_GAP|no hard gap|no material gap|requirements realistically matched|transferable fit|mandatory experience matched)\b/i.test(check);
  const blocked = /\b(hard gap|not met|does not meet|missing required|insufficient direct|lacks required|mandatory experience missing)\b/i.test(check);
  return positive && !blocked;
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
    .filter(job => !isBlockedTargetEmployer(job))
    .filter(job => hasCurrentOpenCheck(job))
    .filter(job => hasNoHardExperienceGap(job))
    .filter(job => isAllowedPublishedDate(job.publishedDate, mode))
    .filter(job => job.score >= (mode === "global" ? 7.5 : mode === "swmo" ? 7.2 : mode === "search" ? 6.2 : mode === "reasonable" ? 6.0 : 6.5))
    .filter(job => mode !== "linkedin" || isLinkedInJobUrl(job.url))
    .filter(job => mode !== "global" || hasVerifiedEuropeRemote(job))
    .filter(job => mode !== "swmo" || hasRealisticSwmoMobility(job))
    .filter(job => mode !== "kapellen" || isKapellenArea(job))
    .filter(job => {
      if (!mode || mode === "search") return true;
      const expected = mode.toUpperCase().replace(/[^A-Z0-9]+/g,"_")+"_MATCH";
      return String(job.modeCheck||"").toUpperCase().startsWith(expected);
    })
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
      const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
      const key = norm(job.company)+"|"+norm(job.title);
      if (duplicates.has(key)) return false;
      duplicates.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, mode === "search" ? 12 : (mode === "reasonable" || mode === "prestige") ? 10 : 5);
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
  return `Write a concise one-page Motivation Statements document for this exact vacancy.

VACANCY TO RESEARCH
Role: ${job.title}
Company: ${job.company}
Location: ${job.location || ""}
Research URL: ${job.url}

${MS_PROFILE}

USER NOTE - PRIORITY INSTRUCTION
${safeNote || "No extra note."}

USER NOTE RULE
The user may write this note in Turkish or English. Understand its intent and actively use it when factually supported. If the user asks to emphasise, omit or mention a topic, follow that instruction unless it would invent experience or contradict the vacancy.

RESEARCH FIRST
Read the current vacancy and identify its actual responsibilities, must-haves, working style and business context. Use the URL only for research. NEVER print, mention, cite or reproduce the URL, website, source link or citation in the document.

CONTENT
Create one concise intro + exactly 7 points. Write from the candidate's perspective, directly and concretely.
Do NOT structure points as "you need X, I have Y", "the role needs", "you are looking for", or other recruiter-template language.
Start from what I bring, what I have done, why that experience is relevant, and what value I can add in this company.

Across the 7 points, use the most vacancy-relevant combination of:
1. Operational ownership and ability to run/co-ordinate work end-to-end.
2. Analytical confidence with numbers, reporting, controls, data and structured decisions.
3. Technology fluency, fast application/tool learning, AI/automation mindset and MSc IT background.
4. Stakeholder management across business, IT, risk, support teams, senior management and external parties.
5. 12+ years across banking/fintech/audit/control giving disciplined, structured execution and regulated-environment judgement.
6. A role-specific differentiator where relevant: Hondinn entrepreneurship/customer operations; UlasTrade/markets; AI apps; USTO/interior; fraud/control; IAM/security; International Relations; certifications.
7. Local availability: based in Kapellen, already established and working in Belgium, Belgian/EU citizen, no visa sponsorship required.

POINT-TO-POINT MATCH
Each point must connect a real candidate capability to a real part of the vacancy. Prefer statements such as:
- "I have managed..."
- "I bring..."
- "My experience in ... gives me..."
- "I can contribute by..."
- "I would be able to..."
- "This background fits the role because..."
Do not copy these mechanically; vary the language naturally.

STYLE
- First-person natural English. Direct, mature, specific and human.
- Avoid generic HR phrases, inflated enthusiasm and empty adjectives.
- Point titles must be short capability/value labels, e.g. "Operational ownership", "Analytical judgement", "Technology fluency", not employer-needs phrasing.
- Mention the company/role only where it improves specificity.
- Never show a URL, domain, hyperlink, citation, source marker or job-board name.
- No invented achievements, percentages, team sizes, software, languages or responsibilities.
- Intro <=45 words. Each point 28-42 words: substantial enough to fill the page, but concise.
- No Dear/Sincerely/contact details/closing paragraph.
- Always include local availability/no sponsorship in one of the seven points.

OUTPUT EXACTLY:
INTRO: ...

---POINT---
NUMBER: 1
TITLE: ...
TEXT: ...

Repeat through NUMBER: 7. Plain text only. No links, citations or markdown.`;
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
  const navy = [0.08,0.18,0.31];
  const ink = [0.12,0.14,0.17];
  const muted = [0.34,0.37,0.42];

  const rgb = c => c.join(" ");
  const text = (value, x, y, size=9, bold=false, color=ink) => {
    commands.push(`BT /F${bold ? 2 : 1} ${size.toFixed(1)} Tf ${rgb(color)} rg 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${pdfEscape(value)}) Tj ET`);
  };
  const rule = (x1,y1,x2,y2,color=navy,width=0.8) => {
    commands.push(`${rgb(color)} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  };
  const estimateWidth = (value,size,bold=false) => pdfSafeText(value).split("").reduce((sum,ch)=>{
    if(ch===" ") return sum + size*0.25;
    if(/[MW@#%]/.test(ch)) return sum + size*0.72;
    if(/[ilI1.,:;'|]/.test(ch)) return sum + size*0.25;
    if(/[A-Z0-9]/.test(ch)) return sum + size*(bold?0.57:0.54);
    return sum + size*(bold?0.53:0.50);
  },0);
  const rightText = (value,right,y,size=9,bold=false,color=muted) => {
    text(value,right-estimateWidth(value,size,bold),y,size,bold,color);
  };
  const paragraph = (value,x,y,size,maxWidth,lead,maxLines=4) => {
    const chars=Math.max(82,Math.floor(maxWidth/(size*0.47)));
    const lines=wrapPdfText(value,chars).slice(0,maxLines);
    lines.forEach((line,i)=>text(line,x,y-i*lead,size,false,ink));
    return y-lines.length*lead;
  };

  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone:"Europe/Brussels", day:"2-digit", month:"short", year:"numeric"
  }).format(new Date());

  let y = 775;
  text("Ulas Atilgan",46,y,11.0,true,navy);
  rightText(date,549,y,9.0,false,muted);
  y -= 18;
  text(job.title || "Application",46,y,9.4,false,muted); y -= 13;
  if(job.company){text(job.company,46,y,9.4,false,muted); y -= 23;}

  rule(46,y+9,549,y+9,navy,1.15);
  text("Motivation Statements",46,y-9,17.2,true,navy); y -= 35;

  y=paragraph(ms.intro,46,y,9.15,503,12.4,4)-10;

  const bodySize=9.0, bodyLead=11.5;
  for(let i=0;i<7;i++){
    const p=ms.points[i];
    text(String(i+1),46,y,9.8,true,navy);
    text(p.title,66,y,9.7,true,ink);
    y-=14.5;
    y=paragraph(p.text,58,y,bodySize,491,bodyLead,4);
    if(i<6){
      y-=7.5;
      rule(58,y+2,549,y+2,[0.78,0.82,0.87],0.45);
      y-=10.5;
    }
  }

  if(y<42) throw new Error("Generated motivation statement is too long for the one-page format.");

  const stream=commands.join("\n");
  const objects=[
    null,
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W.toFixed(2)} ${H.toFixed(2)}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(stream,"latin1")} >>\nstream\n${stream}\nendstream`
  ];

  let pdf="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets=[0];
  for(let i=1;i<objects.length;i++){
    offsets[i]=Buffer.byteLength(pdf,"latin1");
    pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref=Buffer.byteLength(pdf,"latin1");
  pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for(let i=1;i<objects.length;i++) pdf+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
  pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
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
        input: buildMsPrompt(job, note)
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



const CV_BASE_PROFILE = [
  "Canonical CV facts. Do not add facts beyond these:",
  "- Ulas Atilgan; Kapellen, Belgium; Belgian & Turkish citizen; no EU work sponsorship required.",
  "- Contact: +32 478 66 19 13 | ulascanatilgan@gmail.com | ulascanatilgan.com | linkedin.com/in/ulascntlgn",
  "- Languages: English Professional; Turkish Native; Dutch B1; French A2.",
  "- Certifications: CIA, CISA, CIAM, CFE, CFSA, Capital Markets Level 3.",
  "- Education: M.Sc. Information Technology - Sabanci University (2018); B.Sc. Business Administration - TOBB University (2014); B.Sc. International Relations double major - TOBB University (2015); Exchange Student, International Business - Hogeschool Utrecht (2012).",
  "- Access Operations Manager - ING Belgium | 2020-Present | Brussels. Cross-functional technology/access operations; application onboarding; access governance; technology integration; platform/SSO migrations; stakeholder alignment; dashboards/documentation; remediation/process improvement; international teams in Belgium, Netherlands and Poland.",
  "- Business Manager - Hondinn, own venture / boutique dog hotel | 2023-Present | Kapellen. End-to-end venture operations, compliance, customer experience, planning/bookings, suppliers, marketing, financial follow-up, pricing/service quality and practical automation.",
  "- Corporate Audit Services - ING Belgium | 2019-2020 | Brussels. Assurance/audit workstreams, senior-management findings, recommendations, corrective actions, banking/risk/operations.",
  "- Project & Control Manager - BPN Payment & E-money Institution | 2017-2019 | Istanbul. Strategic projects, business development, licensing/regulatory preparation, C-level communication, banks, regulators, consultants, PwC/KPMG and auditors.",
  "- Football Systems Consultant part-time - Hawk-Eye Innovations (Sony) | 2018-2019 | Turkey. Live match-day technology operations under time pressure.",
  "- Internal Auditor - Akbank / Denizbank | 2014-2017 | Istanbul. Operational, compliance, lending and IT-control reviews; findings, advice, remediation and process improvement.",
  "- Digital initiatives only when relevant: ECL AI-assisted language app; U-Job AI job-research workflow; UlasTrade AI investment research interface.",
  "- Additional only when relevant: USTO Interior Finishing / usto.be; independent market analysis / ulascanatilgan.com."
].join("\n");

function buildCvPrompt(job, note) {
  const safeNote=String(note||"").trim().slice(0,1200);
  return [
    "Create a tailored one-page CV for Ulas Atilgan using the pinned U-Job reference CV as the master source and visual structure.",
    "",
    "VACANCY",
    "Role: "+job.title,
    "Company: "+job.company,
    "Location: "+(job.location||""),
    "Research URL: "+job.url,
    "",
    CV_BASE_PROFILE,
    "",
    "PINNED REFERENCE CV STRUCTURE",
    "- One page only.",
    "- Left sidebar: photo, Contact, Languages, Citizenship, Certifications, Interests, Additional.",
    "- Main column: name + truthful target headline, Profile, Professional Experience, Education.",
    "- Keep the same compact hierarchy and density. Avoid large empty areas.",
    "- The reference headline is Operations & Project Manager. Change it only when a more role-relevant truthful headline is clearly supported.",
    "- Preserve the original photo and factual chronology.",
    "",
    "USER NOTE",
    safeNote||"No extra note.",
    "",
    "TAILORING METHOD",
    "- Read the exact vacancy first.",
    "- Identify its most important responsibilities, domain terms and ATS keywords.",
    "- Reorder and rewrite only the candidate's real facts so the strongest matching evidence appears first.",
    "- Use exact or near-exact vacancy wording only when the candidate's actual experience supports it.",
    "- Do not keyword-stuff and do not copy long phrases from the vacancy.",
    "- Never invent achievements, tools, budgets, team sizes, direct reports, responsibilities, qualifications, languages or sector experience.",
    "- Do not inflate seniority or imply professional investment, AI-engineering, interior-design or other specialist experience that is not present.",
    "- Keep language calm, specific and interview-defensible.",
    "",
    "CONTENT PRIORITY",
    "- ING: cross-department operations, asset/application onboarding, technology integration, platform migration, governance, process improvement, digitalisation, stakeholder coordination.",
    "- Hondinn: own venture; operations, compliance, client experience, bookings/capacity, suppliers, marketing, financial follow-up, pricing/service quality. Keep it when ownership, customer operations, entrepreneurship, SME/startup, service operations or commercial discipline helps; omit only when it clearly weakens a formal specialist application.",
    "- ING Audit: banking operations, credit/operational risk, governance, findings, recommendations, senior stakeholders and remediation.",
    "- BPN: regulated fintech/payment environment, new activities/licensing preparation, business development, C-level communication, banks, regulators, PwC/KPMG and auditors.",
    "- Hawk-Eye: include only when live operations, field technology, sports/event operations or high-pressure execution is relevant.",
    "- USTO/interior finishing: include in Additional when renovation, design, construction, property, creative, premium/lifestyle or hands-on project work is relevant.",
    "- Independent Market Analysis / UlasTrade: include in Additional when markets, investment, analytics, AI/data or technology relevance is useful; never imply professional portfolio-management experience.",
    "- CIAM can be highlighted in wording only when IAM/access/security is relevant.",
    "",
    "OUTPUT EXACTLY:",
    "HEADLINE: ...",
    "PROFILE_1: ...",
    "PROFILE_2: ...",
    "PROFILE_3: ...",
    "ING_1: ...",
    "ING_2: ...",
    "ING_3: ...",
    "HONDINN_INCLUDE: YES",
    "HONDINN_1: ...",
    "HONDINN_2: ...",
    "HONDINN_3: ...",
    "AUDIT_1: ...",
    "AUDIT_2: ...",
    "BPN_1: ...",
    "BPN_2: ...",
    "HAWKEYE_INCLUDE: NO",
    "HAWKEYE_1: ...",
    "INTERNAL_1: ...",
    "INTERESTS: item 1 | item 2 | item 3 | item 4 | item 5 | item 6",
    "ADDITIONAL_1: ...",
    "ADDITIONAL_2: ...",
    "",
    "Use YES/NO exactly. Profile bullets <=22 words. Experience bullets <=20 words. Additional lines <=8 words. Keep enough content to fill the page naturally without crowding it."
  ].join("\n");
}

function parseCvOutput(text) {
  const fields={};
  for(const raw of String(text||"").split("\n")){
    const line=raw.trim(),i=line.indexOf(":");
    if(i<=0)continue;
    fields[line.slice(0,i).trim().toUpperCase()]=cleanGeneratedText(line.slice(i+1).trim());
  }
  if(!fields.HEADLINE||!fields.PROFILE_1||!fields.ING_1)throw new Error("Could not create a valid tailored CV.");
  const yes=k=>String(fields[k]||"").toUpperCase()==="YES";
  return {
    headline:cleanGeneratedLabel(fields.HEADLINE),
    profile:[fields.PROFILE_1,fields.PROFILE_2,fields.PROFILE_3].map(cleanGeneratedText).filter(Boolean).slice(0,3),
    ing:[fields.ING_1,fields.ING_2,fields.ING_3].map(cleanGeneratedText).filter(Boolean).slice(0,3),
    hondinnInclude:yes("HONDINN_INCLUDE"),
    hondinn:[fields.HONDINN_1,fields.HONDINN_2,fields.HONDINN_3].map(cleanGeneratedText).filter(Boolean).slice(0,3),
    audit:[fields.AUDIT_1,fields.AUDIT_2].map(cleanGeneratedText).filter(Boolean).slice(0,2),
    bpn:[fields.BPN_1,fields.BPN_2].map(cleanGeneratedText).filter(Boolean).slice(0,2),
    hawkeyeInclude:yes("HAWKEYE_INCLUDE"),
    hawkeye:cleanGeneratedText(fields.HAWKEYE_1||""),
    internal:cleanGeneratedText(fields.INTERNAL_1||""),
    interests:String(fields.INTERESTS||"").split("|").map(cleanGeneratedLabel).filter(Boolean).slice(0,8),
    additional:[fields.ADDITIONAL_1,fields.ADDITIONAL_2].map(cleanGeneratedText).filter(Boolean).slice(0,2)
  };
}


let cvPhotoCache=null;
async function loadCvPhoto(){
  if(cvPhotoCache)return cvPhotoCache;
  let b64="";
  try{
    b64=await readFile(path.join(__dirname,"assets","cv_photo_master.txt"),"utf8");
  }catch{
    const parts=[];
    for(let i=1;i<=4;i++)parts.push(await readFile(path.join(__dirname,"assets","cv_photo_"+i+".txt"),"utf8"));
    b64=parts.join("");
  }
  const image=Buffer.from(String(b64).replace(/\s+/g,""),"base64");
  if(image.length<1000||image[0]!==0xFF||image[1]!==0xD8)throw new Error("CV photo asset is invalid.");
  cvPhotoCache=image;
  return image;
}

function buildBinaryPdf(objects){
  const header=Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n","latin1");
  const chunks=[header],offsets=[0];
  let offset=header.length;
  for(let i=1;i<objects.length;i++){
    const pre=Buffer.from(String(i)+" 0 obj\n","latin1");
    const body=Buffer.isBuffer(objects[i])?objects[i]:Buffer.from(String(objects[i]),"latin1");
    const post=Buffer.from("\nendobj\n","latin1");
    offsets[i]=offset;chunks.push(pre,body,post);offset+=pre.length+body.length+post.length;
  }
  const xrefOffset=offset;
  let xref="xref\n0 "+objects.length+"\n0000000000 65535 f \n";
  for(let i=1;i<objects.length;i++)xref+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
  xref+="trailer\n<< /Size "+objects.length+" /Root 1 0 R >>\nstartxref\n"+xrefOffset+"\n%%EOF";
  chunks.push(Buffer.from(xref,"latin1"));
  return Buffer.concat(chunks);
}

function buildTailoredCvPdf(cv,photo){
  const W=595.28,H=841.89,cmds=[];
  const navy=[0.14,0.27,0.43], blue=[0.00,0.39,0.76], ink=[0.10,0.12,0.15], gray=[0.31,0.32,0.34], white=[1,1,1];
  const rgb=c=>c.join(" ");
  const text=(value,x,y,size=8,bold=false,color=ink)=>{
    cmds.push("BT /F"+(bold?2:1)+" "+size.toFixed(1)+" Tf "+rgb(color)+" rg 1 0 0 1 "+x.toFixed(1)+" "+y.toFixed(1)+" Tm ("+pdfEscape(value)+") Tj ET");
  };
  const fill=(x,y,w,h,c)=>cmds.push(rgb(c)+" rg "+x+" "+y+" "+w+" "+h+" re f");
  const line=(x1,y1,x2,y2,c=blue,width=.7)=>cmds.push(rgb(c)+" RG "+width+" w "+x1+" "+y1+" m "+x2+" "+y2+" l S");
  const wrap=(value,chars)=>wrapPdfText(value,chars);
  const bullet=(value,x,y,chars,size=7.25,color=gray,maxLines=3)=>{
    text("•",x,y,size,true,blue);
    const lines=wrap(value,chars).slice(0,maxLines);
    let yy=y;
    for(const ln of lines){text(ln,x+9,yy,size,false,color);yy-=8.8;}
    return yy;
  };
  const section=(label,x,y,w)=>{
    text(label,x,y,8.8,true,navy);
    line(x,y-4,x+w,y-4,blue,.8);
    return y-14.5;
  };
  const sideHeader=(label,y)=>{
    text(label,37,y,8.35,true,white);
    line(37,y-5,157,y-5,[0.38,0.51,0.65],.45);
    return y-16.2;
  };
  const sideLine=(value,y,size=6.75,bold=false)=>{
    text(value,37,y,size,bold,[0.96,0.97,0.99]);
    return y-9.5;
  };
  const role=(title,dateLine,bullets,x,y,maxBullets=3)=>{
    text(title,x,y,8.05,true,ink);
    y-=10.2;
    text(dateLine,x,y,7.0,false,blue);
    y-=9.5;
    for(const b of (bullets||[]).slice(0,maxBullets)){
      y=bullet(b,x+3,y,73,7.0,gray,3);
      y-=.2;
    }
    return y-3.1;
  };

  // Pinned reference layout: dark fixed sidebar + compact main column.
  fill(24,22,151,797,navy);
  cmds.push("q 105 0 0 101.6 50 683 cm /Im1 Do Q");

  let sy=665;
  sy=sideHeader("CONTACT",sy);
  for(const v of ["Kapellen, Belgium","+32 478 66 19 13","ulascanatilgan@gmail.com","ulascanatilgan.com","linkedin.com/in/ulascntlgn"])sy=sideLine(v,sy,6.7);

  sy-=4; sy=sideHeader("LANGUAGES",sy);
  for(const v of ["English - Professional","Turkish - Native","Dutch - B1","French - A2"])sy=sideLine(v,sy);

  sy-=4; sy=sideHeader("CITIZENSHIP",sy);
  sy=sideLine("Belgian & Turkish",sy);
  sy=sideLine("No work sponsorship required (EU)",sy,6.35);

  sy-=4; sy=sideHeader("CERTIFICATIONS",sy);
  for(const v of ["CIA - Certified Internal Auditor","CISA - Information Systems Auditor","CFE - Certified Fraud Examiner","CFSA - Financial Services Auditor","CML 3 - Capital Markets (TR)","CIAM - Identity & Access Management"])sy=sideLine(v,sy,6.15);

  sy-=4; sy=sideHeader("INTERESTS",sy);
  const interests=(cv.interests&&cv.interests.length?cv.interests:["Macroeconomics","Financial markets","Geopolitics","International relations","Football","Padel"]);
  const interestRows=[];
  for(let i=0;i<interests.length;i+=2)interestRows.push(interests.slice(i,i+2).join(" · "));
  for(const v of interestRows.slice(0,4))sy=sideLine(v,sy,6.45);

  const additional=(cv.additional||[]).filter(Boolean);
  if(additional.length){
    sy-=4; sy=sideHeader("ADDITIONAL",sy);
    for(const v of additional.slice(0,2))sy=sideLine(v,sy,6.4,true);
  }

  const x=190,right=562,rw=right-x;
  text("ULAS ATILGAN",x,793,19.0,true,navy);
  text(cv.headline||"Operations & Project Manager",x,772,10.2,false,blue);

  let y=747;
  y=section("PROFILE",x,y,rw);
  for(const p of (cv.profile||[]).slice(0,3)){
    y=bullet(p,x+3,y,77,7.2,gray,2);
    y-=.4;
  }
  y-=2.5;

  y=section("PROFESSIONAL EXPERIENCE",x,y,rw);
  y=role("Access Operations Manager - ING Belgium","2020 - Present | Brussels, Belgium",cv.ing,x,y,3);

  if(cv.hondinnInclude&&cv.hondinn?.length){
    y=role("Business Manager - Hondinn (own venture) | boutique dog hotel","2023 - Present | Kapellen, Belgium",cv.hondinn,x,y,3);
  }

  y=role("Corporate Audit Services - ING Belgium","2019 - 2020 | Brussels, Belgium",cv.audit?.length?cv.audit:[
    "Managed audit projects across banking operations, credit risk, operational risk and governance.",
    "Delivered data-driven recommendations and monitored remediation with senior stakeholders."
  ],x,y,2);

  y=role("Project & Control Manager - BPN Payment & E-money Institution","2017 - 2019 | Istanbul, Turkey",cv.bpn,x,y,2);

  if(cv.hawkeyeInclude&&cv.hawkeye){
    y=role("Football Systems Consultant (part-time) - Hawk-Eye Innovations (Sony)","2018 - 2019 | Turkey",[cv.hawkeye],x,y,1);
  }

  y=role("Internal Auditor - Akbank / Denizbank","2014 - 2017 | Istanbul, Turkey",[cv.internal||"Conducted branch and HQ audits across lending, compliance, operations and IT controls; monitored corrective actions."],x,y,1);

  y-=1;
  y=section("EDUCATION",x,y,rw);
  const edu=[
    ["M.Sc. Information Technology","Sabanci University, Istanbul (2018)"],
    ["B.Sc. Business Administration","TOBB University, Ankara (2014)"],
    ["B.Sc. International Relations (Double Major)","TOBB University, Ankara (2015)"],
    ["Exchange Student, International Business","Hogeschool Utrecht (2012)"]
  ];
  for(const [degree,school] of edu){
    text(degree+" -",x,y,6.8,true,ink);
    const offset=Math.min(190,Math.max(92,degree.length*3.55+9));
    text(school,x+offset,y,6.75,false,gray);
    y-=9.1;
  }

  if(y<26)throw new Error("Tailored CV content is too long for the one-page reference format.");

  const stream=cmds.join("\n");
  const imageObject=Buffer.concat([
    Buffer.from("<< /Type /XObject /Subtype /Image /Width 344 /Height 333 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+photo.length+" >>\nstream\n","latin1"),
    photo,
    Buffer.from("\nendstream","latin1")
  ]);
  const contentObject="<< /Length "+Buffer.byteLength(stream,"latin1")+" >>\nstream\n"+stream+"\nendstream";
  return buildBinaryPdf([
    null,
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+W.toFixed(2)+" "+H.toFixed(2)+"] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 7 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    imageObject,
    contentObject
  ]);
}

function masterCvData(){
  return {
    headline:"Operations & Project Manager",
    profile:[
      "12+ years across banking operations, audit, controls, access governance, technology integration and project delivery.",
      "Bridging business, strategy and technology through coordination, governance and execution.",
      "Entrepreneurial, data-driven mindset with strong interest in financial markets, macroeconomics and international relations."
    ],
    ing:[
      "Coordinate cross-department access operations across core banking technology environments.",
      "Lead asset onboarding, application integration and technology transformation projects with business, IT, risk and support stakeholders.",
      "Drive access governance, process optimisation and digitalisation across new applications, integrations and platform migrations."
    ],
    hondinnInclude:true,
    hondinn:[
      "Built and manage a small-scale dog hotel from concept and property setup to compliance, client experience and daily operations.",
      "Own booking flow, supplier coordination, marketing, financial follow-up and service quality control.",
      "Apply entrepreneurial, data-driven decision-making to improve visibility, operations and commercial discipline."
    ],
    audit:[
      "Managed audit projects across retail banking, credit risk, operational risk and governance.",
      "Delivered data-driven process improvement recommendations to senior stakeholders."
    ],
    bpn:[
      "Managed business development and licensing preparation for new activities in a regulated fintech environment.",
      "Coordinated C-level strategy communication and relationships with consultants and auditors including PwC and KPMG."
    ],
    hawkeyeInclude:true,
    hawkeye:"Supported live match-day football technology systems at top-flight matches under high-pressure operational conditions.",
    internal:"Conducted branch and HQ audits across lending, compliance, operations and IT controls; monitored corrective actions.",
    interests:["Macroeconomics","Financial markets","Geopolitics","International relations","Football","Padel","Design","Travel"],
    additional:["USTO Interior Finishing - usto.be","Independent Market Analysis - ulascanatilgan.com"]
  };
}

async function generateMasterCvFormat(res){
  const photo=await loadCvPhoto();
  const pdf=buildTailoredCvPdf(masterCvData(),photo);
  return sendPdf(res,pdf,"Ulas_Atilgan_UJob_Master_CV_Format.pdf");
}

function safeCvFilename(job){
  const slug=[job.company,job.title].filter(Boolean).join("_").replace(/[^A-Za-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,90);
  return "Ulas_Atilgan_"+(slug||"Tailored")+"_CV.pdf";
}

async function generateTailoredCv(req,res){
  if(!OPENAI_API_KEY)return sendJson(res,503,{error:"OPENAI_API_KEY is not configured in Railway."});
  const body=await readJson(req),rawJob=body?.job||{};
  const job={
    title:cleanGeneratedLabel(String(rawJob.title||"").slice(0,180)),
    company:cleanGeneratedLabel(String(rawJob.company||"").slice(0,140)),
    location:cleanGeneratedLabel(String(rawJob.location||"").slice(0,140)),
    url:normalizeUrl(rawJob.url),
    publishedDate:String(rawJob.publishedDate||"").trim().slice(0,20)
  };
  const note=String(body?.note||"").trim().slice(0,1200);
  if(!job.title||!job.company||!/^https?:\/\//i.test(job.url))return sendJson(res,400,{error:"A valid watched vacancy is required."});
  try{
    const data=await openAIRequest("https://api.openai.com/v1/responses",{
      method:"POST",
      body:JSON.stringify({
        model:OPENAI_MODEL,
        store:false,
        tools:[{type:"web_search",search_context_size:"low"}],
        tool_choice:"required",
        input:buildCvPrompt(job,note)
      })
    });
    const cv=parseCvOutput(extractOutputText(data));
    const photo=await loadCvPhoto();
    return sendPdf(res,buildTailoredCvPdf(cv,photo),safeCvFilename(job));
  }catch(error){
    console.error("U-Job CV generation error:",error);
    return sendJson(res,502,{error:error?.message||"Could not generate tailored CV."});
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
        input: buildAskPrompt(url)
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

  const seenUrls = Array.isArray(body?.seenUrls) ? body.seenUrls.map(String).slice(-30) : [];
  const candidatePool = Array.isArray(body?.candidatePool) ? body.candidatePool.slice(0,16) : [];
  const strictPrompt = buildStrictPrompt(buildPrompt(mode, seenUrls, candidatePool), mode);

  try {
    const data = await openAIRequest("https://api.openai.com/v1/responses", {
      method: "POST",
      body: JSON.stringify({
        model: OPENAI_MODEL,
        store: false,
        max_output_tokens: 2600,
        tools: [{
          type: "web_search",
          search_context_size: "low",
          user_location: {
            type: "approximate",
            country: "BE",
            city: "Antwerp",
            region: "Flanders",
            timezone: "Europe/Brussels"
          }
        }],
        tool_choice: "required",
        input: strictPrompt
      })
    });

    const jobs = finalizeJobsFromResponse(data, mode);
    const webSearchCalls = (data.output || []).filter(item => item?.type === "web_search_call").length;

    return sendJson(res, 200, {
      mode,
      status: "done",
      jobs,
      searchedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      diagnostics: {
        webSearchCalls,
        responseId: data.id || null,
        responseStatus: data.status || "completed",
        outputTextLength: extractOutputText(data).length
      }
    });
  } catch (error) {
    console.error("U-Job direct search error:", error);
    return sendJson(res, 502, { error: error?.message || "Could not complete search." });
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

    if (req.method === "GET" && url.pathname === "/api/sync") {
      return await getSyncedState(res);
    }

    if (req.method === "PUT" && url.pathname === "/api/sync") {
      return await putSyncedState(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/search/start") {
      return await startSearch(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/ask/analyze") {
      return await analyzeAskLink(req, res);
    }

    if (req.method === "GET" && url.pathname === "/api/cv/format") {
      try { return await generateMasterCvFormat(res); }
      catch (error) {
        console.error("U-Job CV format error:", error);
        return sendJson(res, 500, { error: error?.message || "Could not create CV format." });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/cv/generate") {
      return await generateTailoredCv(req, res);
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
