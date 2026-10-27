// Wake-up call from public/embed.js. Touches no database, so it stays cheap while the free instance starts.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
