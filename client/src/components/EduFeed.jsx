import React, { useState, useEffect } from 'react';
import MathText from './MathText';

const EduFeed = () => {
  const [posts, setPosts] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState(() => {
    return JSON.parse(localStorage.getItem('edufeed_liked_posts') || '[]');
  });

  // Sử dụng đường dẫn tương đối '/api' để khớp với cả Vite Dev Proxy lẫn Express Static Server
  const API_BASE = '/api';

  // Fetch posts theo grade
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const url = selectedGrade === 'ALL' ? `${API_BASE}/posts` : `${API_BASE}/posts?grade=${selectedGrade}`;
      const res = await fetch(url);
      const result = await res.json();
      if (result.success) setPosts(result.data);
    } catch (err) {
      console.error('Lỗi khi tải bài viết:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [selectedGrade]);

  // Thả tim với Optimistic Update
  const handleLike = async (postId) => {
    if (likedPosts.includes(postId)) return;

    setPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p))
    );
    const updatedLiked = [...likedPosts, postId];
    setLikedPosts(updatedLiked);
    localStorage.setItem('edufeed_liked_posts', JSON.stringify(updatedLiked));

    try {
      await fetch(`${API_BASE}/posts/${postId}/like`, { method: 'POST' });
    } catch (err) {
      console.error('Lỗi thả tim:', err);
    }
  };

  return (
  /* Khung chứa ngoài cùng (thay đổi màu nền khi bật Light/Dark mode) */
  <div className="edufeed-container space-y-6 max-w-4xl mx-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950/80 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-colors duration-200">
    
    {/* Thanh Bộ Lọc Bài Học */}
    <div className="flex flex-wrap justify-between items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
      <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
        📢 Bảng Tin Bài Học
      </h2>
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Lọc theo lớp:</label>
        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-colors cursor-pointer"
        >
          <option value="ALL">Tất cả các lớp</option>
          <option value="6">Khối 6</option>
          <option value="7">Khối 7</option>
          <option value="10">Khối 10</option>
          <option value="11">Khối 11</option>
          <option value="12">Khối 12</option>
        </select>
      </div>
    </div>

    {/* Thẻ bài đăng (PostCard) */}
    {/* Đảm bảo PostCard dùng: bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md */}

      {/* Danh sách bài viết */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400 font-medium">
          ⏳ Đang tải bài viết...
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
          Chưa có bài viết nào cho khối lớp này.
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            apiBase={API_BASE}
            isLiked={likedPosts.includes(post.id)}
            onLike={() => handleLike(post.id)}
          />
        ))
      )}
    </div>
  );
};

// Sub-component Card bài viết
const PostCard = ({ post, apiBase, isLiked, onLike }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const toggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true);
      try {
        const res = await fetch(`${apiBase}/posts/${post.id}/comments`);
        const result = await res.json();
        if (result.success) setComments(result.data);
      } catch (err) {
        console.error('Lỗi tải bình luận:', err);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const res = await fetch(`${apiBase}/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: authorName, text: commentText })
      });
      const result = await res.json();
      if (result.success) {
        setComments([...comments, result.data]);
        setCommentText('');
      }
    } catch (err) {
      console.error('Lỗi gửi bình luận:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all duration-200">
      {/* Header bài viết */}
      <div className="flex justify-between items-start">
        <div>
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50">
            Lớp {post.grade}
          </span>
          <h3 className="text-xl font-bold mt-2.5 text-slate-900 dark:text-slate-100 leading-snug">
            {post.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {new Date(post.createdAt).toLocaleString('vi-VN')}
          </p>
        </div>
        <button
          onClick={onLike}
          disabled={isLiked}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            isLiked
              ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 cursor-default'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
          }`}
        >
          ❤️ <span>{post.likes || 0}</span>
        </button>
      </div>

      {/* Nội dung dạng Math Text KaTeX */}
      <div className="text-slate-800 dark:text-slate-200 leading-relaxed text-base pt-3 border-t border-slate-100 dark:border-slate-800/80">
        <MathText text={post.content} />
      </div>

      {/* MEDIA PHƯƠNG TIỆN ĐÍNH KÈM */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">
            📁 Tài liệu & Phương tiện đính kèm:
          </span>
          <div className="space-y-4">
            {post.attachments.map((att, idx) => (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden p-3 shadow-inner"
              >
                {/* 1. HÌNH ẢNH */}
                {att.type.startsWith('image/') && (
                  <div className="space-y-1.5">
                    <a href={att.url} target="_blank" rel="noreferrer" className="block cursor-zoom-in">
                      <img
                        src={att.url}
                        alt={att.name}
                        className="w-full h-auto max-h-[500px] object-contain rounded-lg bg-slate-200 dark:bg-black/50 border border-slate-300 dark:border-slate-800"
                      />
                    </a>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate font-medium">
                      🖼️ {att.name} (Bấm vào ảnh để phóng to)
                    </span>
                  </div>
                )}

                {/* 2. VIDEO */}
                {att.type.startsWith('video/') && (
                  <div className="space-y-1.5">
                    <video
                      controls
                      src={att.url}
                      className="w-full max-h-[450px] rounded-lg bg-black shadow-sm"
                    />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate font-medium">
                      🎬 {att.name}
                    </span>
                  </div>
                )}

                {/* 3. KHUNG XEM TRƯỚC PDF */}
                {att.type === 'application/pdf' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/50">
                      <span className="text-xs font-bold text-blue-800 dark:text-blue-300 truncate">
                        📄 {att.name}
                      </span>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-1 shadow-sm"
                      >
                        Mở tab mới ↗
                      </a>
                    </div>
                    <div className="w-full h-[450px] bg-slate-200 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-800">
                      <iframe
                        src={`${att.url}#toolbar=1`}
                        title={att.name}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thanh tác vụ Bình luận */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center">
        <button
          onClick={toggleComments}
          className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition flex items-center gap-1.5 text-xs"
        >
          💬 {showComments ? 'Ẩn bình luận' : 'Xem bình luận & thảo luận'}
        </button>
      </div>

      {/* Khung bình luận (Lazy Loaded) */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
          {loadingComments ? (
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">
              Đang tải bình luận...
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="text-xs text-slate-400 dark:text-slate-500 italic p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
                  Chưa có bình luận nào. Hãy là người đầu tiên đặt câu hỏi!
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-xs border border-slate-200/60 dark:border-slate-700/50"
                  >
                    <div className="flex justify-between font-semibold mb-1">
                      <span
                        className={
                          c.role === 'teacher'
                            ? 'text-amber-600 dark:text-amber-400 font-bold'
                            : 'text-blue-600 dark:text-blue-300'
                        }
                      >
                        {c.author || 'Học sinh'} {c.role === 'teacher' && '👑 (Giáo viên)'}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                        {new Date(c.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{c.text}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Form gửi bình luận */}
          <form onSubmit={handleSendComment} className="flex flex-col gap-2 pt-1">
            <input
              type="text"
              placeholder="Tên của bạn (mặc định: Học sinh)"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={500}
                placeholder="Nhập câu hỏi hoặc ý kiến..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
              >
                Gửi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default EduFeed;