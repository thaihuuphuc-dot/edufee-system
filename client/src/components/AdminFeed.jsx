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

  // Đường dẫn tương đối '/api' chuẩn cho cả Dev Proxy lẫn Express Production
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
      setMessage({ type: 'error', text: 'Không thể kết nối đến Backend. Hãy kiểm tra terminal server.js!' });
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
  /* Khung chứa ngoài cùng cho trang Admin */
  <div className="admin-feed-container space-y-8 max-w-6xl mx-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950/80 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-colors duration-200">
    <h2 className="text-2xl font-bold border-b border-slate-200 dark:border-slate-800 pb-3 text-slate-900 dark:text-slate-100">
      ✍️ Quản Lý Bảng Tin & Bài Giảng Math Feed
    </h2>

    {/* Nội dung Form & Preview giữ nguyên bg-white dark:bg-slate-900 */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form soạn bài */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">Soạn Bài Giảng Mới</h3>

          {message.text && (
            <div className={`p-3 rounded-xl text-xs font-semibold ${message.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'}`}>
              {message.text}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Tiêu đề bài viết</label>
            <input
              type="text"
              placeholder="Ví dụ: Bài tập Đạo hàm & File đề thi..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Khối Lớp</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="6">Khối 6</option>
              <option value="7">Khối 7</option>
              <option value="10">Khối 10</option>
              <option value="11">Khối 11</option>
              <option value="12">Khối 12</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Nội dung (Công thức KaTeX)</label>
            <textarea
              rows={6}
              placeholder="Nhập nội dung... Dùng $f(x) = x^2$ hoặc $$ \int_0^1 x dx $$"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Ô Chọn File đính kèm */}
          <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block">📁 Đính kèm File (PDF, Ảnh, Video)</label>
            <input
              type="file"
              accept="image/*,video/*,application/pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              className="text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
            />
            {uploading && <span className="text-xs text-amber-600 dark:text-amber-400 font-medium block">⏳ Đang tải file lên máy chủ...</span>}

            {/* Danh sách file đã tải lên chuẩn bị đăng */}
            {attachments.length > 0 && (
              <div className="space-y-1 mt-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="truncate max-w-[250px] text-blue-700 dark:text-blue-300 font-medium">📎 {file.name}</span>
                    <button type="button" onClick={() => handleRemoveAttachment(idx)} className="text-rose-600 dark:text-rose-400 hover:text-rose-800 font-bold ml-2 px-1">
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
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Đang xuất bản...' : '🚀 Xuất Bản Bài Viết'}
          </button>
        </form>

        {/* Cột Xem trước Live Preview */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3 flex flex-col shadow-sm">
          <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            👁️ Live KaTeX & Media Preview
          </h3>
          <div className="flex-1 bg-slate-50 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[550px] space-y-3">
            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title || 'Chưa có tiêu đề'}</h4>
            <div className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
              <MathText text={content || 'Chưa có nội dung...'} />
            </div>

            {/* Preview Media đính kèm */}
            {attachments.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs text-amber-600 dark:text-amber-400 font-bold block">📁 Xem trước phương tiện đính kèm:</span>
                {attachments.map((att, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    
                    {/* Xem trước Ảnh */}
                    {att.type.startsWith('image/') && (
                      <div className="space-y-1">
                        <img src={att.url} alt="" className="w-full max-h-[350px] object-contain rounded-lg bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-slate-800" />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate font-medium">🖼️ {att.name}</span>
                      </div>
                    )}

                    {/* Xem trước Video */}
                    {att.type.startsWith('video/') && (
                      <div className="space-y-1">
                        <video src={att.url} controls className="w-full max-h-[350px] rounded-lg bg-black shadow-sm" />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate font-medium">🎬 {att.name}</span>
                      </div>
                    )}

                    {/* Khung nhúng xem trước PDF */}
                    {att.type === 'application/pdf' && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-950/40 p-2 rounded-lg border border-blue-200 dark:border-blue-900/40">
                          <span className="text-xs font-bold text-blue-800 dark:text-blue-300 truncate">📄 {att.name}</span>
                          <a href={att.url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold underline">
                            Mở tab mới ↗
                          </a>
                        </div>
                        <div className="w-full h-80 bg-slate-200 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-800">
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">📋 Các bài viết đã xuất bản</h3>
        <div className="space-y-2">
          {posts.length === 0 ? (
            <div className="text-xs text-slate-400 italic">Chưa có bài viết nào được xuất bản.</div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-sm">
                <div>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold mr-2 border border-blue-200 dark:border-blue-800">
                    Lớp {post.grade}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{post.title}</span>
                  {post.attachments?.length > 0 && <span className="text-xs text-amber-600 dark:text-amber-400 font-medium ml-2">📎 ({post.attachments.length} file)</span>}
                </div>
                <button 
                  onClick={() => handleDeletePost(post.id)} 
                  className="px-3 py-1 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/60 rounded-lg text-xs font-semibold transition border border-rose-200 dark:border-rose-800/60 cursor-pointer"
                >
                  🗑️ Xóa
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminFeed;