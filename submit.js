const form = document.getElementById('submitForm');
const submitBtn = document.getElementById('submitBtn');
const successMsg = document.getElementById('successMsg');
const errorMsg = document.getElementById('errorMsg');

function showFieldError(id, msg) {
  const errorEl = document.getElementById(id + '-error');
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.classList.add('show');
  }
  const input = document.getElementById(id);
  if (input) input.classList.add('invalid');
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('show');
  });
  document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
}

function validate() {
  let valid = true;

  ['title', 'description', 'date', 'time', 'location', 'link', 'submitter_email'].forEach(id => {
    if (!document.getElementById(id).value.trim()) {
      showFieldError(id, 'Please fill this in');
      valid = false;
    }
  });

  if (!document.querySelector('input[name="free"]:checked')) {
    showFieldError('free', 'Please select one');
    valid = false;
  }
  if (!document.querySelector('input[name="signup"]:checked')) {
    showFieldError('signup', 'Please select one');
    valid = false;
  }

  return valid;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  clearErrors();
  successMsg.classList.remove('show');
  errorMsg.classList.remove('show');

  if (!validate()) return;

  const formData = {
    title: document.getElementById('title').value.trim(),
    date: document.getElementById('date').value,
    time: document.getElementById('time').value,
    end_time: document.getElementById('end_time').value,
    description: document.getElementById('description').value.trim(),
    location: document.getElementById('location').value.trim(),
    link: document.getElementById('link').value.trim(),
    free: document.querySelector('input[name="free"]:checked').value === 'yes' ? 'Kyllä' : 'Ei',
    signup_required: document.querySelector('input[name="signup"]:checked').value === 'yes' ? 'Kyllä' : 'Ei',
    submitter_email: document.getElementById('submitter_email').value.trim()
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  try {
    const response = await fetch('/.netlify/functions/submit-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (response.ok) {
      successMsg.textContent = `✓ Thanks for the submission! We'll check it and contact ${formData.submitter_email} in case of a problem.`;
      successMsg.classList.add('show');
      form.reset();
      successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      throw new Error(result.error || 'something went wrong');
    }
  } catch (error) {
    console.error('Submission error:', error);
    errorMsg.textContent = 'Unsuccessful🙁 Try again or contact hiddenhelfi@gmail.com';
    errorMsg.classList.add('show');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit event';
  }
});
