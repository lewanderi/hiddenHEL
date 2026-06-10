const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

const categories = [
  'Music',
  'Culture',
  'Workshop',
  'Pop-up',
  'Food & Drinks',
  'Sports & Wellbeing',
  'Other'
];

exports.handler = async (event, context) => {
  try {
    // Fetch all uncategorized events
    const { data: events, error } = await supabase
      .from('events')
      .select('id, title, description, location_name')
      .or('category.is.null,category.eq.""')
      .limit(500);

    if (error) throw error;
    if (!events || events.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No uncategorized events found' })
      };
    }

    console.log(`Categorizing ${events.length} events...`);

    // Categorize each event
    const updates = [];
    for (const event of events) {
      const prompt = `Categorize this event. Choose ONE category only.

Event: "${event.title}"
Description: "${event.description || ''}"
Location: "${event.location_name || ''}"

Categories: ${categories.join(', ')}

Respond with ONLY the category name, nothing else.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-20250514',
          max_tokens: 50,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
      }

      const data = await response.json();
      const category = data.content[0].text.trim();

      // Validate category
      const validCategory = categories.includes(category) ? category : 'Other';

      updates.push({
        id: event.id,
        category: validCategory
      });

      console.log(`${event.title} → ${validCategory}`);
    }

    // Bulk update Supabase
    for (const update of updates) {
      await supabase
        .from('events')
        .update({ category: update.category })
        .eq('id', update.id);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        categorized: updates.length,
        updates
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};