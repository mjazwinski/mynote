import { http, HttpResponse, type JsonBodyType } from "msw";
import { HttpError, mockDb } from "./db";

const base = "*/api/v1";

type Params = Record<string, string>;
type RawParams = Record<string, string | readonly string[] | undefined>;

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Wrap an operation: record the call, apply injected failures, map HttpError to responses. */
function handle(
  operation: string,
  run: (params: Params, body: Record<string, unknown>) => JsonBodyType | void,
  successStatus = 200,
) {
  return async ({ request, params: rawParams }: { request: Request; params: RawParams }) => {
    const params: Params = Object.fromEntries(
      Object.entries(rawParams).map(([k, v]) => [k, String(v)]),
    );
    const url = new URL(request.url);
    mockDb.calls.push(`${request.method} ${url.pathname.replace("/api/v1", "")}`);
    const failure = mockDb.takeFailure(operation);
    if (failure?.network) return HttpResponse.error();
    if (failure) {
      return HttpResponse.json(
        { detail: failure.detail ?? "Injected failure", code: failure.code ?? "injected" },
        { status: failure.status },
      );
    }
    const body = ["POST", "PATCH", "PUT"].includes(request.method) ? await readJson(request) : {};
    try {
      const result = run(params, body);
      if (successStatus === 204) return new HttpResponse(null, { status: 204 });
      return HttpResponse.json(result ?? null, { status: successStatus });
    } catch (err) {
      if (err instanceof HttpError) {
        return HttpResponse.json({ detail: err.detail, code: err.code }, { status: err.status });
      }
      throw err;
    }
  };
}

export const handlers = [
  http.get(`${base}/health`, () => HttpResponse.json({ status: "ok" })),
  http.get(`${base}/categories`, handle("listCategories", () => mockDb.listCategories())),
  http.post(
    `${base}/categories`,
    handle("createCategory", (_p, body) => mockDb.createCategory(body.name), 201),
  ),
  http.delete(
    `${base}/categories/:categoryId`,
    handle("deleteCategory", (p) => mockDb.deleteCategory(p.categoryId), 204),
  ),
  http.get(
    `${base}/categories/:categoryId/notes`,
    handle("listNotes", (p) => mockDb.listNotes(p.categoryId)),
  ),
  http.post(
    `${base}/categories/:categoryId/notes`,
    handle(
      "createNote",
      (p, body) => mockDb.createNote(p.categoryId, (body.content as string) ?? ""),
      201,
    ),
  ),
  http.put(
    `${base}/categories/:categoryId/notes/order`,
    handle("reorderNotes", (p, body) => mockDb.reorderNotes(p.categoryId, body.note_ids)),
  ),
  http.patch(
    `${base}/notes/:noteId`,
    handle("updateNote", (p, body) => mockDb.updateNote(p.noteId, body.content)),
  ),
  http.delete(`${base}/notes/:noteId`, handle("deleteNote", (p) => mockDb.deleteNote(p.noteId), 204)),
];
