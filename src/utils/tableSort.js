export const compareTableValues = (leftValue, rightValue) => {
  const left = leftValue ?? "";
  const right = rightValue ?? "";
  const hasDateShape = (value) =>
    value instanceof Date || /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(String(value).trim());

  const leftDate = new Date(left);
  const rightDate = new Date(right);
  const leftTime = leftDate.getTime();
  const rightTime = rightDate.getTime();

  if (
    hasDateShape(left) &&
    hasDateShape(right) &&
    !Number.isNaN(leftTime) &&
    !Number.isNaN(rightTime)
  ) {
    return leftTime - rightTime;
  }

  const leftNumber = Number(String(left).replace(/[^0-9.-]/g, ""));
  const rightNumber = Number(String(right).replace(/[^0-9.-]/g, ""));

  if (
    String(left).trim() !== "" &&
    String(right).trim() !== "" &&
    Number.isFinite(leftNumber) &&
    Number.isFinite(rightNumber)
  ) {
    return leftNumber - rightNumber;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

export const sortTableRows = (rows, sortConfig, getValue = (row, key) => row[key]) => {
  if (!sortConfig?.key) return rows;

  return [...rows].sort((left, right) => {
    const result = compareTableValues(
      getValue(left, sortConfig.key),
      getValue(right, sortConfig.key),
    );

    return sortConfig.direction === "asc" ? result : -result;
  });
};

export const nextSortConfig = (currentSort, key) => ({
  key,
  direction:
    currentSort.key === key && currentSort.direction === "asc" ? "desc" : "asc",
});
