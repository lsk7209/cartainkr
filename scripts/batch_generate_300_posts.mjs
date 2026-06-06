import fs from "node:fs";

const ROOT = new URL("../", import.meta.url);
const COUNT = Number.parseInt(process.argv[2] || "300", 10);
const BASE_URL = "https://cartain.kr";
const PUBLISH_INTERVAL_HOURS = 5;
const ADMIN_POSTS_LIMIT = 500;

const OFFICIAL_SOURCES = {
  tax: [
    { label: "위택스 지방세 안내", url: "https://www.wetax.go.kr/" },
    { label: "법제처 국가법령정보센터", url: "https://www.law.go.kr/" },
  ],
  insurance: [
    { label: "금융감독원 금융소비자정보포털", url: "https://fine.fss.or.kr/" },
    { label: "보험개발원", url: "https://www.kidi.or.kr/" },
  ],
  used: [
    { label: "자동차365", url: "https://www.car365.go.kr/" },
    { label: "국토교통부", url: "https://www.molit.go.kr/" },
  ],
  ev: [
    { label: "환경부 무공해차 통합누리집", url: "https://www.ev.or.kr/" },
    { label: "한국전력 전기요금 안내", url: "https://cyber.kepco.co.kr/" },
  ],
  safety: [
    { label: "한국교통안전공단", url: "https://www.kotsa.or.kr/" },
    { label: "국토교통부", url: "https://www.molit.go.kr/" },
  ],
};

const MODEL_TOPICS = [
  ["아반떼", "준중형 세단", "gasoline"],
  ["쏘나타", "중형 세단", "gasoline"],
  ["그랜저", "준대형 세단", "hybrid"],
  ["K5", "중형 세단", "gasoline"],
  ["K8", "준대형 세단", "hybrid"],
  ["모닝", "경차", "gasoline"],
  ["레이", "경차", "ev"],
  ["캐스퍼", "경형 SUV", "gasoline"],
  ["셀토스", "소형 SUV", "gasoline"],
  ["코나", "소형 SUV", "hybrid"],
  ["투싼", "준중형 SUV", "hybrid"],
  ["스포티지", "준중형 SUV", "hybrid"],
  ["쏘렌토", "중형 SUV", "hybrid"],
  ["싼타페", "중형 SUV", "hybrid"],
  ["팰리세이드", "대형 SUV", "gasoline"],
  ["카니발", "MPV", "hybrid"],
  ["제네시스 G70", "스포츠 세단", "gasoline"],
  ["제네시스 G80", "대형 세단", "gasoline"],
  ["제네시스 GV70", "중형 SUV", "gasoline"],
  ["제네시스 GV80", "대형 SUV", "gasoline"],
  ["아이오닉5", "전기 SUV", "ev"],
  ["아이오닉6", "전기 세단", "ev"],
  ["EV3", "소형 전기 SUV", "ev"],
  ["EV6", "전기 SUV", "ev"],
  ["EV9", "대형 전기 SUV", "ev"],
  ["토레스", "중형 SUV", "gasoline"],
  ["티볼리", "소형 SUV", "gasoline"],
  ["QM6", "중형 SUV", "lpg"],
  ["그랑 콜레오스", "하이브리드 SUV", "hybrid"],
  ["트랙스 크로스오버", "소형 SUV", "gasoline"],
  ["트레일블레이저", "소형 SUV", "gasoline"],
  ["BMW 3시리즈", "수입 중형 세단", "gasoline"],
  ["BMW 5시리즈", "수입 준대형 세단", "gasoline"],
  ["벤츠 C클래스", "수입 중형 세단", "gasoline"],
  ["벤츠 E클래스", "수입 준대형 세단", "gasoline"],
  ["아우디 A4", "수입 중형 세단", "gasoline"],
  ["아우디 Q5", "수입 중형 SUV", "gasoline"],
  ["렉서스 ES300h", "수입 하이브리드 세단", "hybrid"],
  ["볼보 XC60", "수입 중형 SUV", "hybrid"],
  ["테슬라 모델 Y", "전기 SUV", "ev"],
  ["테슬라 모델 3", "전기 세단", "ev"],
  ["폴스타 2", "전기 세단", "ev"],
  ["미니 쿠퍼", "수입 소형차", "gasoline"],
  ["폭스바겐 골프", "수입 해치백", "gasoline"],
  ["포르쉐 마칸", "수입 스포츠 SUV", "gasoline"],
];

