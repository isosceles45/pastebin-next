import { NextResponse, type NextRequest } from "next/server";

/**
 * A HEAD request gets no body, so it must not spend one of a paste's reads.
 * Next would otherwise render the page to produce the headers, and rendering is
 * what counts a view — so a link preview bot could burn a one-read paste before
 * the recipient ever opened it. Answer HEAD here, before the page runs.
 */
export function proxy(request: NextRequest) {
  if (request.method === "HEAD") {
    return new NextResponse(null, { status: 200 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:id", "/raw/:id"],
};
