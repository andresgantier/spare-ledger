// Number and currency formatting used across the app (EUR, English labels)
const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
const integer = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 });

export const formatEur = (value: number | string | null | undefined) => eur.format(Number(value ?? 0));
export const formatInt = (value: number | string | null | undefined) => integer.format(Number(value ?? 0));
