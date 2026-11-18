import { describe, expect, it } from "vitest";
import { allDrafts, getDraft, removeDraft, setDraft } from "../../../src/state/drafts";

describe("drafts", () => {
  it("stores, reads and removes drafts under mynote.drafts", () => {
    setDraft("n1", "hello");
    setDraft("n2", "world");
    expect(getDraft("n1")?.content).toBe("hello");
    expect(Object.keys(allDrafts())).toEqual(["n1", "n2"]);
    expect(JSON.parse(localStorage.getItem("mynote.drafts")!).n2.content).toBe("world");

    removeDraft("n1");
    expect(getDraft("n1")).toBeUndefined();
    expect(Object.keys(allDrafts())).toEqual(["n2"]);
  });

  it("records an updatedAt timestamp", () => {
    setDraft("n1", "x");
    expect(Date.parse(getDraft("n1")!.updatedAt)).not.toBeNaN();
  });

  it("treats corrupted data as empty", () => {
    localStorage.setItem("mynote.drafts", "{not json");
    expect(allDrafts()).toEqual({});
    setDraft("n1", "ok");
    expect(getDraft("n1")?.content).toBe("ok");
  });

  it("ignores non-object JSON", () => {
    localStorage.setItem("mynote.drafts", "[1,2]");
    expect(allDrafts()).toEqual({});
  });
});
