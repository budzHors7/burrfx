export function formatCurrency(
  value: number | null | undefined,
  currency = "USD"
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatSignedCurrency(
  value: number | null | undefined,
  currency = "USD"
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  const absolute = formatCurrency(Math.abs(value), currency);
  if (value > 0) {
    return `+${absolute}`;
  }
  if (value < 0) {
    return `-${absolute}`;
  }
  return absolute;
}

export function formatNumber(
  value: number | null | undefined,
  maximumFractionDigits = 2
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
  }).format(value);
}

export function formatPrice(
  value: number | null | undefined
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return value.toFixed(5);
}

export function formatTimestamp(
  value: string | null | undefined
): string {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatCountdown(
  value: number | null | undefined
): string {
  if (value === null || value === undefined || value < 0) {
    return "--:--";
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
