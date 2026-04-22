function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizePlainText(content) {
  const paragraphs = String(content)
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return "<p></p>";
  }

  return paragraphs
    .map((chunk) => `<p>${escapeHtml(chunk).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "strike",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "h2",
  "h3",
]);

const ALLOWED_ATTRS = {
  a: new Set(["href", "target", "rel"]),
};

function sanitizeNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent || "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const tag = node.tagName.toLowerCase();
  const inner = Array.from(node.childNodes).map(sanitizeNode).join("");

  if (!ALLOWED_TAGS.has(tag)) {
    return inner;
  }

  const attrs = [];
  const allowedAttrs = ALLOWED_ATTRS[tag] || new Set();

  Array.from(node.attributes).forEach((attr) => {
    const name = attr.name.toLowerCase();
    if (!allowedAttrs.has(name)) return;

    if (tag === "a" && name === "href") {
      const href = attr.value.trim();
      if (!/^https?:\/\//i.test(href)) return;
      attrs.push(`href="${escapeHtml(href)}"`);
      return;
    }

    attrs.push(`${name}="${escapeHtml(attr.value)}"`);
  });

  if (tag === "a") {
    if (!attrs.some((attr) => attr.startsWith("target="))) {
      attrs.push('target="_blank"');
    }
    if (!attrs.some((attr) => attr.startsWith("rel="))) {
      attrs.push('rel="noreferrer noopener"');
    }
  }

  if (tag === "br") {
    return "<br>";
  }

  const attrText = attrs.length ? ` ${attrs.join(" ")}` : "";
  return `<${tag}${attrText}>${inner}</${tag}>`;
}

export function sanitizeBoardContent(content) {
  if (!content) {
    return "<p></p>";
  }

  const raw = String(content);
  const hasHtmlLikeTag = /<[^>]+>/.test(raw);

  if (!hasHtmlLikeTag || typeof window === "undefined" || !window.DOMParser) {
    return normalizePlainText(raw);
  }

  const parser = new window.DOMParser();
  const doc = parser.parseFromString(raw, "text/html");
  const sanitized = Array.from(doc.body.childNodes).map(sanitizeNode).join("").trim();

  return sanitized || "<p></p>";
}

export function stripBoardContent(content) {
  if (!content) return "";

  if (typeof window !== "undefined" && window.DOMParser) {
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(sanitizeBoardContent(content), "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  }

  return String(content).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function hasBoardContent(content) {
  return stripBoardContent(content).length > 0;
}
