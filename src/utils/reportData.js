const remarkKeys = ["remarks", "natureOfFault", "remark", "notes"];

export const getBoxRemarkText = (box = {}) => {
  const matchedKey = remarkKeys.find((key) => {
    const value = box?.[key];
    return typeof value === "string" && value.trim();
  });

  if (!matchedKey) return "";

  const value = box[matchedKey];
  return typeof value === "string" ? value.trim() : "";
};
