/**
 * CommunityService — Manages social media community posts, likes, comments & bookmarks.
 * LocalStorage persistence with seed posts matching the NGINEBREAK design mockup.
 */

const STORAGE_KEY_POSTS = "nginebreak_community_posts";
const STORAGE_KEY_LIKES = "nginebreak_community_likes";
const STORAGE_KEY_SAVED = "nginebreak_community_saved";
const STORAGE_KEY_WAITLIST = "nginebreak_community_waitlist";

const SEED_POSTS = [
  {
    id: "post-1",
    author: {
      name: "Anjana S",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      handle: "@anjana_s",
    },
    vehicle: "Yamaha MT-15",
    timeAgo: "1 day ago",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    image: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1000&q=80",
    caption: "Weekend ride with the crew! Always better together. 🏍️❤️\n#Ride #KeralaDiaries #NGINEBREAK",
    likesCount: 128,
    commentsCount: 12,
    comments: [
      { id: "c1", author: "Karthik R", text: "Stunning view! Where was this shot taken?", timeAgo: "18h ago" },
      { id: "c2", author: "Anjana S", text: "Near Vagamon route, sunrise was pure magic!", timeAgo: "15h ago" },
    ],
  },
  {
    id: "post-2",
    author: {
      name: "Rohit K",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      handle: "@rohit_k",
    },
    vehicle: "Honda Elevate",
    timeAgo: "2 hours ago",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80",
    caption: "Fresh oil change ✅ Ready for more miles! 🚗\n#CarCare #FreshOil #RoadTripReady #NGINEBREAK",
    likesCount: 142,
    commentsCount: 18,
    comments: [
      { id: "c3", author: "Suresh P", text: "Which engine oil did you go with?", timeAgo: "1h ago" },
      { id: "c4", author: "Rohit K", text: "0W-20 fully synthetic, super smooth now!", timeAgo: "30m ago" },
    ],
  },
  {
    id: "post-3",
    author: {
      name: "Vishnu R",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
      handle: "@vishnu_r",
    },
    vehicle: "BMW 3 Series",
    timeAgo: "2 days ago",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
    caption: "Small service today. Small steps, longer journeys. 🔧\n#Service #CarCare #KeepItRunning",
    likesCount: 96,
    commentsCount: 8,
    comments: [
      { id: "c5", author: "Adarsh M", text: "Clean machine! Headlights look pristine.", timeAgo: "1d ago" },
    ],
  },
];

class CommunityService {
  getPosts() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_POSTS);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(SEED_POSTS));
        return SEED_POSTS;
      }
      return JSON.parse(stored);
    } catch (_) {
      return SEED_POSTS;
    }
  }

  getLikes() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_LIKES) || "{}");
    } catch {
      return {};
    }
  }

  getSaved() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_SAVED) || "{}");
    } catch {
      return {};
    }
  }

  isLiked(postId) {
    if (!postId) return false;
    const likes = this.getLikes();
    if (Array.isArray(likes)) return likes.includes(postId);
    return Boolean(likes && likes[postId]);
  }

  isSaved(postId) {
    if (!postId) return false;
    const saved = this.getSaved();
    if (Array.isArray(saved)) return saved.includes(postId);
    return Boolean(saved && saved[postId]);
  }

  toggleLike(postId) {
    const likes = this.getLikes();
    const isLiked = !likes[postId];
    if (isLiked) {
      likes[postId] = true;
    } else {
      delete likes[postId];
    }
    localStorage.setItem(STORAGE_KEY_LIKES, JSON.stringify(likes));

    // Update count on post
    const posts = this.getPosts();
    const updatedPosts = posts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          likesCount: isLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
        };
      }
      return p;
    });
    localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(updatedPosts));
    window.dispatchEvent(new Event("community_posts_updated"));
    return { isLiked, likesCount: updatedPosts.find((p) => p.id === postId)?.likesCount || 0 };
  }

  toggleSave(postId) {
    const saved = this.getSaved();
    const isSaved = !saved[postId];
    if (isSaved) {
      saved[postId] = true;
    } else {
      delete saved[postId];
    }
    localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(saved));
    window.dispatchEvent(new Event("community_posts_updated"));
    return isSaved;
  }

  addComment(postId, authorName, text) {
    if (!text || !text.trim()) return null;
    const posts = this.getPosts();
    let newComment = null;

    const updated = posts.map((p) => {
      if (p.id === postId) {
        newComment = {
          id: `c-${Date.now()}`,
          author: authorName || "Community Member",
          text: text.trim(),
          timeAgo: "Just now",
        };
        const comments = p.comments ? [...p.comments, newComment] : [newComment];
        return {
          ...p,
          comments,
          commentsCount: comments.length,
        };
      }
      return p;
    });

    localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(updated));
    window.dispatchEvent(new Event("community_posts_updated"));
    return newComment;
  }

  createPost({ authorName, authorAvatar, image, caption, vehicleName }) {
    const newPost = {
      id: `post-${Date.now()}`,
      author: {
        name: authorName || "Enthusiast",
        avatar: authorAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
        handle: `@${(authorName || "user").toLowerCase().replace(/\s+/g, "_")}`,
      },
      vehicle: vehicleName || "Garage Build",
      timeAgo: "Just now",
      createdAt: new Date().toISOString(),
      image: image || "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
      caption: caption || "Exploring the open road with NGINEBREAK! 🚗✨",
      likesCount: 1,
      commentsCount: 0,
      comments: [],
    };

    const posts = [newPost, ...this.getPosts()];
    localStorage.setItem(STORAGE_KEY_POSTS, JSON.stringify(posts));

    // Auto-like own post
    const likes = this.getLikes();
    likes[newPost.id] = true;
    localStorage.setItem(STORAGE_KEY_LIKES, JSON.stringify(likes));

    window.dispatchEvent(new Event("community_posts_updated"));
    return newPost;
  }

  joinWaitlist(userEmail) {
    try {
      const waitlist = JSON.parse(localStorage.getItem(STORAGE_KEY_WAITLIST) || "[]");
      if (userEmail && !waitlist.includes(userEmail)) {
        waitlist.push(userEmail);
        localStorage.setItem(STORAGE_KEY_WAITLIST, JSON.stringify(waitlist));
      }
      return true;
    } catch {
      return true;
    }
  }

  isWaitlisted(userEmail) {
    try {
      const waitlist = JSON.parse(localStorage.getItem(STORAGE_KEY_WAITLIST) || "[]");
      return Boolean(userEmail && waitlist.includes(userEmail));
    } catch {
      return false;
    }
  }
}

export const communityService = new CommunityService();
export default communityService;
