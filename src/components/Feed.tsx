import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Heart, MessageCircle, Trash2, RefreshCw, Loader2, SendHorizontal } from "lucide-react";
import type { Post, PostComment, Profile } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getProfile } from "@/lib/profiles";
import { UserAvatar } from "./UserAvatar";

function countLabel(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "К";
  return String(n);
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return Math.floor(diff / 60) + " мин";
  if (diff < 86400) return Math.floor(diff / 3600) + " ч";
  return Math.floor(diff / 86400) + " д";
}

type PostRow = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles: Profile | null;
  post_likes: { count: number }[] | null;
  post_comments: { count: number }[] | null;
};

type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles: Profile | null;
};

/* ───────────── Комментарии ───────────── */

function Comments({
  postId,
  onCount,
}: {
  postId: string;
  onCount: (n: number) => void;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("post_comments")
      .select("id, post_id, author_id, body, created_at, profiles!author_id(id, display_name, handle, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        const rows = (data ?? []) as unknown as CommentRow[];
        setComments(rows.map(({ profiles, ...c }) => ({ ...c, author: profiles })));
      });

    const channel = supabase
      .channel(`comments-${postId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` },
        async (payload) => {
          const row = payload.new as Omit<PostComment, "author">;
          const author = await getProfile(row.author_id);
          if (!active) return;
          setComments((prev) =>
            !prev || prev.some((c) => c.id === row.id) ? prev : [...prev, { ...row, author }],
          );
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [postId]);

  useEffect(() => {
    if (comments) onCount(comments.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments]);

  async function submit() {
    const body = text.trim();
    if (!body || !user) return;
    setBusy(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, author_id: user.id, body })
      .select("id, post_id, author_id, body, created_at")
      .single();
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    const author = await getProfile(user.id);
    const row = data as Omit<PostComment, "author">;
    setText("");
    setComments((prev) =>
      prev && prev.some((c) => c.id === row.id) ? prev : [...(prev ?? []), { ...row, author }],
    );
  }

  async function remove(id: string) {
    const { error: delError } = await supabase.from("post_comments").delete().eq("id", id);
    if (!delError) setComments((prev) => prev?.filter((c) => c.id !== id) ?? prev);
  }

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {comments === null ? (
        <div className="flex justify-center py-3 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <UserAvatar
              name={c.author?.display_name ?? "?"}
              url={c.author?.avatar_url}
              size="w-8 h-8"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-foreground truncate">
                  {c.author?.display_name ?? "Пользователь"}
                </span>
                <span className="text-muted-foreground/60">·</span>
                <span className="text-muted-foreground">{timeAgo(c.created_at)}</span>
                {c.author_id === user?.id && (
                  <button
                    type="button"
                    aria-label="Удалить комментарий"
                    onClick={() => remove(c.id)}
                    className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm text-foreground/95 whitespace-pre-line break-words">{c.body}</p>
            </div>
          </div>
        ))
      )}

      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 1000))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Написать комментарий…"
          className="flex-1 px-3.5 py-2 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-pulse/50 focus:ring-2 focus:ring-pulse/15 transition"
        />
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={submit}
          disabled={!text.trim() || busy}
          aria-label="Отправить комментарий"
          className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed shrink-0"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
        </motion.button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ───────────── Карточка поста ───────────── */

