import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Table%201`;

    const response = await fetch(airtableUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              "First Name": data.firstName || "",
              "Last Name": data.lastName || "",
              "Email": data.email || "",
              "Attending": data.attending || "Regretfully No",
              "Plus One": data.plusOne || "No",
              "Plus One Name": data.plusOneName || "",
              "Dietary Restrictions": data.dietaryRestrictions || "No",
              "Diet Detail": data.dietDetail || ""
            }
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save to Airtable');
    }

    return NextResponse.json({ success: true, message: 'RSVP confirmed' });
  } catch (error) {
    console.error('Airtable Error:', error);
    return NextResponse.json({ success: false, message: 'Error processing RSVP' }, { status: 500 });
  }
}