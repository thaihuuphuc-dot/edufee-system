import React, { useState, useEffect } from 'react';
import MathText from './MathText';

const AdminFeed = ({ adminToken }) => {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState('10');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]); // [{ url, name, type }]
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const API_BASE = '/api';

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/posts`);
      const result = await res.json();
      if (result.success) setPosts(result.data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách bài viết:', err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Xử lý Upload File trực tiếp lên Backend
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        body: formData
      });

      const result = await res.json();
      if (result.success) {
        setAttachments(prev => [
          ...prev,
          { url: result.fileUrl, name: result.fileName, type: result.fileType }
        ]);
      } else {
        alert(result.message || 'Lỗi tải file lên.');
      }
    } catch (err) {
      alert('Không thể kết nối máy chủ để upload file.');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset ô chọn file
    }
  };

  // Xóa file đính kèm trước khi đăng
  const handleRemoveAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Đăng bài mới
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ tiêu đề và nội dung.' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ title, grade, content, attachments })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setMessage({ type: 'success', text: '🎉 Đăng bài viết mới thành công!' });
        setTitle('');
        setContent('');
        setAttachments([]);
        fetchPosts(); // Tải lại danh sách bài viết
      } else {
        setMessage({ type: 'error', text: result.message || result.error || 'Phiên đăng nhập hết hạn hoặc không đủ quyền.' });
      }
    } catch (err) {
      console.error('Lỗi Submit Post:', err);
      setMessage({ type: 'error', text: 'Không thể kết nối đến Backend (Cổng 3000). Hãy kiểm tra Terminal node server.js!' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) return;

    try {
      const res = await fetch(`${API_BASE}/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const result = await res.json();
      if (result.success) {
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (err) {
      alert('Lỗi máy chủ khi xóa bài.');
    }
  };

  return (
    <div className="admin-feed-container space-y-8 max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold border-b border-white/10 pb-3">✍️ Quản Lý Bảng Tin & Bài Giảng Math Feed</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form soạn bài */}
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <h3 className="text-lg font-semibold text-blue-400">Soạn Bài Giảng Mới</h3>

          {message.text && (
            <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
              {message.text}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">Tiêu đề bài viết</label>
            <input
              type="text"
              placeholder="Ví dụ: Bài tập Đạo hàm & File đề thi..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 text-sm focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">Khối Lớp</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 text-sm focus:outline-none"
            >
              <option value="6">Khối 6</option>
              <option value="7">Khối 7</option>
              <option value="10">Khối 10</option>
              <option value="11">Khối 11</option>
              <option value="12">Khối 12</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">Nội dung (Công thức KaTeX)</label>
            <textarea
              rows={6}
              placeholder="Nhập nội dung... Dùng $f(x) = x^2$ hoặc $$ \int_0^1 x dx $$"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 text-sm font-mono focus:outline-none"
            />
          </div>

          {/* Ô Chọn File đính kèm */}
          <div className="space-y-2 border-t border-white/10 pt-3">
            <label className="text-xs text-gray-400 font-medium block">📁 Đính kèm File (PDF, Ảnh, Video)</label>
            <input
              type="file"
              accept="image/*,video/*,application/pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
            />
            {uploading && <span className="text-xs text-amber-400 block">Đang tải file lên máy chủ...</span>}

            {/* Danh sách file đã tải lên chuẩn bị đăng */}
            {attachments.length > 0 && (
              <div className="space-y-1 mt-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs bg-gray-800 p-2 rounded border border-gray-700">
                    <span className="truncate max-w-[250px] text-blue-300">📎 {file.name}</span>
                    <button type="button" onClick={() => handleRemoveAttachment(idx)} className="text-rose-400 hover:text-rose-300 font-bold ml-2">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition disabled:opacity-50"
          >
            {submitting ? 'Đang xuất bản...' : '🚀 Xuất Bản Bài Viết'}
          </button>
        </form>

        {/* Cột Xem trước Live Preview nâng cấp */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3 flex flex-col">
          <h3 className="text-lg font-semibold text-emerald-400 border-b border-white/10 pb-2">👁️ Live KaTeX & Media Preview</h3>
          <div className="flex-1 bg-gray-900/60 rounded-lg p-4 border border-gray-800 overflow-y-auto max-h-[550px] space-y-3">
            <h4 className="text-lg font-bold text-white">{title || 'Chưa có tiêu đề'}</h4>
            <div className="text-gray-300 text-sm">
              <MathText text={content || 'Chưa có nội dung...'} />
            </div>

            {/* Preview Media đính kèm đầy đủ */}
            {attachments.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-white/10">
                <span className="text-xs text-amber-400 font-semibold block">📁 Xem trước phương tiện đính kèm:</span>
                {attachments.map((att, i) => (
                  <div key={i} className="bg-gray-800 p-3 rounded-xl border border-gray-700 space-y-2">
                    
                    {/* Xem trước Ảnh toàn bộ */}
                    {att.type.startsWith('image/') && (
                      <div className="space-y-1">
                        <img src={att.url} alt="" className="w-full max-h-[350px] object-contain rounded-lg bg-black/40 border border-white/5" />
                        <span className="text-[11px] text-gray-400 block truncate">🖼️ {att.name}</span>
                      </div>
                    )}

                    {/* Xem trước Video đầy đủ */}
                    {att.type.startsWith('video/') && (
                      <div className="space-y-1">
                        <video src={att.url} controls className="w-full max-h-[350px] rounded-lg bg-black" />
                        <span className="text-[11px] text-gray-400 block truncate">🎬 {att.name}</span>
                      </div>
                    )}

                    {/* Khung nhúng xem trước PDF trực tiếp */}
                    {att.type === 'application/pdf' && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center bg-blue-950/50 p-2 rounded-lg border border-blue-500/30">
                          <span className="text-xs font-bold text-blue-300 truncate">📄 {att.name}</span>
                          <a href={att.url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 underline">
                            Mở tab mới ↗
                          </a>
                        </div>
                        <div className="w-full h-80 bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                          <iframe src={`${att.url}#toolbar=1`} title="PDF Preview" className="w-full h-full" />
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danh sách bài viết đã xuất bản */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <h3 className="text-lg font-semibold text-gray-200">📋 Các bài viết đã xuất bản</h3>
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg border border-gray-700/50 text-sm">
              <div>
                <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded font-mono mr-2">Lớp {post.grade}</span>
                <span className="font-medium text-white">{post.title}</span>
                {post.attachments?.length > 0 && <span className="text-xs text-amber-400 ml-2">📎 ({post.attachments.length} file)</span>}
              </div>
              <button onClick={() => handleDeletePost(post.id)} className="px-2.5 py-1 bg-rose-500/20 text-rose-300 rounded text-xs hover:bg-rose-500/30 transition">
                🗑️ Xóa
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminFeed;