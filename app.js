const API_JS =
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies";
const API_CF = "https://latest.currency-api.pages.dev/v1/currencies";

const CURRENCY_CODES = Object.keys(countryList).sort();

const amountInput = document.querySelector("#amount-input");
const msg = document.querySelector(".msg");
const form = document.querySelector("form");
const swapBtn = document.querySelector(".swap-btn");

const pickers = {
  from: {
    input: document.querySelector("#from-currency-input"),
    list: document.querySelector("#from-suggestions"),
    flag: document.querySelector('[data-side="from"] .flag'),
    code: "USD",
  },
  to: {
    input: document.querySelector("#to-currency-input"),
    list: document.querySelector("#to-suggestions"),
    flag: document.querySelector('[data-side="to"] .flag'),
    code: "PKR",
  },
};

function setFlag(picker, code) {
  const cc = countryList[code];
  if (cc) picker.flag.src = `https://flagsapi.com/${cc}/flat/64.png`;
}

function syncPickerInput(side) {
  const p = pickers[side];
  p.input.value = p.code;
}

function normalizeCode(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .slice(0, 5);
}

function filterCodes(query) {
  const q = normalizeCode(query);
  if (!q) return CURRENCY_CODES.slice(0, 16);
  const starts = CURRENCY_CODES.filter((c) => c.startsWith(q));
  const rest = CURRENCY_CODES.filter((c) => !c.startsWith(q) && c.includes(q));
  return [...starts, ...rest].slice(0, 24);
}

function renderSuggestions(side) {
  const p = pickers[side];
  const items = filterCodes(p.input.value);
  p.list.innerHTML = "";
  for (const code of items) {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.dataset.code = code;
    li.innerHTML = `<span class="code">${code}</span><span class="sep">·</span><span>${countryList[code]}</span>`;
    p.list.appendChild(li);
  }
  const show = items.length > 0 && p.input === document.activeElement;
  p.list.hidden = !show;
  p.input.setAttribute("aria-expanded", show ? "true" : "false");
}

function hideSuggestions(side) {
  const p = pickers[side];
  p.list.hidden = true;
  p.input.setAttribute("aria-expanded", "false");
}

function selectCode(side, code) {
  const upper = normalizeCode(code);
  if (!countryList[upper]) return;
  pickers[side].code = upper;
  syncPickerInput(side);
  setFlag(pickers[side], upper);
  hideSuggestions(side);
}

function wirePicker(side) {
  const p = pickers[side];

  p.input.addEventListener("focus", () => {
    renderSuggestions(side);
  });

  p.input.addEventListener("input", () => renderSuggestions(side));

  p.input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideSuggestions(side);
      syncPickerInput(side);
      p.input.blur();
    }
  });

  p.input.addEventListener("blur", () => {
    setTimeout(() => {
      if (p.list.matches(":hover")) return;
      hideSuggestions(side);
      const normalized = normalizeCode(p.input.value);
      if (countryList[normalized]) {
        if (pickers[side].code !== normalized) {
          selectCode(side, normalized);
          updateExchangeRate();
        }
      } else {
        syncPickerInput(side);
      }
    }, 160);
  });

  p.list.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const li = e.target.closest("li[data-code]");
    if (!li) return;
    selectCode(side, li.dataset.code);
    updateExchangeRate();
  });
}

const fetchRateTable = async (baseCode) => {
  const path = `/${baseCode.toLowerCase()}.json`;
  let res = await fetch(API_JS + path);
  if (!res.ok) res = await fetch(API_CF + path);
  if (!res.ok) throw new Error("Could not load exchange rates");
  return res.json();
};

const updateExchangeRate = async () => {
  const fromCode = pickers.from.code;
  const toCode = pickers.to.code;
  let amtVal = amountInput.value;
  if (amtVal === "" || Number(amtVal) < 1) {
    amtVal = 1;
    amountInput.value = "1";
  }
  msg.textContent = "Loading…";
  try {
    const data = await fetchRateTable(fromCode);
    const fromKey = fromCode.toLowerCase();
    const toKey = toCode.toLowerCase();
    const rates = data[fromKey];
    if (!rates || typeof rates[toKey] !== "number") {
      msg.textContent = "Rate not available for this pair.";
      return;
    }
    const rate = rates[toKey];
    const n = Number(amtVal);
    const finalAmount = n * rate;
    msg.textContent = `${n} ${fromCode} = ${finalAmount.toFixed(4)} ${toCode}`;
  } catch {
    msg.textContent =
      "Failed to get rate. Check your connection and try again.";
  }
};

document.addEventListener("click", (e) => {
  if (!e.target.closest(".currency-picker")) {
    hideSuggestions("from");
    hideSuggestions("to");
  }
});

swapBtn.addEventListener("click", () => {
  const a = pickers.from.code;
  const b = pickers.to.code;
  pickers.from.code = b;
  pickers.to.code = a;
  syncPickerInput("from");
  syncPickerInput("to");
  setFlag(pickers.from, pickers.from.code);
  setFlag(pickers.to, pickers.to.code);
  updateExchangeRate();
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  updateExchangeRate();
});

syncPickerInput("from");
syncPickerInput("to");
setFlag(pickers.from, pickers.from.code);
setFlag(pickers.to, pickers.to.code);
wirePicker("from");
wirePicker("to");

window.addEventListener("load", () => {
  updateExchangeRate();
});