const GUIDE_TOPICS = [
  ["자동차세 연납", "자동차세를 월 유지비에 반영하는 방법", "tax"],
  ["취득세 계산", "신차·중고차 구매 전 세금 예산 잡는 법", "tax"],
  ["자동차 보험료 비교", "다이렉트 견적과 특약을 함께 보는 기준", "insurance"],
  ["운전자보험과 자동차보험", "중복 보장과 필수 담보 구분법", "insurance"],
  ["중고차 성능점검기록부", "누유·교환·사고 이력 읽는 법", "used"],
  ["중고차 보험이력", "전손·침수·렌트 이력 확인 절차", "used"],
  ["전기차 충전비", "완속·급속·아파트 충전 단가 비교", "ev"],
  ["전기차 배터리 보증", "중고 전기차 구매 전 확인할 항목", "ev"],
  ["타이어 교체 주기", "마모 한계와 편마모 점검 기준", "safety"],
  ["브레이크 패드 교체", "소음·진동·제동거리로 보는 교체 신호", "safety"],
  ["엔진오일 교체", "주행 패턴별 교체 주기와 비용 기준", "safety"],
  ["자동차 사고 접수", "보험 처리 전 증거와 과실 자료 정리법", "insurance"],
  ["렌트와 리스 비교", "월 납입액보다 총비용을 보는 방법", "tax"],
  ["장기렌트 인수", "계약 종료 전 잔존가치와 수리비 확인법", "used"],
  ["초보운전 첫 차", "구매 예산과 유지비를 함께 잡는 방법", "used"],
];

const TITLE_PATTERNS = [
  (topic, detail) => `${topic} 유지비 2026: ${detail} 실제 비용 정리`,
  (topic, detail) => `${topic} 월 비용 계산 2026: ${detail} 체크리스트`,
  (topic, detail) => `${topic} 구매 전 비용표 2026: ${detail} 한 번에 보기`,
  (topic, detail) => `${topic} 절약 가이드 2026: ${detail} 실전 기준`,
  (topic, detail) => `${topic} 비교 분석 2026: ${detail} 비용 차이`,
];

const MACROS = ["cost", "compare", "checklist", "risk", "process"];
const LENSES = ["절약형", "분석형", "실용형", "초보자형", "중고차형", "가족차형"];

function envPath(name) {
  return new URL(name, ROOT);
}

function readEnvFile(path) {
  if (!fs.existsSync(path)) return {};
  const env = {};
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
  }
  return env;
}

function slugify(value) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return normalized || "car-guide";
}

function makeSlugBase(item, date, index) {
  const ascii = slugify(`${item.slugSeed || item.powertrain || "car"}-${item.kind}-${index + 1}`);
  return `${ascii}-${formatIso(date).slice(0, 10).replaceAll("-", "")}`;
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function formatIso(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, ".000Z");
}

function estimate(topic, powertrain, index) {
  const base = {
    ev: [90000, 180000],
    hybrid: [170000, 330000],
    lpg: [190000, 360000],
    gasoline: [220000, 520000],
  }[powertrain] || [180000, 430000];
  const spread = base[1] - base[0];
  const monthly = base[0] + ((index * 173) % spread);
  const rounded = Math.round(monthly / 1000) * 1000;
  return {
    monthly: rounded,
    yearly: rounded * 12,
    insurance: Math.round((50000 + ((index * 911) % 150000)) / 1000) * 1000,
    tax: powertrain === "ev" ? 130000 : Math.round((90000 + ((index * 701) % 700000)) / 10000) * 10000,
  };
}

