import type { Metadata } from "next";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <>
      <div className="page-header">
        <h1>Sign in</h1>
        <p className="lede">For the site owner, to import data.</p>
      </div>
      <section className="panel">
        <LoginForm />
      </section>
    </>
  );
}
