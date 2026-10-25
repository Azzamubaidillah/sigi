"use client";

import { useEffect, useRef } from "react";

import { commonMessages } from "@/src/i18n/messages/common";
import type { Lang } from "@/src/i18n/lang";

/**
 * A TradingView embed (DATA-SOURCES S3). It renders in the visitor's browser
 * from TradingView's servers and is never read by Sigi's code: display only,
 * with TradingView's attribution left as TradingView ships it. The widget and
 * its caption follow the page's language.
 */
export function TradingViewWidget({
  script,
  config,
  height,
  title,
  lang,
}: {
  /** File name under s3.tradingview.com/external-embedding/. */
  script: string;
  config: Record<string, unknown>;
  height: number;
  /** Names the widget for assistive technology, in the page's language. */
  title: string;
  lang: Lang;
}) {
  const container = useRef<HTMLDivElement>(null);
  const configJson = JSON.stringify(config);

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    const embed = document.createElement("script");
    embed.src = `https://s3.tradingview.com/external-embedding/${script}`;
    embed.async = true;
    embed.type = "text/javascript";
    // TradingView's loader reads its configuration from its own script body.
    embed.textContent = JSON.stringify({
      ...JSON.parse(configJson),
      locale: lang,
      colorTheme: dark ? "dark" : "light",
      theme: dark ? "dark" : "light",
    });
    host.replaceChildren(widget, embed);
    return () => host.replaceChildren();
  }, [script, configJson, lang]);

  const caption = commonMessages[lang].widget;

  return (
    <figure className="widget">
      {/* The fixed height sits outside the container: TradingView's loader
          rewrites the container it is given, and its frame then fills it. */}
      <div style={{ height }}>
        <div
          className="tradingview-widget-container"
          ref={container}
          style={{ height: "100%" }}
          aria-label={title}
          role="group"
        />
      </div>
      <figcaption>
        <a
          href="https://www.tradingview.com/"
          rel="noopener nofollow"
          target="_blank"
        >
          {caption.link}
        </a>
        {caption.note}
      </figcaption>
    </figure>
  );
}
