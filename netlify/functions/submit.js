const form = document.getElementById('submitForm');
const submitBtn = document.getElementById('submitBtn');
const successMsg = document.getElementById('successMsg');
const errorMsg = document.getElementById('errorMsg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Hide previous messages
  successMsg.classList.remove('show');
  errorMsg.classList.remove('show');

  // Get form data
  const formData = {
    title: document.getElementById('title').value.trim(),
    date: document.getElementById('date').value,
    time: document.getElementById('time').value,
    end_time: document.getElementById('end_time').value,
    description: document.getElementById('description').value.trim(),
    location: document.getElementById('location').value.trim(),
    link: document.getElementById('link').value.trim(),
    free: document.querySelector('input[name="free"]:checked')?.value === 'yes' ? 'Yes' : 'No',
    signup_required: document.querySelector('input[name="signup"]:checked')?.value === 'yes' ? 'Yes' : 'No',
    submitter_email: document.getElementById('submitter_email').value.trim()
  };

  // Disable submit button
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    const response = await fetch('/.netlify/functions/submit-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (response.ok) {
      // Success
      successMsg.textContent = `✓ Thanks for your submission! We'll review it and get back to you at ${formData.submitter_email}.`;
      successMsg.classList.add('show');
      
      // Reset form
      form.reset();

      // Scroll to success message
      successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      throw new Error(result.error || 'Something went wrong');
    }
  } catch (error) {
    console.error('Submission error:', error);
    errorMsg.textContent = 'Failed to submit event. Please try again.';
    errorMsg.classList.add('show');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit event';
  }
});
