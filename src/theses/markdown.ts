import { Lexer, type Token, type Tokens } from "marked";

/**
 * A thesis body as Sigi's own typed block tree (from Sunrise's
 * `src/views/theses.ts`). The markdown is converted on the server and never to
 * HTML, so no page sets inner HTML and a hostile file cannot inject markup:
 * raw HTML becomes escaped plain text and only safe links survive.
 */

export type ThesisInline =
  | { type: "text"; text: string }
  | { type: "strong"; children: ThesisInline[] }
  | { type: "emphasis"; children: ThesisInline[] }
  | { type: "code"; text: string }
  | { type: "link"; href: string; children: ThesisInline[] }
  | { type: "break" };

export interface ThesisListItem {
  checked: boolean | null;
  children: ThesisBlock[];
}

export type ThesisBlock =
  | { type: "heading"; level: number; id: string; children: ThesisInline[] }
  | { type: "paragraph"; children: ThesisInline[] }
  | {
      type: "list";
      ordered: boolean;
      start: number | null;
      items: ThesisListItem[];
    }
  | {
      type: "table";
      align: ("left" | "center" | "right" | null)[];
      header: ThesisInline[][];
      rows: ThesisInline[][][];
    }
  | { type: "blockquote"; children: ThesisBlock[] }
  | { type: "code"; language: string | null; text: string }
  | { type: "rule" };

type Align = "left" | "center" | "right" | null;

// marked's token union is open-ended (`Tokens.Generic`), so tokens are read
// through one loose shape rather than narrowed per type.
interface Loose {
  type: string;
  text?: unknown;
  tokens?: Token[];
  items?: Loose[];
  href?: unknown;
  depth?: number;
  ordered?: boolean;
  start?: unknown;
  task?: boolean;
  checked?: boolean;
  lang?: unknown;
  align?: unknown;
  header?: { tokens: Token[] }[];
  rows?: { tokens: Token[] }[][];
}

const loose = (token: Token): Loose => token as unknown as Loose;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

function decodeEntities(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m);
}

function pushText(out: ThesisInline[], text: string): void {
  if (text === "") return;
  const last = out[out.length - 1];
  if (last?.type === "text") last.text += text;
  else out.push({ type: "text", text });
}

