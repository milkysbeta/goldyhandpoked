/* ---------------------------------------------------------------
   Site configuration.

   The enquiry form is delivered by FormSubmit (formsubmit.co) — no
   account and no API key. Enquiries are emailed to enquiryEmail.

   ACTIVATION (one time): the first submission triggers a confirmation
   email to enquiryEmail — open it and click "Activate Form". After that
   every enquiry is delivered automatically.

   Optional, to hide the address from the page source: after activating,
   FormSubmit emails a random alias endpoint like
   https://formsubmit.co/ajax/abcd1234… — paste it into formEndpoint to
   replace the plain-email endpoint below.

   The auto-reply sent back to the enquirer lives in src/js/form.js
   (the `_autoresponse` field).
--------------------------------------------------------------- */

export const CONFIG = {
  enquiryEmail: 'handpoked.ttt@gmail.com',
  formEndpoint: 'https://formsubmit.co/ajax/handpoked.ttt@gmail.com',
  instagram: 'https://www.instagram.com/goldy_handpoked/',
};
