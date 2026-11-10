import { readFileSync } from "node:fs";
import path from "node:path";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatDate, formatDateTime } from "@/lib/format";
import { userCommentsText } from "./rules";
import type { IssueForm } from "@/types/issueForm";

const PUBLIC_DIR = path.join(process.cwd(), "public");
// Passed as bytes: react-pdf silently drops an image given a Windows absolute path.
const LOGO = readFileSync(path.join(PUBLIC_DIR, "logo-dark.png"));
const BRAND_RED = "#ed1c24";
const INK = "#1f1f1f";
const MUTED = "#6b6b6b";
const RULE = "#c9c9c9";

Font.register({
  family: "Signature",
  src: path.join(PUBLIC_DIR, "fonts/dancing-script-latin-600-normal.woff"),
});
// A long unbroken serial number must wrap inside its cell, not be hyphenated at random.
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    paddingVertical: 32,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: INK,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: BRAND_RED,
  },
  logo: { width: 118, height: 30.8 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 15 },
  banner: {
    marginTop: 10,
    paddingVertical: 5,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: BRAND_RED,
    borderWidth: 1,
    borderColor: BRAND_RED,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    marginTop: 14,
    marginBottom: 5,
  },
  table: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: RULE },
  row: { flexDirection: "row" },
  cell: {
    flex: 1,
    flexBasis: 0,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: RULE,
  },
  label: { fontSize: 7.5, color: MUTED, marginBottom: 2 },
  value: { fontFamily: "Helvetica-Bold" },
  // The size is repeated because react-pdf works out lineHeight without inheriting it.
  plain: { fontSize: 9.5, lineHeight: 1.3 },
  signature: { fontFamily: "Signature", fontSize: 21, color: "#1b2a6b" },
  disclaimer: {
    marginTop: 14,
    padding: 9,
    borderWidth: 1,
    borderColor: RULE,
    backgroundColor: "#f7f7f7",
  },
  disclaimerTitle: { fontFamily: "Helvetica-Bold", marginBottom: 4 },
  disclaimerText: { fontSize: 8.5, lineHeight: 1.35, marginBottom: 3 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 7,
    color: MUTED,
    textAlign: "center",
  },
});

function Cell({
  label,
  value,
  plain = false,
}: {
  label: string;
  value: string;
  plain?: boolean;
}) {
  return (
    <View style={styles.cell}>
      <Text style={styles.label}>{label}</Text>
      <Text style={plain ? styles.plain : styles.value}>{value}</Text>
    </View>
  );
}

const BANNERS: Partial<Record<IssueForm["status"], string>> = {
  pending: "PENDING ACKNOWLEDGEMENT: NOT YET SIGNED",
  disputed: "DISPUTED: THE RECIPIENT REPORTED A PROBLEM",
  voided: "VOID: THIS FORM WAS CANCELLED",
  expired: "EXPIRED: THIS FORM WAS NOT ACKNOWLEDGED",
  superseded: "SUPERSEDED BY A LATER FORM",
};

function IssueFormDocument({ form }: { form: IssueForm }) {
  const accessories = form.accessories.length
    ? form.accessories
        .map(
          (a) => `${a.name} x ${a.quantity}${a.notes ? ` (${a.notes})` : ""}`,
        )
        .join(", ")
    : "None";
  const condition = form.conditionComment
    ? `${form.physicalCondition}: ${form.conditionComment}`
    : form.physicalCondition;
  const banner = BANNERS[form.status];
  const userComments = userCommentsText(form);

  return (
    <Document
      title={`IT Equipment Issue Form ${form.formNumber}`}
      author="Hotpoint Appliances Ltd"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an HTML img */}
          <Image src={{ data: LOGO, format: "png" }} style={styles.logo} />
          <Text style={styles.title}>IT Equipment Issue Form</Text>
        </View>

        {banner && <Text style={styles.banner}>{banner}</Text>}

        <View style={styles.metaRow}>
          <Text>
            Date of Issue:{" "}
            <Text style={styles.value}>{formatDate(form.issueDate)}</Text>
          </Text>
          <Text>
            No. <Text style={styles.value}>{form.formNumber}</Text>
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Equipment Details</Text>
        <View style={styles.table}>
          <View style={styles.row}>
            <Cell label="Type" value={form.equipmentType} />
            <Cell label="Finance Asset No." value={form.financeAssetNo} />
          </View>
          <View style={styles.row}>
            <Cell label="Make" value={form.make} />
            <Cell label="Model" value={form.model} />
          </View>
          <View style={styles.row}>
            <Cell label="Specifications" value={form.specifications} plain />
          </View>
          <View style={styles.row}>
            <Cell label="Serial No." value={form.serialNumber} />
            <Cell label="Physical Condition" value={condition} />
          </View>
          <View style={styles.row}>
            <Cell label="Accessories" value={accessories} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>User Details</Text>
        <View style={styles.table}>
          <View style={styles.row}>
            <Cell label="Department" value={form.department} />
            <Cell label="Location" value={form.location} />
          </View>
          <View style={styles.row}>
            <Cell label="Issued to" value={form.issuedToName} />
            <Cell label="Payroll No." value={form.payrollNumber} />
          </View>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.label}>Received Signature & Date</Text>
              {form.acknowledgedAt && form.acknowledgedName ? (
                <>
                  <Text style={styles.signature}>{form.acknowledgedName}</Text>
                  <Text style={styles.plain}>
                    Electronically acknowledged{" "}
                    {formatDateTime(form.acknowledgedAt)} (EAT)
                  </Text>
                </>
              ) : (
                <Text style={styles.plain}>Awaiting acknowledgement</Text>
              )}
            </View>
            <Cell label="Approved By" value={form.approvedByName} />
          </View>
          <View style={styles.row}>
            <Cell label="Remarks" value={form.remarks ?? "None"} plain />
          </View>
          {userComments !== null && (
            <View style={styles.row}>
              <Cell label="User Comments" value={userComments} plain />
            </View>
          )}
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>Disclaimer</Text>
          {form.disclaimer.map((paragraph) => (
            <Text key={paragraph} style={styles.disclaimerText}>
              {paragraph}
            </Text>
          ))}
        </View>

        <Text style={styles.footer} fixed>
          Generated by IT Asset Manager. Document fingerprint (SHA-256):{" "}
          {form.contentHash}
        </Text>
      </Page>
    </Document>
  );
}

export function renderIssueFormPdf(form: IssueForm): Promise<Buffer> {
  return renderToBuffer(<IssueFormDocument form={form} />);
}

export function issueFormPdfResponseHeaders(
  form: IssueForm,
): Record<string, string> {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${form.formNumber}.pdf"`,
    "Cache-Control": "no-store",
  };
}
