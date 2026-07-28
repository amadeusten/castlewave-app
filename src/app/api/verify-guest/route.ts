import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ matches: [] });
  }

  const records: Record<string, unknown>[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Guests`);
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Airtable error:', err);
      return NextResponse.json({ error: 'Failed to fetch guests' }, { status: res.status });
    }

    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  const needle = q.trim().toLowerCase();
  const matches = records
    .map((r) => {
      const record = r as { id: string; fields: Record<string, string> };
      const f = record.fields;
      return {
        recordId: record.id,
        firstName: f['First Name'] ?? '',
        lastName: f['Last Name'] ?? '',
      };
    })
    .filter((g) => `${g.firstName} ${g.lastName}`.toLowerCase().includes(needle));

  return NextResponse.json({ matches });
}
