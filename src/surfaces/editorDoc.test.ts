import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { formatText } from "../lib/format";
import {
  createEditorDiskSession,
  editorDocChanges,
  isDocDirty,
} from "./editorDoc";

describe("editorDocChanges", () => {
  it("returns no changes when the documents match", () => {
    expect(editorDocChanges("alpha\nbeta\n", "alpha\nbeta\n")).toEqual([]);
  });

  it("rewrites only the edited span so later matches keep their offsets", () => {
    const from = "const hello = 1;\nconst hello = 2;\n";
    const to = "const hello = 1;\nconst hallo = 2;\n";
    expect(editorDocChanges(from, to)).toEqual([
      { from: 24, to: 25, insert: "a" },
    ]);
  });

  it("maps a trailing-newline format as a small tail insert", () => {
    const from = "const hello = 1;";
    const to = "const hello = 1;\n";
    const changes = editorDocChanges(from, to);
    expect(changes).toEqual([{ from: 16, to: 16, insert: "\n" }]);
  });

  it("keeps a later search selection on the same match after an earlier edit", () => {
    const from = "const hello = 1;\nconst hello = 2;\n";
    const to = "const hallo = 1;\nconst hello = 2;\n";
    const second = from.indexOf("hello", from.indexOf("hello") + 1);
    const state = EditorState.create({
      doc: from,
      selection: { anchor: second, head: second + 5 },
    });
    const next = state.update({ changes: editorDocChanges(from, to) }).state;
    expect(
      next.sliceDoc(next.selection.main.from, next.selection.main.to),
    ).toBe("hello");
    expect(next.doc.lineAt(next.selection.main.from).number).toBe(2);
  });
});

describe("createEditorDiskSession & isDocDirty integration boundary", () => {
  it("uses detected disk convention for save serialization after formatting", async () => {
    const session = createEditorDiskSession();
    const rawDisk = "const value={answer:42}\r\n";
    const loaded = session.applyDiskContent(rawDisk);
    expect(loaded.text).toBe("const value={answer:42}\n");
    expect(session.serializeForSave("check\n")).toBe("check\r\n");

    const formatResult = await formatText("example.ts", loaded.text, 0);
    expect(formatResult).not.toBeNull();
    if (!formatResult) return;

    const saved = session.serializeForSave(formatResult.formatted);
    expect(saved).toBe("const value = { answer: 42 };\r\n");
    expect(saved).not.toContain("\r\r\n");
  });

  it("updates convention on external reload and applies it to subsequent saves", () => {
    const session = createEditorDiskSession();
    // Initially CRLF
    session.applyDiskContent("line1\r\nline2\r\n");
    expect(session.serializeForSave("updated\n")).toBe("updated\r\n");

    // External reload changes to LF
    session.applyDiskContent("line1\nline2\n");
    expect(session.serializeForSave("updated\n")).toBe("updated\n");

    // External reload changes to CR-only
    session.applyDiskContent("line1\rline2\r");
    expect(session.serializeForSave("updated\n")).toBe("updated\r");
  });

  it("does not treat content normalization alone as a dirty edit", () => {
    const session = createEditorDiskSession();
    const rawDisk = "alpha\r\nbeta\r\n";
    const loaded = session.applyDiskContent(rawDisk);

    const initialDoc = EditorState.create({ doc: loaded.text }).doc;
    const savedDoc = initialDoc;
    expect(isDocDirty(initialDoc, savedDoc)).toBe(false);

    // Editing creates a dirty document
    const editedDoc = EditorState.create({ doc: loaded.text + "gamma\n" }).doc;
    expect(isDocDirty(editedDoc, savedDoc)).toBe(true);

    // Null saved document is not dirty
    expect(isDocDirty(initialDoc, null)).toBe(false);
  });

  it("serializes staging payload with detected convention without double encoding", () => {
    const session = createEditorDiskSession();
    session.applyDiskContent("alpha\r\nbeta\r\n");

    // Staging canonical chunk
    const staged = session.serializeForStage("alpha\nBETA\n");
    expect(staged).toBe("alpha\r\nBETA\r\n");

    // Staging already encoded chunk does not produce CRCRLF
    const restaged = session.serializeForStage(staged);
    expect(restaged).toBe("alpha\r\nBETA\r\n");
    expect(restaged).not.toContain("\r\r\n");
  });
});
