import type { APIRoute } from 'astro';
import { createFormSubmission } from '../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;

  try {
    const formData = await request.formData();
    const formType = formData.get('form_type') as string;
    const redirect = formData.get('redirect') as string || '/';

    if (!formType) {
      return new Response('Missing form_type', { status: 400 });
    }

    // Collect all form fields except form_type and redirect
    const data: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (key !== 'form_type' && key !== 'redirect') {
        data[key] = value as string;
      }
    }

    await createFormSubmission(DB, formType, data);

    return Response.redirect(new URL(redirect, request.url), 303);
  } catch (err) {
    console.error('Form submission error:', err);
    return Response.redirect(new URL('/contact?error=1', request.url), 303);
  }
};
