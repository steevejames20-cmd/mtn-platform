const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Construit un filtre Prisma { gte, lte } à partir de dates AAAA-MM-JJ (bornes incluses) */
export function buildDateRange(from, to) {
  const range = {};
  if (typeof from === 'string' && DATE_RE.test(from)) range.gte = new Date(`${from}T00:00:00`);
  if (typeof to === 'string' && DATE_RE.test(to)) range.lte = new Date(`${to}T23:59:59.999`);
  return Object.keys(range).length ? range : null;
}
