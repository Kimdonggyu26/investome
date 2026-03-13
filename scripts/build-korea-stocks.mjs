console.log("스크립트 실행됨");

import fs from "fs";
import path from "path";
import iconv from "iconv-lite";

const ROOT = process.cwd();
const TMP_DIR = path.join(ROOT, "tmp");
const OUT_FILE = path.join(ROOT, "src", "data", "koreaStocks.json");

function readText(filePath) {
  const buffer = fs.readFileSync(filePath);

  let text = "";
  try {
    text = iconv.decode(buffer, "cp949");
  } catch {
    text = buffer.toString("utf8");
  }

  return text.replace(/^\uFEFF/, "");
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  result.push(current.trim());
  return result.map((v) => v.replace(/^"(.*)"$/, "$1").trim());
}

function normalizeHeader(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .replace(/\s+/g, "")
    .replace(/[()_\-./]/g, "")
    .trim()
    .toLowerCase();
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const rawHeaders = splitCsvLine(lines[0]);
  const headers = rawHeaders.map((h) => h.replace(/^\uFEFF/, "").trim());

  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row = {};

    headers.forEach((header, idx) => {
      row[header] = cols[idx] ?? "";
    });

    return row;
  });
}

function getByNormalizedKeys(row, candidates) {
  const normalizedMap = {};

  Object.keys(row).forEach((key) => {
    normalizedMap[normalizeHeader(key)] = row[key];
  });

  for (const key of candidates) {
    const hit = normalizedMap[normalizeHeader(key)];
    if (hit !== undefined && hit !== null && String(hit).trim() !== "") {
      return String(hit).trim();
    }
  }

  return "";
}

function normalizeSymbol(value) {
  const onlyDigits = String(value || "").replace(/\D/g, "");
  if (!onlyDigits) return "";
  return onlyDigits.padStart(6, "0");
}

function convertRows(rows, market) {
  return rows
    .map((row) => {
      const symbol = normalizeSymbol(
        getByNormalizedKeys(row, [
          "단축코드",
          "종목코드",
          "표준코드단축",
          "표준단축코드",
          "code",
          "symbol",
          "티커",
        ])
      );

      const name = getByNormalizedKeys(row, [
        "종목명",
        "한글종목명",
        "한글 종목명",
        "한글종목약명",
        "한글 종목약명",
        "종목약명",
        "name",
      ]);

      const displayNameEN = getByNormalizedKeys(row, [
        "영문명",
        "영문종목명",
        "영문 종목명",
        "영문종목약명",
        "영문 종목약명",
        "영문약명",
        "engname",
      ]);

      if (!symbol || !name) return null;

      return {
        market,
        symbol,
        name,
        displayNameEN: displayNameEN || name,
      };
    })
    .filter(Boolean);
}

function dedupe(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = `${item.market}-${item.symbol}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    if (a.market !== b.market) return a.market.localeCompare(b.market);
    return a.name.localeCompare(b.name, "ko");
  });
}

function main() {
  const kospiPath = path.join(TMP_DIR, "kospi.csv");
  const kosdaqPath = path.join(TMP_DIR, "kosdaq.csv");

  console.log("현재 작업 폴더:", ROOT);
  console.log("kospi exists:", fs.existsSync(kospiPath));
  console.log("kosdaq exists:", fs.existsSync(kosdaqPath));

  if (!fs.existsSync(kospiPath)) {
    throw new Error("tmp/kospi.csv 파일이 없어.");
  }

  if (!fs.existsSync(kosdaqPath)) {
    throw new Error("tmp/kosdaq.csv 파일이 없어.");
  }

  const kospiRows = parseCsv(readText(kospiPath));
  const kosdaqRows = parseCsv(readText(kosdaqPath));

  console.log("kospi rows:", kospiRows.length);
  console.log("kosdaq rows:", kosdaqRows.length);
  console.log("kospi headers:", Object.keys(kospiRows[0] || {}));
  console.log("kosdaq headers:", Object.keys(kosdaqRows[0] || {}));

  const kospiItems = convertRows(kospiRows, "KOSPI");
  const kosdaqItems = convertRows(kosdaqRows, "KOSDAQ");

  console.log("converted kospi:", kospiItems.length);
  console.log("converted kosdaq:", kosdaqItems.length);

  const merged = sortItems(dedupe([...kospiItems, ...kosdaqItems]));

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(merged, null, 2), "utf8");

  console.log(`완료: ${merged.length}개 종목 저장 -> ${OUT_FILE}`);
}

main();