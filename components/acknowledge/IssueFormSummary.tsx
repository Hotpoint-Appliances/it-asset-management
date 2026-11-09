import { Card, CardContent } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";
import type { IssueForm } from "@/types/issueForm";

function Group({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {label}
            </dt>
            <dd className="text-sm break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The form as the recipient reads it; the same fields, in the same order, as the PDF. */
export function IssueFormSummary({ form }: { form: IssueForm }) {
  const accessories = form.accessories.length
    ? form.accessories.map((a) => `${a.name} × ${a.quantity}`).join(", ")
    : "None";
  const condition = form.conditionComment
    ? `${form.physicalCondition}: ${form.conditionComment}`
    : form.physicalCondition;

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6">
        <Group
          title={`Form ${form.formNumber}`}
          rows={[["Date of issue", formatDate(form.issueDate)]]}
        />
        <Group
          title="Equipment details"
          rows={[
            ["Type", form.equipmentType],
            ["Finance asset no.", form.financeAssetNo],
            ["Make", form.make],
            ["Model", form.model],
            ["Serial no.", form.serialNumber],
            ["Physical condition", condition],
            ["Accessories", accessories],
          ]}
        />
        <Group
          title="User details"
          rows={[
            ["Department", form.department],
            ["Location", form.location],
            ["Issued to", form.issuedToName],
            ["Payroll no.", form.payrollNumber],
            ["Approved by", form.approvedByName],
            ["Remarks", form.remarks ?? "None"],
          ]}
        />
        <section className="bg-muted/50 flex flex-col gap-2 rounded-lg p-4">
          <h2 className="text-sm font-semibold">Disclaimer</h2>
          {form.disclaimer.map((paragraph) => (
            <p key={paragraph} className="text-muted-foreground text-sm">
              {paragraph}
            </p>
          ))}
        </section>
      </CardContent>
    </Card>
  );
}
