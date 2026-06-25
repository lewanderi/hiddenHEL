const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

const categories = [
  'Music',
  'Culture',
  'Workshop',
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
      .is('category', null)
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
      const prompt = `Categorize this event. Choose 1 or 2 categories from the list below that best fit it.

Event: "${event.title}"
Description: "${event.description || ''}"
Location: "${event.location_name || ''}"

Categories: ${categories.join(', ')}

Respond with ONLY a JSON array, like: ["Music"] or ["Food & Drinks", "Culture"]. No other text.`;

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
      let parsed;
      try {
        parsed = JSON.parse(data.content[0].text.trim());
      } catch {
        parsed = [data.content[0].text.trim()];
      }
      const validCategories = parsed.filter(c => categories.includes(c)).slice(0, 2);
      const finalCategories = validCategories.length > 0 ? validCategories : ['Other'];

      updates.push({
        id: event.id,
        category: finalCategories
      });

      console.log(`${event.title} → ${finalCategories.join(', ')}`);
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