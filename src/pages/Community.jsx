import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useGarage } from "../context/GarageContext";
import { isUserAdmin, isRealAdmin } from "../utils/adminAuth";
import communityService from "../services/CommunityService";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Search,
  Plus,
  X,
  Send,
  MoreVertical,
  Sparkles,
  Lock,
  CheckCircle2,
  Camera,
  Car,
  Users,
} from "lucide-react";

export default function Community() {
  const { currentUser, user, vehicles } = useGarage();
  const isAdmin = isUserAdmin(currentUser) || isRealAdmin(currentUser);

  const [activeTab, setActiveTab] = useState("for_you"); // 'for_you' | 'following' | 'my_posts'
  const [posts, setPosts] = useState(() => communityService.getPosts());
  const [likes, setLikes] = useState(() => communityService.getLikes());
  const [saved, setSaved] = useState(() => communityService.getSaved());
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Non-admin waitlist status
  const userEmail = currentUser?.email || user?.email || "";
  const [isWaitlisted, setIsWaitlisted] = useState(() =>
    communityService.isWaitlisted(userEmail)
  );

  // Create post modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCaption, setNewCaption] = useState("");
  const [newImage, setNewImage] = useState("");
  const [newVehicleTag, setNewVehicleTag] = useState(
    vehicles[0]?.model ? `${vehicles[0].make} ${vehicles[0].model}` : "Daily Driver"
  );
  const [creatingPost, setCreatingPost] = useState(false);

  // Comments drawer state
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [commentText, setCommentText] = useState("");

  const refreshPosts = () => {
    setPosts(communityService.getPosts());
    setLikes(communityService.getLikes());
    setSaved(communityService.getSaved());
  };

  useEffect(() => {
    window.addEventListener("community_posts_updated", refreshPosts);
    return () => window.removeEventListener("community_posts_updated", refreshPosts);
  }, []);

  const handleToggleLike = (postId) => {
    communityService.toggleLike(postId);
    setLikes(communityService.getLikes());
    setPosts(communityService.getPosts());
  };

  const handleToggleSave = (postId) => {
    communityService.toggleSave(postId);
    setSaved(communityService.getSaved());
  };

  const handleJoinWaitlist = () => {
    communityService.joinWaitlist(userEmail);
    setIsWaitlisted(true);
  };

  const handleCreatePost = (e) => {
    e.preventDefault();
    if (!newCaption.trim()) return;

    setCreatingPost(true);
    const authorName =
      currentUser?.user_metadata?.display_name || user?.name || "Enthusiast";
    const authorAvatar =
      user?.avatar_url ||
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80";

    const defaultImages = [
      "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80",
    ];

    const imageToUse =
      newImage.trim() ||
      defaultImages[Math.floor(Math.random() * defaultImages.length)];

    communityService.createPost({
      authorName,
      authorAvatar,
      image: imageToUse,
      caption: newCaption.trim(),
      vehicleName: newVehicleTag,
    });

    setCreatingPost(false);
    setShowCreateModal(false);
    setNewCaption("");
    setNewImage("");
    refreshPosts();
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentText.trim() || !activeCommentPost) return;

    const authorName =
      currentUser?.user_metadata?.display_name || user?.name || "Member";

    communityService.addComment(activeCommentPost.id, authorName, commentText);
    setCommentText("");
    // Update local modal data
    const updatedPost = communityService.getPosts().find((p) => p.id === activeCommentPost.id);
    if (updatedPost) setActiveCommentPost(updatedPost);
    refreshPosts();
  };

  // Filter posts
  const filteredPosts = posts.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (p.caption + p.author.name + (p.vehicle || "")).toLowerCase();
      if (!matchText.includes(q)) return false;
    }

    if (activeTab === "my_posts") {
      const currentName = (currentUser?.user_metadata?.display_name || user?.name || "").toLowerCase();
      return p.author.name.toLowerCase() === currentName || p.author.handle.includes("admin");
    }

    return true;
  });

  return (
    <div className="app-container community-page" style={{ paddingTop: 4, paddingBottom: 60 }}>
      {/* ── Top Header ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 900,
            margin: 0,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          Community
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setShowSearch((s) => !s)}
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            aria-label="Search posts"
          >
            <Search size={18} />
          </button>

          {/* Create Post Button */}
          <button
            onClick={() => {
              if (isAdmin) {
                setShowCreateModal(true);
              } else {
                handleJoinWaitlist();
              }
            }}
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "var(--accent-color, #ff4d00)",
              color: "#fff",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(255, 77, 0, 0.35)",
            }}
            title={isAdmin ? "Create Post" : "Coming Soon"}
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Search Input (Collapsible) ────────────────────────── */}
      {showSearch && (
        <div style={{ marginBottom: 14 }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search tags, topics, cars, riders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              fontSize: "0.84rem",
              height: 40,
              borderRadius: 12,
              padding: "0 14px",
            }}
            autoFocus
          />
        </div>
      )}

      {/* ── Filter Pills: For You | Following | My Posts ──────── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          overflowX: "auto",
          paddingBottom: 2,
        }}
      >
        {[
          { key: "for_you", label: "For You" },
          { key: "following", label: "Following" },
          { key: "my_posts", label: "My Posts" },
        ].map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: "6px 16px",
                borderRadius: 20,
                fontSize: "0.82rem",
                fontWeight: isActive ? 700 : 500,
                border: isActive
                  ? "1.5px solid var(--accent-color, #ff4d00)"
                  : "1px solid var(--border-color)",
                background: isActive
                  ? "var(--accent-light, rgba(255, 77, 0, 0.08))"
                  : "var(--bg-card)",
                color: isActive
                  ? "var(--accent-color, #ff4d00)"
                  : "var(--text-secondary)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Admin / Beta Banner ───────────────────────────────── */}
      {!isAdmin ? (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(255,77,0,0.08) 0%, rgba(245,158,11,0.05) 100%)",
            border: "1px solid var(--accent-border, rgba(255,77,0,0.25))",
            borderRadius: 16,
            padding: "16px 18px",
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Sparkles size={16} color="var(--accent-color)" />
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 800,
                color: "var(--accent-color)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Early Access Preview · Coming Soon
            </span>
          </div>
          <h3
            style={{
              fontSize: "1.05rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: "0 0 6px",
            }}
          >
            A Social Garage for People Who Care
          </h3>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              lineHeight: 1.45,
              margin: "0 0 12px",
            }}
          >
            Real people. Real vehicles. Real stories. Explore the beta preview
            below while we prepare full member posting!
          </p>

          <button
            onClick={handleJoinWaitlist}
            disabled={isWaitlisted}
            style={{
              background: isWaitlisted
                ? "var(--success-color, #10B981)"
                : "var(--accent-color, #ff4d00)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "7px 16px",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: isWaitlisted ? "default" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {isWaitlisted ? (
              <>
                <CheckCircle2 size={14} /> You're on the early access list!
              </>
            ) : (
              <>
                <Sparkles size={14} /> Notify Me When Live
              </>
            )}
          </button>
        </div>
      ) : (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            borderRadius: 12,
            padding: "8px 14px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "0.76rem",
              fontWeight: 700,
              color: "var(--success-color, #10B981)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CheckCircle2 size={14} /> Admin Mode: Full Social Posting Active
          </span>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: "var(--accent-color)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: "0.72rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Create Post
          </button>
        </div>
      )}

      {/* ── Community Posts Feed ──────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {filteredPosts.length === 0 ? (
          <div
            className="garage-card"
            style={{
              textAlign: "center",
              padding: "36px 20px",
              color: "var(--text-muted)",
            }}
          >
            <Users size={32} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
            <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 6px" }}>
              No posts found
            </h4>
            <p style={{ fontSize: "0.8rem", margin: 0 }}>
              Be the first to share a vehicle story!
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isLiked = Boolean(likes[post.id]);
            const isSaved = Boolean(saved[post.id]);

            return (
              <div
                key={post.id}
                className="garage-card"
                style={{
                  padding: 0,
                  borderRadius: 20,
                  overflow: "hidden",
                  border: "1px solid var(--border-color)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                }}
              >
                {/* Post Author Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img
                      src={post.author.avatar}
                      alt={post.author.name}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "1px solid var(--border-color)",
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: "0.88rem",
                          fontWeight: 800,
                          color: "var(--text-primary)",
                          lineHeight: 1.2,
                        }}
                      >
                        {post.author.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
                        {post.timeAgo} {post.vehicle ? `· ${post.vehicle}` : ""}
                      </div>
                    </div>
                  </div>

                  <button
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: 4,
                    }}
                    aria-label="Post options"
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>

                {/* Post Image */}
                {post.image && (
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "16 / 10",
                      background: "#000",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={post.image}
                      alt="Community vehicle post"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                )}

                {/* Post Caption */}
                <div style={{ padding: "12px 16px 8px" }}>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                      lineHeight: 1.5,
                      margin: 0,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {post.caption}
                  </p>
                </div>

                {/* Interaction Footer: Likes, Comments, Share, Save */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 16px 14px",
                    borderTop: "1px solid rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {/* Like button */}
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: isLiked ? "#EF4444" : "var(--text-secondary)",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        padding: 0,
                      }}
                    >
                      <Heart
                        size={18}
                        fill={isLiked ? "#EF4444" : "none"}
                        color={isLiked ? "#EF4444" : "currentColor"}
                      />
                      <span>{post.likesCount}</span>
                    </button>

                    {/* Comment button */}
                    <button
                      onClick={() => setActiveCommentPost(post)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: "var(--text-secondary)",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        padding: 0,
                      }}
                    >
                      <MessageCircle size={18} />
                      <span>{post.commentsCount || (post.comments || []).length}</span>
                    </button>
                  </div>

                  {/* Bookmark button */}
                  <button
                    onClick={() => handleToggleSave(post.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: isSaved
                        ? "var(--accent-color, #ff4d00)"
                        : "var(--text-secondary)",
                      padding: 0,
                    }}
                    aria-label="Save post"
                  >
                    <Bookmark
                      size={18}
                      fill={isSaved ? "var(--accent-color, #ff4d00)" : "none"}
                    />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── CREATE POST MODAL (Admin Only) ───────────────────── */}
      {showCreateModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowCreateModal(false)}
          style={{ zIndex: 1200 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 440, padding: "20px 22px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
                Create Community Post
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePost}>
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Vehicle Tag
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={newVehicleTag}
                  onChange={(e) => setNewVehicleTag(e.target.value)}
                  placeholder="e.g. Honda Civic, Pulsar 220"
                  style={{ fontSize: "0.84rem", borderRadius: 8 }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Photo URL
                </label>
                <input
                  type="url"
                  className="form-control"
                  value={newImage}
                  onChange={(e) => setNewImage(e.target.value)}
                  placeholder="https://... (leave blank for sample vehicle photo)"
                  style={{ fontSize: "0.84rem", borderRadius: 8 }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Caption & Hashtags
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder="Share maintenance tips, modification updates, or your road trip story..."
                  style={{ fontSize: "0.84rem", borderRadius: 8 }}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPost}
                  className="btn-orange"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  {creatingPost ? "Publishing..." : "Publish Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── COMMENTS DRAWER / MODAL ──────────────────────────── */}
      {activeCommentPost && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveCommentPost(null)}
          style={{ zIndex: 1200 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 420,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              padding: "18px 20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
                flexShrink: 0,
              }}
            >
              <h4 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 800 }}>
                Comments ({activeCommentPost.comments?.length || 0})
              </h4>
              <button
                onClick={() => setActiveCommentPost(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable comments list */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                paddingRight: 4,
                marginBottom: 14,
              }}
            >
              {(activeCommentPost.comments || []).length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: "0.8rem",
                    padding: "24px 0",
                  }}
                >
                  No comments yet. Start the conversation!
                </div>
              ) : (
                activeCommentPost.comments.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: "var(--bg-page)",
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                        }}
                      >
                        {c.author}
                      </span>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                        {c.timeAgo}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.4,
                      }}
                    >
                      {c.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* New comment input */}
            <form onSubmit={handleAddComment} style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                style={{ fontSize: "0.82rem", borderRadius: 10 }}
              />
              <button
                type="submit"
                className="btn-orange"
                style={{
                  padding: "0 14px",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
