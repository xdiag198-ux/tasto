# Подключение пользователей и чатов (Supabase)

1. **База.** В Supabase → SQL Editor выполните `supabase/tosto_schema.sql` целиком.
   Скрипт удаляет старые таблицы posts/chats/messages (тестовые данные) и создаёт
   profiles, chats, chat_members, messages, posts, post_likes, post_comments,
   RLS-политики, функции `create_direct_chat` / `create_group_chat` и Realtime.
2. **Google-вход.** Supabase → Authentication → Providers → Google → Enable.
   Client ID и Secret берутся в Google Cloud Console (APIs & Services → Credentials →
   OAuth client ID, тип Web application). В Authorized redirect URIs в Google укажите
   `https://<project-ref>.supabase.co/auth/v1/callback`.
3. **Redirect URLs.** Supabase → Authentication → URL Configuration: в Site URL и
   Redirect URLs добавьте адрес, где запущено приложение
   (`http://localhost:3000` или `http://localhost:5173` для разработки + боевой домен).
4. **Ключи.** В `.env` должны быть `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY`
   (и `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` для SSR) от того проекта, где выполнен SQL.
   `service_role`-ключ в клиентский код не добавлять.
5. **Проверка.** `npm i && npm run dev`, войти двумя разными Google-аккаунтами в двух
   браузерах, найти друг друга через «Новый чат», написать сообщение, создать группу,
   оставить комментарий к посту.

Примечание: файл `src/integrations/supabase/types.ts` обновлён вручную под новую схему.
После изменений схемы его можно перегенерировать:
`npx supabase gen types typescript --project-id <project-ref> > src/integrations/supabase/types.ts`
