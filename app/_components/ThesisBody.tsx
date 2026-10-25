import Link from "next/link";
import type { ReactNode } from "react";

import type { Lang } from "@/src/i18n/lang";
import { thesesMessages } from "@/src/i18n/messages/theses";
import type { ThesisBlock, ThesisInline } from "@/src/theses/markdown";

/**
 * Renders a thesis's typed block tree (from Sunrise's ThesisBody). Every node
 * becomes a React element and nothing sets inner HTML, so a file's markup can
 * never reach the page as markup.
 */

function Inlines({ nodes }: { nodes: ThesisInline[] }): ReactNode {
  return nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return node.text;
      case "strong":
        return (
          <strong key={index}>
            <Inlines nodes={node.children} />
          </strong>
        );
      case "emphasis":
        return (
          <em key={index}>
            <Inlines nodes={node.children} />
          </em>
        );
      case "code":
        return <code key={index}>{node.text}</code>;
      case "break":
        return <br key={index} />;
      case "link":
        return node.href.startsWith("/") ? (
          <Link href={node.href} key={index}>
            <Inlines nodes={node.children} />
          </Link>
        ) : (
          <a href={node.href} key={index} rel="noopener noreferrer nofollow">
            <Inlines nodes={node.children} />
          </a>
        );
    }
  });
}

function Blocks({
  blocks,
  lang,
}: {
  blocks: ThesisBlock[];
  lang: Lang;
}): ReactNode {
  return blocks.map((block, index) => {
    switch (block.type) {
      case "heading": {
        // The page owns h1 and each panel's h2, so a file's # and ## both
        // become h3 and deeper levels follow, without skipping a level.
        const Tag = `h${Math.min(Math.max(block.level, 2) + 1, 6)}` as
          "h3" | "h4" | "h5" | "h6";
        return (
          <Tag id={`thesis-${block.id}`} key={index}>
            <Inlines nodes={block.children} />
          </Tag>
        );
      }
      case "paragraph":
        return (
          <p key={index}>
            <Inlines nodes={block.children} />
          </p>
        );
      case "list": {
        const Tag = block.ordered ? "ol" : "ul";
        return (
          <Tag
            key={index}
            start={
              block.ordered && block.start !== null ? block.start : undefined
            }
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>
                {item.checked === null ? null : (
                  <input
                    aria-label={
                      item.checked
                        ? thesesMessages[lang].doneLabel
                        : thesesMessages[lang].notDoneLabel
                    }
                    checked={item.checked}
                    disabled
                    readOnly
                    type="checkbox"
                  />
                )}
                <Blocks blocks={item.children} lang={lang} />
              </li>
            ))}
          </Tag>
        );
      }
      case "table":
        return (
          <div className="table-wrap" key={index}>
            <table className="data">
              <thead>
                <tr>
                  {block.header.map((cell, cellIndex) => (
                    <th
                      key={cellIndex}
                      scope="col"
                      style={{ textAlign: block.align[cellIndex] ?? undefined }}
                    >
                      <Inlines nodes={cell} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        style={{
                          textAlign: block.align[cellIndex] ?? undefined,
                        }}
                      >
                        <Inlines nodes={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "blockquote":
        return (
          <blockquote key={index}>
            <Blocks blocks={block.children} lang={lang} />
          </blockquote>
        );
      case "code":
        return (
          <pre key={index} tabIndex={0}>
            <code>{block.text}</code>
          </pre>
        );
      case "rule":
        return <hr key={index} />;
    }
  });
}

export function ThesisBody({
  blocks,
  lang,
}: {
  blocks: ThesisBlock[];
  lang: Lang;
}) {
  return (
    <div className="prose thesis-body">
      <Blocks blocks={blocks} lang={lang} />
    </div>
  );
}
