let sequence = 70;

export function GET(request: Request) {
  const url = new URL(request.url);
  sequence += 1;

  return Response.json({
    sequence,
    framework: url.searchParams.get('framework') ?? 'Next.js App Router',
    updatedAt: new Date().toISOString(),
  });
}
