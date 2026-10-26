import Link from "next/link";

import { messagesFor } from "@/src/i18n/define";
import { shellMessages } from "@/src/i18n/messages/shell";

import { Icon, PageHeader } from "./_components/ui";
import { getLang } from "./_lib/lang";

/** Any address the site does not have: the masthead stays, and the way on is a company search. */
export default async function NotFound() {
  const m = messagesFor(shellMessages, await getLang());
  return (
    <>
      <PageHeader title={m.notFound.title} lede={m.notFound.lede} />
      <form className="find" role="search" action="/search" method="get">
        <label className="sr-only" htmlFor="not-found-q">
          {m.search.label}
        </label>
        <Icon name="search" />
        <input
          id="not-found-q"
          name="q"
          type="search"
          maxLength={80}
          autoComplete="off"
          placeholder={m.search.placeholder}
        />
        <button className="btn" type="submit">
          {m.search.button}
        </button>
      </form>
      <p>
        <Link href="/">{m.notFound.home}</Link>
      </p>
    </>
  );
}