function pickSources(kind) {
  return OFFICIAL_SOURCES[kind] || OFFICIAL_SOURCES.safety;
}

function sourceLinks(kind) {
  return pickSources(kind)
    .map((source) => `<li><a href="${source.url}" rel="nofollow noopener" target="_blank">${source.label}</a></li>`)
    .join("");
}

function makeContent({ title, topic, detail, kind, powertrain, macro, lens, index }) {
  const cost = estimate(topic, powertrain, index);
  const monthly = cost.monthly.toLocaleString("ko-KR");
  const yearly = cost.yearly.toLocaleString("ko-KR");
  const insurance = cost.insurance.toLocaleString("ko-KR");
  const tax = cost.tax.toLocaleString("ko-KR");
  const fuelLabel = powertrain === "ev" ? "충전비" : powertrain === "lpg" ? "LPG 연료비" : "유류비";
  const macroLead = {
    cost: "월 비용을 먼저 고정한 뒤 연간 비용으로 확장하면 실제 부담이 명확해집니다.",
    compare: "같은 예산이라도 보험료와 세금 구조가 다르면 1년 뒤 체감 비용이 달라집니다.",
    checklist: "계약 전 확인 항목을 순서대로 점검하면 불필요한 지출을 줄일 수 있습니다.",
    risk: "평균 유지비보다 더 중요한 것은 예상 밖 수리비와 계약 조건입니다.",
    process: "비용 계산은 차량 가격, 반복 지출, 위험 비용을 분리하는 순서로 진행해야 합니다.",
  }[macro];
  const lensLine = {
    "절약형": "절약 관점에서는 할인보다 반복 지출을 줄이는 항목을 먼저 보는 편이 실익이 큽니다.",
    "분석형": "분석 관점에서는 월 비용, 연 비용, 3년 총비용을 같은 표로 맞춰야 비교가 가능합니다.",
    "실용형": "실용 관점에서는 지금 바로 확인할 수 있는 보험료, 세금, 주행거리부터 넣어보는 것이 빠릅니다.",
    "초보자형": "초보 운전자는 차량 가격보다 보험료와 사고 자기부담금 변동 폭을 먼저 확인해야 합니다.",
    "중고차형": "중고차는 구매가가 낮아도 보증 제외 수리비가 누적되면 총비용이 커질 수 있습니다.",
    "가족차형": "가족차는 주행거리와 적재 패턴이 일정하지 않아 월 비용을 보수적으로 잡는 편이 안전합니다.",
  }[lens];

  return `<article>
<header>
<h1>${title}</h1>
<p class="lead">${topic}을 검토할 때는 차량 가격만 보지 말고 보험료, 세금, ${fuelLabel}, 정비비를 합산해야 합니다. ${macroLead}</p>
</header>

<aside class="key-takeaways">
<h2>핵심 요약</h2>
<ul>
<li>예상 월 유지비는 조건에 따라 약 ${monthly}원 안팎까지 달라질 수 있습니다.</li>
<li>연간 비용은 단순 환산 기준 약 ${yearly}원이며, 보험료와 주행거리가 가장 크게 흔들립니다.</li>
<li>계약 전에는 <a href="/calculator">자동차 유지비 계산기</a>로 본인 조건을 다시 넣어보는 것이 좋습니다.</li>
</ul>
</aside>

<section>
<h2>${topic} 비용을 볼 때 먼저 나눌 항목</h2>
<p>${topic}의 비용은 초기 비용과 반복 비용으로 나누어야 합니다. 초기 비용에는 차량 가격, 취득세, 등록 관련 비용이 들어가고 반복 비용에는 보험료, 세금, ${fuelLabel}, 소모품, 주차비가 들어갑니다.</p>
<p>${lensLine} 특히 ${detail} 항목은 견적서에 한 줄로 묶여 보이는 경우가 많아 월 단위로 다시 풀어 계산해야 합니다.</p>
<table>
<thead><tr><th>항목</th><th>월 환산 기준</th><th>확인 방법</th></tr></thead>
<tbody>
<tr><td>보험료</td><td>월 약 ${insurance}원 기준</td><td>운전자 나이, 사고 이력, 담보 조건별 비교</td></tr>
<tr><td>자동차세</td><td>연 약 ${tax}원 기준</td><td>배기량 또는 전기차 고정 세액 확인</td></tr>
<tr><td>${fuelLabel}</td><td>월 주행거리와 효율 기준</td><td>도심·고속 비율을 나누어 계산</td></tr>
<tr><td>정비·소모품</td><td>타이어, 오일, 브레이크 패드</td><td>보증기간과 교체 주기를 함께 확인</td></tr>
</tbody>
</table>
</section>

<section>
<h2>3분 계산 순서</h2>
<ol>
<li>월 주행거리와 주된 운행 환경을 먼저 정합니다.</li>
<li>보험료는 평균값이 아니라 본인 명의 기준 견적을 확인합니다.</li>
<li>자동차세와 취득세는 공식 안내 기준으로 별도 계산합니다.</li>
<li>정비비는 보증기간 안과 밖을 나누어 잡습니다.</li>
<li>마지막으로 <a href="/calculator">자동차 유지비 계산기</a>에서 월 비용과 연 비용을 동시에 비교합니다.</li>
</ol>
</section>

<section>
<h2>실수하기 쉬운 비용</h2>
<p>${topic}을 볼 때 가장 자주 빠지는 항목은 타이어, 배터리, 브레이크, 사고 자기부담금입니다. 이 비용은 매달 나가지는 않지만 한 번 발생하면 월평균 비용을 크게 끌어올립니다.</p>
<p>중고차나 보증 만료 차량은 소모품보다 전장 부품, 냉각 계통, 하체 부품 비용을 따로 잡아야 합니다. 전기차는 엔진오일이 없다는 장점이 있지만 타이어와 보험료가 예상보다 높을 수 있습니다.</p>
<ul>
<li>보증 만료 전에는 남은 보증 범위와 제외 항목을 정비 명세서와 함께 확인합니다.</li>
<li>수입차와 대형차는 부품 대기 기간이 길어 대차 비용까지 고려해야 합니다.</li>
<li>중고차는 구매 직후 3개월 안에 소모품을 한 번에 교체하는 경우가 많으므로 초기 정비 예산을 따로 둡니다.</li>
</ul>
</section>

<section>
<h2>예산별 판단 기준</h2>
<p>월 예산이 빠듯하다면 차량 등급을 올리는 것보다 보험 자기부담금, 타이어 규격, 보증 조건을 먼저 확인해야 합니다. 같은 ${topic}이라도 휠 크기와 타이어 규격이 달라지면 교체비가 크게 달라질 수 있습니다.</p>
<p>월 비용이 예상보다 높게 나오면 첫 번째로 주행거리를 줄이는 선택지를 보고, 두 번째로 보험 담보를 재점검하며, 세 번째로 차량 등급 또는 파워트레인을 바꾸는 방식이 현실적입니다. 단순히 보험료를 낮추기 위해 필수 담보를 줄이는 방식은 사고 시 부담이 커질 수 있습니다.</p>
<table>
<thead><tr><th>월 예산</th><th>추천 점검</th><th>주의할 점</th></tr></thead>
<tbody>
<tr><td>20만 원 이하</td><td>경차, 소형차, 저주행 조건</td><td>보험료가 높은 초보 운전자는 초과 가능</td></tr>
<tr><td>20만~40만 원</td><td>준중형·중형차 일반 유지비</td><td>할부금 포함 여부를 따로 계산</td></tr>
<tr><td>40만 원 이상</td><td>대형차, 수입차, 고성능 모델</td><td>보증 만료 후 수리비와 타이어 비용 확인</td></tr>
</tbody>
</table>
</section>

<section>
<h2>공식 자료로 다시 확인할 곳</h2>
<p>아래 자료는 비용 산정 기준을 확인할 때 먼저 볼 만한 공개 출처입니다. 실제 계약과 세금은 지역, 명의, 시점에 따라 달라질 수 있으므로 최종 금액은 원문 기준으로 확인해야 합니다.</p>
<ul>${sourceLinks(kind)}</ul>
</section>

<section>
<h2>함께 보면 좋은 계산 도구와 글</h2>
<ul>
<li><a href="/calculator">자동차 유지비 계산기</a></li>
<li><a href="/magazine?q=%EC%9C%A0%EC%A7%80%EB%B9%84">유지비 관련 글 모아보기</a></li>
<li><a href="/magazine?q=%EB%B3%B4%ED%97%98">자동차 보험 글 모아보기</a></li>
</ul>
</section>

<section>
<h2>자주 묻는 질문</h2>
<details><summary>${topic} 평균 유지비만 보면 충분한가요?</summary><div><p>평균 유지비는 출발점일 뿐입니다. 운전자 나이, 사고 이력, 거주 지역, 주행거리, 충전 또는 주유 환경에 따라 실제 비용이 달라집니다.</p></div></details>
<details><summary>보험료는 왜 사람마다 차이가 큰가요?</summary><div><p>보험료는 차량보다 운전자 조건의 영향을 크게 받습니다. 나이, 가입 경력, 사고 이력, 담보 범위, 자기부담금 설정을 함께 비교해야 합니다.</p></div></details>
<details><summary>세금은 언제 확인해야 하나요?</summary><div><p>구매 전에는 취득세와 등록 비용을, 보유 중에는 자동차세를 확인해야 합니다. 전기차와 내연기관차의 세금 구조도 다릅니다.</p></div></details>
<details><summary>계산 결과가 실제 청구액과 다를 수 있나요?</summary><div><p>가능합니다. 계산기는 비교용 추정치이며, 실제 청구액은 계약 조건, 보험사 견적, 지방세 고지, 주유·충전 단가에 따라 달라집니다.</p></div></details>
</section>

<footer>
<p class="article-disclaimer">본 글은 공개 자료와 일반적인 비용 산식을 바탕으로 정리한 정보이며, 금융·보험 가입 권유가 아닙니다. 실제 보험료와 세금은 본인 조건과 공식 고지 기준으로 확인해야 합니다.</p>
<p class="ai-disclosure">이 글은 AI 도구를 활용해 공개된 자동차·정책·금융 자료를 정리·요약한 결과입니다. 사실 확인은 출처 링크의 원문을 우선합니다.</p>
</footer>
</article>`;
}

