export const BOX_SERIAL_PATTERN_TEXT =
  "BOSS-CBOX followed by exactly 4 digits, for example BOSS-CBOX1090";
export const BOX_SERIAL_PATTERN = /^BOSS-CBOX\d{4}$/;
export const BOX_SERIAL_INPUT_PATTERN = "BOSS-CBOX[0-9]{4}";

export const normalizeBoxSerial = (value) => {
  const cleanedValue = String(value || "").trim().toUpperCase();
  const match = cleanedValue.match(/^BOSS-CBOX(\d+)/);

  if (!match) return cleanedValue;

  return `BOSS-CBOX${match[1].slice(0, 4)}`;
};

export const isValidBoxSerial = (value) => BOX_SERIAL_PATTERN.test(normalizeBoxSerial(value));
