export type Profile = {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  bio?: string | null;
};

export type ChatType = "direct" | "group";

export type ChatRow = {
  id: string;
  type: ChatType;
  name: string | null;
  created_by: string | null;
  created_at: string;
  last_message_at: string;
  last_message: string | null;
};

/** Чат вместе с участниками (профили), как его показывает UI. */
export type ChatItem = ChatRow & { members: Profile[] };

export type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: Profile | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
};

export type PostComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: Profile | null;
};