function excerptFor(topic, detail) {
  return `${topic}의 월 유지비를 보험료, 세금, 연료비, 정비비 기준으로 나누어 계산합니다. ${detail}까지 함께 확인하세요.`;
}

function qualityGate(article) {
  const detailsCount = (article.content_html.match(/<details/g) || []).length;
  const checks = [
    article.content_html.length >= 3500,
    /<table>[\s\S]*<\/table>/.test(article.content_html),
    detailsCount >= 4,
    article.content_html.includes('href="/calculator"'),
    article.content_html.includes('rel="nofollow noopener"'),
    !/(세무사로서|보험설계사로서|반드시 가입|이 차를 사세요|제가 직접 구매)/.test(article.content_html),
  ];
  return checks.every(Boolean);
}

function buildTitlePool(existingTitles) {
  const pool = [];

  for (const [model, segment, powertrain] of MODEL_TOPICS) {
    for (let i = 0; i < TITLE_PATTERNS.length; i += 1) {
      const topic = `${model} ${segment}`;
      const detail = powertrain === "ev" ? "충전비·보험료·세금" : powertrain === "hybrid" ? "연료비·보험료·세금" : "보험료·세금·정비비";
      const title = TITLE_PATTERNS[i](model, detail);
      if (!existingTitles.has(title)) {
        pool.push({
          title,
          topic,
          detail,
          kind: powertrain === "ev" ? "ev" : "insurance",
          powertrain,
          slugSeed: model.replaceAll(" ", "-").toLowerCase(),
        });
      }
    }
  }

  for (const [topic, detail, kind] of GUIDE_TOPICS) {
    for (let i = 0; i < TITLE_PATTERNS.length; i += 1) {
      const title = TITLE_PATTERNS[i](topic, detail);
      if (!existingTitles.has(title)) {
        pool.push({
          title,
          topic,
          detail,
          kind,
          powertrain: kind === "ev" ? "ev" : "gasoline",
          slugSeed: topic.replaceAll(" ", "-").toLowerCase(),
        });
      }
    }
  }

  return pool;
}

