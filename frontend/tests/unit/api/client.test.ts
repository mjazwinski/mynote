import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { ApiError, request } from "../../../src/api/client";
import { server } from "../../mocks/server";

describe("api client", () => {
  it("returns parsed JSON on success", async () => {
    await expect(request("GET", "/health")).resolves.toEqual({ status: "ok" });
  });

  it("returns undefined for 204", async () => {
    server.use(http.delete("*/api/v1/thing", () => new HttpResponse(null, { status: 204 })));
    await expect(request("DELETE", "/thing")).resolves.toBeUndefined();
  });

  it("maps error bodies to ApiError", async () => {
    server.use(
      http.post("*/api/v1/thing", () =>
        HttpResponse.json({ detail: "Duplicate", code: "category_name_conflict" }, { status: 409 }),
      ),
    );
    const error = await request("POST", "/thing", { a: 1 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: "category_name_conflict", detail: "Duplicate" });
  });

  it("handles non-JSON error bodies", async () => {
    server.use(http.get("*/api/v1/thing", () => new HttpResponse("bad gateway", { status: 502 })));
    const error = await request("GET", "/thing").catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 502, code: "http_502" });
  });

  it("maps network failures to status 0", async () => {
    server.use(http.get("*/api/v1/thing", () => HttpResponse.error()));
    const error = await request("GET", "/thing").catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 0, code: "network_error" });
  });
});