function PostCard({
  post,
  index,
  meId,
  onLike,
  onDelete,
  onCommentCount,
}: {
  post: Post;
  index: number;
  meId: string;
  onLike: (post: Post) => void;
  onDelete: (post: Post) => void;
  onCommentCount: (postId: string, count: number) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const name = post.author?.display_name ?? "Пользователь";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{
        delay: Math.min(index * 0.045, 0.3),
        type: "spring",
        stiffness: 180,
        damping: 22,
      }}
      className="px-5 py-4 border-b border-border hover:bg-surface-1/60 transition-colors"
    >
      <div className="flex gap-3">
        <UserAvatar name={name} url={post.author?.avatar_url} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold text-foreground truncate">{name}</span>
            {post.author && <span className="text-muted-foreground truncate">@{post.author.handle}</span>}
            <span className="text-muted-foreground/50">·</span>
            <span className="text-muted-foreground text-xs">{timeAgo(post.created_at)}</span>
            {post.author_id === meId && (
              <button
                type="button"
                aria-label="Удалить пост"
                onClick={() => onDelete(post)}
                className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="mt-1.5 text-[15px] leading-relaxed text-foreground/95 whitespace-pre-line break-words">
            {post.body}
          </p>

          <div className="mt-3 flex items-center gap-6 text-muted-foreground">
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => setShowComments((v) => !v)}
              className={`flex items-center gap-1.5 group transition-colors ${
                showComments ? "text-foreground" : "hover:text-foreground"
              }`}
            >
              <span className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-surface-2 transition-colors">
                <MessageCircle className="w-[17px] h-[17px]" />
              </span>
              <span className="text-xs tabular-nums">{countLabel(post.comment_count)}</span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.86 }}
              onClick={() => onLike(post)}
              className={`relative flex items-center gap-1.5 group transition-colors ${
                post.liked_by_me ? "text-rose-pulse" : "hover:text-rose-pulse"
              }`}
            >
              <span className="relative w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-rose-pulse/10 transition-colors">
                <motion.span
                  key={post.liked_by_me ? "liked" : "unliked"}
                  initial={{ scale: 0.55 }}
                  animate={{ scale: [0.55, 1.32, 1] }}
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Heart className={`w-[17px] h-[17px] ${post.liked_by_me ? "fill-current" : ""}`} />
                </motion.span>
              </span>
              <span className="text-xs tabular-nums">{countLabel(post.like_count)}</span>
            </motion.button>
          </div>

          {showComments && (
            <Comments postId={post.id} onCount={(n) => onCommentCount(post.id, n)} />
          )}
        </div>
      </div>
    </motion.article>
  );
}

/* ───────────── Лента ───────────── */

export function Feed() {
  const { user } = useAuth();
  const meId = user?.id ?? "";
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!meId) return;
    setError(null);
    const [postsRes, likesRes] = await Promise.all([
      supabase
        .from("posts")
        .select(
          "id, author_id, body, created_at, profiles!author_id(id, display_name, handle, avatar_url), post_likes(count), post_comments(count)",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("post_likes").select("post_id").eq("user_id", meId),
    ]);
    if (postsRes.error) {
      setError(postsRes.error.message);
      setLoading(false);
      return;
    }
    const liked = new Set((likesRes.data ?? []).map((l) => l.post_id));
    const rows = (postsRes.data ?? []) as unknown as PostRow[];
    setPosts(
      rows.map((r) => ({
        id: r.id,
        author_id: r.author_id,
        body: r.body,
        created_at: r.created_at,
        author: r.profiles,
        like_count: r.post_likes?.[0]?.count ?? 0,
        comment_count: r.post_comments?.[0]?.count ?? 0,
        liked_by_me: liked.has(r.id),
      })),
    );
    setLoading(false);
  }, [meId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`posts-changes-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => load())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setPosts((prev) => prev.filter((p) => p.id !== id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function toggleLike(post: Post) {
    if (!meId) return;
    const wasLiked = post.liked_by_me;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, liked_by_me: !wasLiked, like_count: p.like_count + (wasLiked ? -1 : 1) }
          : p,
      ),
    );
    const res = wasLiked
      ? await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", meId)
      : await supabase.from("post_likes").insert({ post_id: post.id, user_id: meId });
    if (res.error) load();
  }

  async function deletePost(post: Post) {
    if (!window.confirm("Удалить пост?")) return;
    const { error: delError } = await supabase.from("posts").delete().eq("id", post.id);
    if (!delError) setPosts((prev) => prev.filter((p) => p.id !== post.id));
  }

  const setCommentCount = useCallback((postId: string, count: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId && p.comment_count !== count ? { ...p, comment_count: count } : p)),
    );
  }, []);

  return (
    <div className="flex-1 h-full overflow-y-auto">
      <div className="sticky top-0 z-10 noir-glass border-b border-border">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">Лента</h2>
          <motion.button
            type="button"
            whileHover={{ rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.35 }}
            onClick={load}
            aria-label="Обновить"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      <div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-destructive text-sm px-4">
            Не удалось загрузить ленту. {error}
          </div>
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-20 text-center px-6"
          >
            <p className="text-foreground text-base font-medium mb-1.5">Здесь пока пусто</p>
            <p className="text-muted-foreground text-sm">
              Создайте первый пост — он сразу появится в ленте у всех.
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {posts.map((p, i) => (
              <PostCard
                key={p.id}
                post={p}
                index={i}
                meId={meId}
                onLike={toggleLike}
                onDelete={deletePost}
                onCommentCount={setCommentCount}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {!loading && posts.length > 0 && (
        <div className="py-10 text-center text-xs text-muted-foreground">Это всё на сегодня</div>
      )}
    </div>
  );
}
