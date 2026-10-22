// Number, currency and date formatting used across the app (EUR, English labels)
const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
const integer = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 });
const quantity = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 3 });
const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Berlin",
});

export const formatEur = (value: number | string | null | undefined) => eur.format(Number(value ?? 0));
export const formatInt = (value: number | string | null | undefined) => integer.format(Number(value ?? 0));
export const formatQty = (value: number | string | null | undefined) => quantity.format(Number(value ?? 0));

// Signed quantity for the ledger: +20, −2
export const formatSignedQty = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${quantity.format(Math.abs(n))}`;
};

export const formatDateTime = (value: string | null | undefined) =>
  value ? dateTime.format(new Date(value)) : "";
