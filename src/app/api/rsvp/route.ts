import { NextResponse } from 'next/server';

const TABLE = 'Guests';

function buildFields(data: Record<string, string>) {
  return {
    'First Name': data.firstName ?? '',
    'Last Name': data.lastName ?? '',
    'Email': data.email ?? '',
    'Attending': data.attending ?? 'Regretfully No',
    'Plus One': data.plusOne ?? 'No',
    'Plus One Name': data.plusOneName ?? '',
    'Dietary Restrictions': data.dietaryRestrictions ?? 'No',
    'Diet Detail': data.dietDetail ?? '',
  };
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const baseUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${TABLE}`;
    const headers = {
      Authorization: `Bearer ${process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    };

    let response: Response;

    if (data.recordId) {
      response = await fetch(`${baseUrl}/${encodeURIComponent(data.recordId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: buildFields(data) }),
      });
    } else {
      response = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ records: [{ fields: buildFields(data) }] }),
      });
    }

    if (!response.ok) {
      const err = await response.text();
      console.error('Airtable error:', err);
      throw new Error('Airtable request failed');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('RSVP error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
