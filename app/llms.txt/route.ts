import { loadConfig } from "@/src/config";
import { loadTheses } from "@/src/views/theses";

export const dynamic = "force-dynamic";

/**
 * A plain-text map of the site for language models (the llms.txt convention):
 * what it is, where the data comes from, and one line per page and per thesis.
 * The theses are read from the folder, so a new one appears here without a
 * change to this file. Whether any assistant reads this file is not known; the
 * pages themselves carry the same facts in their descriptions and structured
 * data.
 */
export function GET(): Response {
  const config = loadConfig();
  const { origin } = config;
  const theses = loadTheses(config).theses.flatMap((thesis) =>
    thesis.header
      ? [
          `- [${thesis.header.title}](${origin}/theses/${thesis.slug}): ${thesis.header.summary}`,
        ]
      : [],
  );
  const body = [
    "# Sigi",
    "",
    "> Sigi is a free research site on Indonesian listed companies. It shows who holds more than 1% of each company, how much of it can really float against the exchange's 15% minimum free-float rule, how macro conditions bear on each sector, and investment views with explicit conditions that would prove them wrong. Every figure cites its source. It is research, not investment advice.",
    "",
    "Ownership figures come from the monthly register of holders above 1% that PT Bursa Efek Indonesia publishes with data from PT Kustodian Sentral Efek Indonesia. Free float is given as an upper bound, because the register lists only holders above 1%. Macro series come from Bank Indonesia, the World Bank, FRED and the Bank for International Settlements. Sigi stores no share prices. Every page is in English and Indonesian at the same address; the language follows a cookie.",
    "",
    "## Pages",
    "",
    `- [Market and register](${origin}/): every listed company with its free-float bound and an ownership bar, filtered by free float, largest holder or investor type`,
    `- [Investability](${origin}/investability): which companies are certainly below the 15% minimum, and the staged deadlines`,
    `- [Holders](${origin}/holders): institutions that hold more than 1% of listed companies`,
    `- [Macro](${origin}/macro): rates, commodity prices and exchange rates, linked to the IDX sectors they bear on`,
    `- [Theses](${origin}/theses): the views held, and the conditions checked each day that would prove each wrong`,
    `- [Daily brief](${origin}/brief): what changed in the data, with the evidence for each point`,
    `- [Data and sources](${origin}/data): where each figure comes from, when it was fetched, and each source's licence`,
    `- A company page is at ${origin}/t/<four-letter code>, for example [BBRI](${origin}/t/BBRI)`,
    "",
    "## Theses",
    "",
    ...theses,
    "",
    "## Optional",
    "",
    "- [Source code](https://github.com/Azzamubaidillah/sigi)",
    `- [Sitemap](${origin}/sitemap.xml)`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