/** `../other-thesis/2026-11-01.md` (or without `../`), from one thesis file to another. */
const THESIS_LINK =
  /^(?:\.\.?\/)*([a-z0-9]+(?:-[a-z0-9]+)*)\/(\d{4}-\d{2}-\d{2})\.md(?:#.*)?$/;
/** A path on this site, such as `/t/BBRI` or `/macro#bi-rate`. */
const SITE_PATH = /^\/[A-Za-z0-9/_-]*(?:#[A-Za-z0-9_-]+)?$/;

/** The destination a link may keep, or null when it must become plain text. */
export function safeThesisHref(href: string): string | null {
  const thesis = THESIS_LINK.exec(href);
  if (thesis) return `/theses/${thesis[1]}?version=${thesis[2]}`;
  if (SITE_PATH.test(href)) return href;
  if (!/^https?:\/\//i.test(href)) return null;
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:" ? href : null;
  } catch {
    return null;
  }
}

function inlines(tokens: Token[] | undefined): ThesisInline[] {
  const out: ThesisInline[] = [];
  for (const raw of tokens ?? []) {
    const token = loose(raw);
    switch (token.type) {
      case "text":
        if (token.tokens?.length) {
          for (const child of inlines(token.tokens)) {
            if (child.type === "text") pushText(out, child.text);
            else out.push(child);
          }
        } else pushText(out, decodeEntities(String(token.text ?? "")));
        break;
      case "escape":
        pushText(out, String(token.text ?? ""));
        break;
      case "strong":
        out.push({ type: "strong", children: inlines(token.tokens) });
        break;
      case "em":
        out.push({ type: "emphasis", children: inlines(token.tokens) });
        break;
      case "codespan":
        out.push({ type: "code", text: decodeEntities(String(token.text)) });
        break;
      case "br":
        out.push({ type: "break" });
        break;
      case "del":
        for (const child of inlines(token.tokens)) {
          if (child.type === "text") pushText(out, child.text);
          else out.push(child);
        }
        break;
      case "link": {
        const href = safeThesisHref(String(token.href ?? ""));
        const children = inlines(token.tokens);
        // A link that may not be followed keeps its words and nothing else.
        if (href === null) pushText(out, plainText(children));
        else out.push({ type: "link", href, children });
        break;
      }
      case "image":
        pushText(out, decodeEntities(String(token.text ?? "")));
        break;
      default:
        // Raw HTML and anything unknown: shown literally, never interpreted.
        if (typeof token.text === "string") pushText(out, token.text);
    }
  }
  return out;
}

/** Plain text of an inline run. */
export function plainText(nodes: ThesisInline[]): string {
  let out = "";
  for (const node of nodes) {
    if (node.type === "text" || node.type === "code") out += node.text;
    else if (node.type === "break") out += " ";
    else out += plainText(node.children);
  }
  return out.replace(/\s+/g, " ").trim();
}

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "section" : slug;
}

function blocks(tokens: Token[] | undefined, ids: Set<string>): ThesisBlock[] {
  const out: ThesisBlock[] = [];
  for (const raw of tokens ?? []) {
    const token = loose(raw);
    switch (token.type) {
      case "heading": {
        const children = inlines(token.tokens);
        const base = slugify(plainText(children));
        let id = base;
        for (let n = 2; ids.has(id); n += 1) id = `${base}-${n}`;
        ids.add(id);
        out.push({ type: "heading", level: token.depth ?? 1, id, children });
        break;
      }
      case "paragraph":
      case "text":
        out.push({
          type: "paragraph",
          children: inlines(token.tokens ?? [raw]),
        });
        break;
      case "list":
        out.push({
          type: "list",
          ordered: token.ordered === true,
          start:
            token.ordered === true && typeof token.start === "number"
              ? token.start
              : null,
          items: (token.items ?? []).map((item) => ({
            checked: item.task === true ? item.checked === true : null,
            children: blocks(
              (item.tokens ?? []).filter(
                (child) => loose(child).type !== "checkbox",
              ),
              ids,
            ),
          })),
        });
        break;
      case "table":
        out.push({
          type: "table",
          align: ((token.align as unknown[] | undefined) ?? []).map(
            (value): Align =>
              value === "left" || value === "center" || value === "right"
                ? value
                : null,
          ),
          header: (token.header ?? []).map((cell) => inlines(cell.tokens)),
          rows: (token.rows ?? []).map((row) =>
            row.map((cell) => inlines(cell.tokens)),
          ),
        });
        break;
      case "blockquote":
        out.push({ type: "blockquote", children: blocks(token.tokens, ids) });
        break;
      case "code": {
        const language =
          typeof token.lang === "string"
            ? (token.lang.trim().split(/\s+/)[0] ?? "")
            : "";
        out.push({
          type: "code",
          language: language === "" ? null : language,
          text: String(token.text ?? ""),
        });
        break;
      }
      case "hr":
        out.push({ type: "rule" });
        break;
      case "html": {
        const text = String(token.text ?? "").trim();
        if (text !== "") {
          out.push({ type: "paragraph", children: [{ type: "text", text }] });
        }
        break;
      }
      default:
        // space, def and anything else carry no content.
        break;
    }
  }
  return out;
}

export function lexThesis(markdown: string): Token[] {
  return new Lexer({ gfm: true, breaks: false }).lex(markdown);
}

/** A top-level fence with its language word, or null for any other token. */
function fenceOf(token: Token): { language: string; text: string } | null {
  if (token.type !== "code") return null;
  // marked's token union is open-ended; "code" tokens are Tokens.Code.
  const code: Tokens.Code = token as Tokens.Code;
  return {
    language: code.lang?.trim().split(/\s+/)[0] ?? "",
    text: code.text,
  };
}

/** The text of the first top-level fence in `language`, or null. */
export function firstFence(tokens: Token[], language: string): string | null {
  for (const token of tokens) {
    const fence = fenceOf(token);
    if (fence?.language === language) return fence.text;
  }
  return null;
}

/**
 * The body as blocks, without the first `thesis` and `conditions` fences
 * (they are data, shown in their structured form).
 */
export function bodyBlocks(tokens: Token[]): ThesisBlock[] {
  const skipped = new Set<string>();
  const body = tokens.filter((token) => {
    const language = fenceOf(token)?.language;
    if (language !== "thesis" && language !== "conditions") return true;
    if (skipped.has(language)) return true;
    skipped.add(language);
    return false;
  });
  return blocks(body, new Set());
}

/** The blocks under the first level-2 heading whose text matches, up to the next one. */
export function sectionBlocks(
  all: ThesisBlock[],
  title: RegExp,
): ThesisBlock[] | null {
  const start = all.findIndex(
    (block) =>
      block.type === "heading" &&
      block.level === 2 &&
      title.test(plainText(block.children)),
  );
  if (start < 0) return null;
  const rest = all.slice(start + 1);
  const end = rest.findIndex(
    (block) => block.type === "heading" && block.level <= 2,
  );
  return end < 0 ? rest : rest.slice(0, end);
}
