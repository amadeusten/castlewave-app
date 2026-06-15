import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Guests/${encodeURIComponent(id)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Guest not found' }, { status: response.status });
  }

  const record = await response.json();
  const f = record.fields as Record<string, string>;

  return NextResponse.json({
    recordId: record.id,
    firstName: f['First Name'] ?? '',
    lastName: f['Last Name'] ?? '',
    email: f['Email'] ?? '',
    plusOne: f['Plus One'] ?? 'No',
    plusOneName: f['Plus One Name'] ?? '',
    dietaryRestrictions: f['Dietary Restrictions'] ?? 'No',
    dietDetail: f['Diet Detail'] ?? '',
    welcomeDinner: f['Welcome Dinner'] === 'Yes',
    afterParty: f['After Party'] === 'Yes',
    pizzaParty: f['Pizza Party'] === 'Yes',
    stayCategory: f['Stay Category'] ?? null,
  });
}
