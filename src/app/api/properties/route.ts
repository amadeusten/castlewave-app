import { NextResponse } from 'next/server';

export async function GET() {
  const records: Record<string, unknown>[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Properties`
    );
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
      return NextResponse.json({ error: 'Failed to fetch properties' }, { status: res.status });
    }

    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  const properties = records.map((r) => {
    const f = r.fields as Record<string, unknown>;
    const photos = Array.isArray(f['Photos'])
      ? (f['Photos'] as Array<{ url: string }>).map((p) => p.url)
      : [];

    return {
      id: r.id,
      name: f['Name'] ?? '',
      address: f['Address'] ?? '',
      lat: f['Lat'] != null ? Number(f['Lat']) : null,
      lng: f['Lng'] != null ? Number(f['Lng']) : null,
      type: f['Type'] ?? '',
      phone: f['Phone'] ?? '',
      website: f['Website'] ?? '',
      contact: f['Contact'] ?? '',
      notes: f['Notes'] ?? '',
      photos,
    };
  });

  return NextResponse.json(properties);
}
