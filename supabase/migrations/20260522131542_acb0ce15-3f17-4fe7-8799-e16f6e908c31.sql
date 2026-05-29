
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  guest_token text,
  status text not null default 'open' check (status in ('open','handoff','closed')),
  subject text,
  assigned_admin_id uuid references auth.users(id) on delete set null,
  last_message_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists chat_conv_user_idx on public.chat_conversations(user_id);
create index if not exists chat_conv_token_idx on public.chat_conversations(guest_token);
create index if not exists chat_conv_status_idx on public.chat_conversations(status, last_message_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','admin','system')),
  content text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists chat_msg_conv_idx on public.chat_messages(conversation_id, created_at);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

create policy "anyone can create chat conversation"
  on public.chat_conversations for insert
  with check (true);

create policy "owner can read own conversation"
  on public.chat_conversations for select
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or private.has_role(auth.uid(), 'admin'::app_role)
  );

create policy "owner can update own conversation"
  on public.chat_conversations for update
  using (
    (auth.uid() is not null and auth.uid() = user_id)
    or private.has_role(auth.uid(), 'admin'::app_role)
  );

create policy "owner can read own messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_conversations c
      where c.id = conversation_id
        and (c.user_id = auth.uid() or private.has_role(auth.uid(), 'admin'::app_role))
    )
  );

create policy "owner can insert own messages"
  on public.chat_messages for insert
  with check (
    exists (
      select 1 from public.chat_conversations c
      where c.id = conversation_id
        and (c.user_id = auth.uid() or private.has_role(auth.uid(), 'admin'::app_role))
    )
  );

alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.chat_conversations;
