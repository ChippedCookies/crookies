type SignupState = 'idle' | 'pending' | 'success' | 'error';

class SignupRequestError extends Error {
  constructor(readonly status: number) {
    super(`Waitlist endpoint responded with ${status}`);
  }
}

const MESSAGES: Record<SignupState, string> = {
  idle: '',
  pending: 'Adding you…',
  success: "You're on the list. We'll email you when the AI tools drop.",
  error: "That didn't go through. Try again in a moment.",
};

const form = document.querySelector<HTMLFormElement>('[data-signup-form]');

if (form) {
  const status = form.querySelector<HTMLElement>('[data-signup-status]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  const setState = (state: SignupState): void => {
    form.dataset.state = state;
    if (status) status.textContent = MESSAGES[state];
    if (submit) submit.disabled = state === 'pending';
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setState('pending');
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new SignupRequestError(response.status);
      form.reset();
      setState('success');
    } catch (error) {
      if (error instanceof SignupRequestError) console.error(error.message);
      else console.error('Waitlist signup failed', error);
      setState('error');
    }
  });
}

export {};