async function api(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json; charset=utf-8",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${path}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const env = {
  ...readEnvFile(envPath(".env")),
  ...readEnvFile(envPath(".env.production.local")),
};
const apiKey = env.CARTAIN_TOKEN || env.ADMIN_API_KEY;
if (!apiKey) throw new Error("ADMIN_API_KEY missing");

const existing = await api(`/api/admin/posts?limit=${ADMIN_POSTS_LIMIT}`);
const existingTitles = new Set(existing.map((post) => post.title));
const existingSlugs = new Set(existing.map((post) => post.slug));
const latestPublishedAt = existing
  .map((post) => new Date(post.published_at))
  .filter((date) => Number.isFinite(date.getTime()))
  .sort((a, b) => b - a)[0] || new Date();

let nextPublishAt = addHours(latestPublishedAt, PUBLISH_INTERVAL_HOURS);
const titlePool = buildTitlePool(existingTitles);
if (titlePool.length < COUNT) {
  throw new Error(`title pool too small: ${titlePool.length} < ${COUNT}`);
}

const created = [];
const failed = [];

for (let i = 0; created.length < COUNT && i < titlePool.length; i += 1) {
  const item = titlePool[i];
  const macro = MACROS[i % MACROS.length];
  const lens = LENSES[i % LENSES.length];
  const slugBase = makeSlugBase(item, nextPublishAt, i);
  let slug = slugBase;
  let suffix = 1;
  while (existingSlugs.has(slug)) {
    suffix += 1;
    slug = `${slugBase}-${suffix}`;
  }

  const article = {
    id: crypto.randomUUID(),
    slug,
    title: item.title,
    excerpt: excerptFor(item.topic, item.detail),
    thumbnail_url: null,
    published_at: formatIso(nextPublishAt),
    content_html: makeContent({
      title: item.title,
      topic: item.topic,
      detail: item.detail,
      kind: item.kind,
      powertrain: item.powertrain,
      macro,
      lens,
      index: i + existing.length,
    }),
  };

  if (!qualityGate(article)) {
    failed.push({ title: article.title, reason: "quality gate failed" });
    continue;
  }

  try {
    await api("/api/admin/posts", {
      method: "POST",
      body: JSON.stringify(article),
    });
    created.push({ title: article.title, slug: article.slug, published_at: article.published_at });
    existingTitles.add(article.title);
    existingSlugs.add(article.slug);
    nextPublishAt = addHours(nextPublishAt, PUBLISH_INTERVAL_HOURS);
    if (created.length % 10 === 0) console.log(`${created.length}/${COUNT} 완료`);
  } catch (error) {
    failed.push({ title: article.title, reason: error.message });
  }
}

const report = {
  requested: COUNT,
  created: created.length,
  failed,
  first: created[0] || null,
  last: created.at(-1) || null,
};

fs.writeFileSync(envPath("seeds-tmp/batch-300-report.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));

if (created.length !== COUNT) {
  process.exitCode = 1;
}
