export const BOX_SERIAL_PATTERN_TEXT = "BOSS-CBOX followed by digits, for example BOSS-CBOX1090";
export const BOX_SERIAL_PATTERN = /^BOSS-CBOX\d+$/;
export const BOX_SERIAL_INPUT_PATTERN = "BOSS-CBOX[0-9]+";

export const normalizeBoxSerial = (value) => String(value || "").trim().toUpperCase();

export const isValidBoxSerial = (value) => BOX_SERIAL_PATTERN.test(normalizeBoxSerial(value));
