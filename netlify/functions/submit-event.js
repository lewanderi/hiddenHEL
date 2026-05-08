const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the submission data
    const data = JSON.parse(event.body);

    // Validate required fields
    const required = ['title', 'date', 'time', 'description', 'location', 'link', 'free', 'signup_required', 'submitter_email'];
    for (const field of required) {
      if (!data[field] && data[field] !== false) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Missing required field: ${field}` })
        };
      }
    }

    // Initialize Google Sheets API with service account
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0]; // First sheet

    // Add row to sheet (matching internal Supabase format)
    await sheet.addRow({
      status: 'pending',
      title: data.title,
      date: data.date,
      time: data.time,
      end_time: data.end_time || '',
      description: data.description,
      location_name: data.location,
      link: data.link,
      lat: '',
      lng: '',
      is_free: data.free,
      signup_required: data.signup_required,
      timestamp: new Date().toISOString(),
      submitter_email: data.submitter_email
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Event submitted successfully!' })
    };

  } catch (error) {
    console.error('Error submitting to Google Sheets:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to submit event. Please try again.' })
    };
  }
};
