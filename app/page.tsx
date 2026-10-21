import { S1Citation } from "@/app/_components/Citation";
import { CompanyTable } from "@/app/_components/CompanyTable";
import { formatDate } from "@/app/_lib/format";
import { loadConfig } from "@/src/config";
import { ABSENCE_TEXT, loadCompanyList } from "@/src/views/ownership";

export default function CompaniesPage() {
  const list = loadCompanyList(loadConfig().databasePath);
  return (
    <>
      <div className="page-header">
        <h1>Who owns Indonesia&apos;s listed companies</h1>
        <p className="lede">
          Every holder above 1% of every listed company, from the monthly
          register. The float estimate is the share the register leaves to
          holders below 1%: an estimate, not the official free-float figure.
        </p>
      </div>
      {list.kind === "absent" ? (
        <section className="panel">
          <p className="absent">{ABSENCE_TEXT[list.reason]}</p>
        </section>
      ) : (
        <section className="panel">
          <dl className="figures">
            <div>
              <dt>Record date</dt>
              <dd>{formatDate(list.month.recordDate)}</dd>
            </div>
            <div>
              <dt>Companies</dt>
              <dd>{list.month.issuerCount}</dd>
            </div>
            <div>
              <dt>Holdings above 1%</dt>
              <dd>{list.month.rowCount.toLocaleString("en-US")}</dd>
            </div>
            <div>
              <dt>Distinct holders</dt>
              <dd>{list.month.holderCount.toLocaleString("en-US")}</dd>
            </div>
          </dl>
          <div className="spaced">
            <CompanyTable companies={list.companies} />
          </div>
          <S1Citation month={list.month} />
        </section>
      )}
    </>
  );
}
