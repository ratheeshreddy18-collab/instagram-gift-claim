# Little Surprise — Instagram Gift Claim

A responsive React + Vite starter UI with Supabase Auth OTP, a gift request form, and a private admin dashboard.

## Included
- Dark premium UI with purple/pink gradients and reduced-motion support.
- Likes: 100 / 500 / 1,000. Views: 1K / 5K / 10K.
- Followers marked unavailable with a friendly notice.
- Email OTP or phone/SMS OTP through Supabase Auth.
- Database-backed claim requests with a unique constraint enforcing one claim per verified Supabase user.
- Owner dashboard with filters, status updates, deletion, and CSV export.
- Row Level Security policies in `supabase/schema.sql`.

## 1. Install and run locally
Requires Node.js 18+.

```bash
npm install
cp .env.example .env
npm run dev
```

Open the local URL printed by Vite.

## 2. Configure Supabase
1. Create a Supabase project.
2. In **Project Settings → API**, copy the Project URL and publishable/anon key into `.env`.
3. Set `VITE_INSTAGRAM_URL` to your real Instagram profile URL.
4. In the Supabase SQL Editor, run `supabase/schema.sql`.
5. In **Authentication → Providers**, enable Email and Phone. Configure an SMTP provider for reliable email delivery and a supported SMS provider for phone OTP. Phone verification may incur provider costs.
6. Review OTP expiry, resend limits, CAPTCHA/abuse controls, email templates, and allowed redirect URLs in Supabase Auth settings.
7. Restart `npm run dev` after editing `.env`.

The website deliberately does not fake OTPs. Until Supabase is configured, the login screen explains that setup is required and does not send or accept pretend codes.

## 3. Give the owner admin access
The admin dashboard is visible only when the signed-in user's JWT has `app_metadata.role = "admin"`. Set this using a trusted admin method in Supabase (for example, a secured server-side script using the service-role key, or a supported admin workflow). Do **not** put the service-role key in `.env` variables prefixed with `VITE_`, browser code, or any public repository.

After changing app metadata, sign out and sign back in so the new JWT contains the role. Regular users cannot self-assign `app_metadata` through the client SDK.

## 4. Deploy
Deploy the Vite app to a static host (e.g. Vercel, Netlify, or Cloudflare Pages). Set the same three `VITE_` environment variables in the hosting dashboard and configure the production redirect URL in Supabase Auth.

## Important production checks
- The unique `user_id` database constraint enforces one claim per authenticated Supabase account. It does not prove one human cannot create multiple accounts. If stronger abuse prevention is needed, add risk checks/server-side controls without collecting unnecessary personal data.
- The follow question is a self-reported answer; it is not verified automatically.
- The admin page requires the `admin` app-metadata role and database RLS. Hiding the button is not the security boundary.
- CSV export includes contact details and messages. Keep exported files private and delete them when no longer needed.
- Test email and phone OTP delivery, admin permissions, RLS policies, duplicate claim rejection, and CSV export before launching publicly.
- This starter is not a guarantee that Instagram engagement delivery is available or permitted. Confirm your actual offer, fulfilment method, and platform rules before promising Likes/Views.
