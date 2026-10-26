import React, { useState, useEffect } from 'react';
import MathText from './MathText';

const EduFeed = () => {
  const [posts, setPosts] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState(() => {
    return JSON.parse(localStorage.getItem('edufeed_liked_posts') || '[]');
  });

  // Tự động nhận diện Domain Render khi lên web hoặc dùng Proxy /api khi chạy Local
  const API_BASE = window.location.hostname === 'localhost' 
    ? '/api' 
    : 'https://edufee-system.onrender.com/api'; // ⚠️ Thay bằng URL Web Service Render của bạn

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
    <div className="edufeed-container space-y-6 max-w-4xl mx-auto p-4">
      {/* Bộ lọc khối lớp */}
      <div className="flex justify-between items-center bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20">
        <h2 className="text-xl font-bold flex items-center gap-2">📢 Bảng Tin Bài Học</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Lọc theo lớp:</label>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none text-sm font-semibold"
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

      {/* Danh sách bài viết */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Đang tải bài viết...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Chưa có bài viết nào cho khối lớp này.</div>
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

// Sub-component Card bài viết (Tích hợp Media Player & Viewer)
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
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4 shadow-lg backdrop-blur-sm">
      <div className="flex justify-between items-start">
        <div>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/30">
            Lớp {post.grade}
          </span>
          <h3 className="text-lg font-bold mt-2 text-white">{post.title}</h3>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(post.createdAt).toLocaleString('vi-VN')}
          </p>
        </div>
        <button
          onClick={onLike}
          disabled={isLiked}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition ${
            isLiked
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-default'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          ❤️ <span>{post.likes || 0}</span>
        </button>
      </div>

      {/* Nội dung dạng Math Text KaTeX */}
      <div className="text-gray-200 leading-relaxed pt-2 border-t border-white/5">
        <MathText text={post.content} />
      </div>

      {/* MEDIA PHƯƠNG TIỆN ĐÍNH KÈM (PDF Preview, Ảnh full, Video) */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="pt-3 border-t border-white/10 space-y-4">
          <span className="text-xs font-semibold text-amber-400 block">📁 Tài liệu & Phương tiện đính kèm:</span>
          <div className="space-y-4">
            {post.attachments.map((att, idx) => (
              <div key={idx} className="bg-gray-900/90 rounded-xl border border-gray-700/80 overflow-hidden p-3 shadow-md">
                
                {/* 1. Hiển thị HÌNH ẢNH TOÀN BỘ (Full Aspect Ratio) */}
                {att.type.startsWith('image/') && (
                  <div className="space-y-1">
                    <a href={att.url} target="_blank" rel="noreferrer" className="block cursor-zoom-in">
                      <img
                        src={att.url}
                        alt={att.name}
                        className="w-full h-auto max-h-[500px] object-contain rounded-lg bg-black/40 border border-white/5"
                      />
                    </a>
                    <span className="text-[11px] text-gray-400 block truncate">🖼️ {att.name} (Bấm vào ảnh để phóng to)</span>
                  </div>
                )}

                {/* 2. Trình phát VIDEO hiển thị đầy đủ */}
                {att.type.startsWith('video/') && (
                  <div className="space-y-1">
                    <video
                      controls
                      src={att.url}
                      className="w-full max-h-[450px] rounded-lg bg-black"
                    />
                    <span className="text-[11px] text-gray-400 block truncate">🎬 {att.name}</span>
                  </div>
                )}

                {/* 3. KHUNG XEM TRƯỚC TÀI LIỆU PDF (PDF Embedded Viewer) */}
                {att.type === 'application/pdf' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-blue-950/50 p-2.5 rounded-lg border border-blue-500/30">
                      <span className="text-xs font-bold text-blue-300 truncate">📄 {att.name}</span>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition flex items-center gap-1"
                      >
                        Mở tab mới ↗
                      </a>
                    </div>
                    
                    {/* Embed Iframe xem trước nội dung PDF trực tiếp */}
                    <div className="w-full h-[450px] bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
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
      <div className="pt-2 border-t border-white/10 flex justify-between items-center text-sm">
        <button
          onClick={toggleComments}
          className="text-gray-400 hover:text-white transition flex items-center gap-1 text-xs"
        >
          💬 {showComments ? 'Ẩn bình luận' : 'Xem bình luận & thảo luận'}
        </button>
      </div>

      {/* Khung bình luận (Lazy Loaded) */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
          {loadingComments ? (
            <div className="text-xs text-gray-400">Đang tải bình luận...</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="text-xs text-gray-500 italic">Chưa có bình luận nào. Hãy là người đầu tiên đặt câu hỏi!</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="bg-white/5 rounded-lg p-2.5 text-xs">
                    <div className="flex justify-between font-semibold mb-1">
                      <span className={c.role === 'teacher' ? 'text-amber-400 font-bold' : 'text-blue-300'}>
                        {c.author} {c.role === 'teacher' && '👑 (Giáo viên)'}
                      </span>
                      <span className="text-gray-500 text-[10px]">
                        {new Date(c.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-gray-300">{c.text}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Form gửi bình luận */}
          <form onSubmit={handleSendComment} className="flex flex-col gap-2 pt-2">
            <input
              type="text"
              placeholder="Tên của bạn (mặc định: Học sinh)"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="px-3 py-1.5 rounded text-xs bg-gray-800 border border-gray-700 text-white focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={500}
                placeholder="Nhập câu hỏi hoặc ý kiến..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded text-xs bg-gray-800 border border-gray-700 text-white focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded transition"
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