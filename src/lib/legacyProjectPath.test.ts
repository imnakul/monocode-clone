import { describe, expect, it } from "vitest";
import { repairLegacyEncodedDriveColon } from "./legacyProjectPath";

describe("repairLegacyEncodedDriveColon", () => {
  it("repairs a lowercase encoded drive colon", () => {
    expect(repairLegacyEncodedDriveColon("e%3A/Developing/Knoarc/x")).toBe(
      "e:/Developing/Knoarc/x",
    );
  });

  it("repairs uppercase drive letters and encodings", () => {
    expect(repairLegacyEncodedDriveColon("E%3A/Developing/Knoarc/x")).toBe(
      "E:/Developing/Knoarc/x",
    );
    expect(repairLegacyEncodedDriveColon("e%3a/Developing/Knoarc/x")).toBe(
      "e:/Developing/Knoarc/x",
    );
  });

  it("repairs a file-URL style leading slash", () => {
    expect(repairLegacyEncodedDriveColon("/e%3A/Developing/x")).toBe(
      "/e:/Developing/x",
    );
  });

  it("repairs a bare encoded drive", () => {
    expect(repairLegacyEncodedDriveColon("e%3A")).toBe("e:");
  });

  it("leaves healthy paths alone", () => {
    expect(repairLegacyEncodedDriveColon("E:/Developing/Knoarc/x")).toBe(
      "E:/Developing/Knoarc/x",
    );
    expect(repairLegacyEncodedDriveColon("/home/me/project")).toBe(
      "/home/me/project",
    );
  });

  it("leaves literal percent sequences intact", () => {
    // %20 is a space, not a drive colon — never decode it here.
    expect(repairLegacyEncodedDriveColon("E:/my%20project")).toBe(
      "E:/my%20project",
    );
    // A literal %3A that is not a leading drive prefix stays as-is.
    expect(repairLegacyEncodedDriveColon("E:/100%3Afoo")).toBe(
      "E:/100%3Afoo",
    );
    expect(repairLegacyEncodedDriveColon("E:/50% off/report.md")).toBe(
      "E:/50% off/report.md",
    );
    // No slash after the encoding: not the legacy drive shape.
    expect(repairLegacyEncodedDriveColon("e%3Ax")).toBe("e%3Ax");
  });
});
