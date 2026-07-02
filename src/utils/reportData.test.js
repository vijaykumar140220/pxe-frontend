import { getBoxRemarkText } from "./reportData";

describe("getBoxRemarkText", () => {
  it("returns the entered remark text from a transaction record", () => {
    expect(getBoxRemarkText({ remarks: "Battery damaged" })).toBe(
      "Battery damaged",
    );
  });

  it("falls back to other supported remark fields", () => {
    expect(getBoxRemarkText({ natureOfFault: "Screen cracked" })).toBe(
      "Screen cracked",
    );
  });

  it("returns an empty string when no remark is available", () => {
    expect(getBoxRemarkText({})).toBe("");
  });
});
