-- Run in the Supabase SQL editor.
-- Admin access is controlled by auth.users.app_metadata.role = 'admin'.
-- Set this role only through the Supabase dashboard or a trusted server-side admin process.
create extension if not exists pgcrypto;

create table if not exists public.gift_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  verified_contact text not null,
  contact_type text not null check (contact_type in ('email', 'phone')),
  verification_status text not null default 'verified' check (verification_status = 'verified'),
  instagram_url text not null check (instagram_url ~* '^https?://(www\.)?instagram\.com/[A-Za-z0-9._]+/?(\?.*)?$'),
  follows_page boolean not null,
  category text not null check (category in ('Likes', 'Views')),
  package_key text not null check (package_key in ('likes_100','likes_500','likes_1000','views_1k','views_5k','views_10k')),
  optional_message text check (char_length(optional_message) <= 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected','fulfilled')),
  created_at timestamptz not null default now(),
  constraint one_gift_per_verified_user unique (user_id),
  constraint package_matches_category check (
    (category = 'Likes' and package_key like 'likes\_%' escape '\')
    or (category = 'Views' and package_key like 'views\_%' escape '\')
  )
);

alter table public.gift_claims enable row level security;

-- Authenticated users may submit their own claim; unique(user_id) enforces one claim per account.
create policy "Users can create their own single claim"
on public.gift_claims for insert to authenticated
with check (
  auth.uid() = user_id
  and verification_status = 'verified'
  and status = 'pending'
);

-- Users can view only their own claim. The admin can view all claims.
create policy "Users view own claim or admin views all"
on public.gift_claims for select to authenticated
using (
  auth.uid() = user_id
  or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Only admins can update statuses and records.
create policy "Only admin can update claims"
on public.gift_claims for update to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Only admin can delete claims"
on public.gift_claims for delete to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create index if not exists gift_claims_created_at_idx on public.gift_claims (created_at desc);
create index if not exists gift_claims_status_idx on public.gift_claims (status);

-- NOTE: No OTP values are stored in this table. Supabase Auth handles OTP verification.
-- Configure email templates, SMTP, SMS provider, phone OTP settings, and rate limits in Supabase Auth.
