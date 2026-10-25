import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import { 
  Users, 
  Wallet, 
  Clock, 
  Search, 
  UserPlus, 
  FileText, 
  QrCode, 
  TrendingUp,
  X,
  Filter,
  Plus,
  Minus
} from 'lucide-react';

export default function App() {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [feePerPeriod, setFeePerPeriod] = useState(150000);
  const [attendedPeriods, setAttendedPeriods] = useState(8);
  
  // States cho Pha 2 UI
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQr, setSelectedQr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const API_BASE = 'http://localhost:3000/api/students';

  // Lấy danh sách học sinh
  const fetchStudents = async () => {
    try {
      setErrorMsg('');
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('Không thể kết nối API');
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error('Lỗi kết nối Backend:', err);
      setErrorMsg('Chưa kết nối được với Server (Cổng 3000). Đảm bảo backend đã khởi chạy!');
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Thêm học sinh
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!name || !grade) return;

    setLoading(true);
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, grade, feePerPeriod, attendedPeriods })
      });

      if (res.ok) {
        setName('');
        setGrade('');
        setIsDrawerOpen(false); // Đóng Drawer sau khi thêm thành công
        await fetchStudents();
      } else {
        alert('Lỗi khi thêm học sinh!');
      }
    } catch (err) {
      alert('Không thể kết nối đến Backend!');
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật nhanh số buổi học (+ / -)
  const handleUpdatePeriods = async (id, delta) => {
    const student = students.find(s => s.id === id);
    if (!student) return;

    const newPeriods = Math.max(0, student.attendedPeriods + delta);

    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendedPeriods: newPeriods })
      });

      if (res.ok) {
        fetchStudents();
      }
    } catch (err) {
      console.error('Lỗi cập nhật số buổi:', err);
    }
  };

  // Danh sách các lớp học duy nhất để làm bộ lọc Filter
  const availableGrades = useMemo(() => {
    const gradesSet = new Set(students.map(s => s.grade));
    return ['ALL', ...Array.from(gradesSet)];
  }, [students]);

  // Bộ lọc kết hợp Search Term + Grade Filter
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.grade.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGrade = selectedGradeFilter === 'ALL' || s.grade === selectedGradeFilter;
      return matchesSearch && matchesGrade;
    });
  }, [students, searchTerm, selectedGradeFilter]);

  // Thống kê số liệu
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const totalRevenue = students.reduce((acc, curr) => acc + (Number(curr.totalFee) || 0), 0);
    const totalPeriods = students.reduce((acc, curr) => acc + (Number(curr.attendedPeriods) || 0), 0);
    return { totalStudents, totalRevenue, totalPeriods };
  }, [students]);

  // Xuất phiếu thu PDF A5
  const handleExportPDF = (student) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      const currentDate = new Date().toLocaleDateString('vi-VN');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('PHIEU THU HOC PHI', 45, 18);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Ngay xuat: ${currentDate}`, 52, 24);
      doc.line(12, 28, 136, 28);

      doc.setFontSize(10);
      doc.text(`Ho va ten hoc sinh: ${student.name}`, 12, 38);
      doc.text(`Lop: ${student.grade}`, 12, 45);
      doc.text(`So buoi da hoc: ${student.attendedPeriods} buoi`, 12, 52);
      doc.text(`Don gia/buoi: ${Number(student.feePerPeriod).toLocaleString('vi-VN')} VND`, 12, 59);

      doc.line(12, 64, 136, 64);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`TONG CONG: ${Number(student.totalFee).toLocaleString('vi-VN')} VND`, 12, 73);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Thong tin chuyen khoan:', 12, 85);
      doc.text('Ngan hang: BIDV (CN Cu Chi)', 12, 90);
      doc.text('So tai khoan: 8813196135', 12, 95);
      doc.text('Chu tai khoan: THAI HUU PHUC', 12, 100);

      doc.text('Nguoi lap phieu', 95, 112);
      doc.setFont('helvetica', 'italic');
      doc.text('(Ky va ghi ro ho ten)', 92, 117);
      doc.text('Thai Huu Phuc', 95, 132);

      doc.save(`Phieu_Thu_${student.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Lỗi in PDF:', err);
      alert('Không thể xuất file PDF!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-100">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">EduFee Management</h1>
              <p className="text-slate-500 text-sm">Bảng điều khiển học phí & tự động hóa VietQR</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-md shadow-indigo-100 transition"
            >
              <UserPlus className="w-4 h-4" /> Thêm học sinh
            </button>
            <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">
              Phase 2 Interactive UX
            </span>
          </div>
        </header>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            {errorMsg}
          </div>
        )}

        {/* 1. Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng học sinh</p>
              <h3 className="text-3xl font-extrabold text-slate-800">{stats.totalStudents}</h3>
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Đang theo học
              </p>
            </div>
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
              <Users className="w-7 h-7" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng doanh thu</p>
              <h3 className="text-3xl font-extrabold text-indigo-600">{stats.totalRevenue.toLocaleString('vi-VN')} <span className="text-sm font-semibold">đ</span></h3>
              <p className="text-xs text-slate-500">Tích lũy từ các buổi học</p>
            </div>
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Wallet className="w-7 h-7" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng buổi giảng dạy</p>
              <h3 className="text-3xl font-extrabold text-slate-800">{stats.totalPeriods} <span className="text-sm font-normal text-slate-500">buổi</span></h3>
              <p className="text-xs text-slate-500">Đã hoàn thành</p>
            </div>
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Clock className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* 2. Main Data Table with Advanced Filters */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          
          {/* Thanh Công Cụ: Filter Lớp + Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">Danh sách học sinh</h2>
              <span className="text-xs text-slate-400 font-medium">({filteredStudents.length} học sinh)</span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {/* Lọc theo Lớp */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 font-medium">Lớp:</span>
                <select 
                  value={selectedGradeFilter}
                  onChange={(e) => setSelectedGradeFilter(e.target.value)}
                  className="bg-transparent text-slate-700 font-semibold focus:outline-none cursor-pointer"
                >
                  {availableGrades.map(g => (
                    <option key={g} value={g}>{g === 'ALL' ? 'Tất cả các lớp' : `Lớp ${g}`}</option>
                  ))}
                </select>
              </div>

              {/* Ô Tìm kiếm */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên học sinh..." 
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Bảng Dữ Liệu Học Sinh */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Học sinh</th>
                  <th className="py-3 px-4">Lớp</th>
                  <th className="py-3 px-4">Điều chỉnh số buổi</th>
                  <th className="py-3 px-4">Tổng tiền học phí</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400 text-xs">
                      Không có học sinh nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shadow-sm">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{s.name}</p>
                            <p className="text-[11px] text-slate-400">{Number(s.feePerPeriod).toLocaleString('vi-VN')} đ/buổi</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold">
                          {s.grade}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleUpdatePeriods(s.id, -1)}
                            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            title="Giảm 1 buổi"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-semibold text-slate-700 w-12 text-center text-xs">
                            {s.attendedPeriods} buổi
                          </span>
                          <button 
                            onClick={() => handleUpdatePeriods(s.id, 1)}
                            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            title="Tăng 1 buổi"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-indigo-600">
                        {Number(s.totalFee).toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setSelectedQr(s)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition"
                          >
                            <QrCode className="w-3.5 h-3.5" /> VietQR
                          </button>
                          <button 
                            onClick={() => handleExportPDF(s)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition shadow-sm shadow-emerald-100"
                          >
                            <FileText className="w-3.5 h-3.5" /> In PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Slide-over Drawer Modal Thêm Học Sinh */}
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
              onClick={() => setIsDrawerOpen(false)}
            />
            
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-md bg-white shadow-2xl p-6 space-y-6 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-indigo-600" />
                      <h2 className="text-lg font-bold text-slate-800">Thêm học sinh mới</h2>
                    </div>
                    <button 
                      onClick={() => setIsDrawerOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form id="add-student-form" onSubmit={handleAddStudent} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Họ và tên học sinh</label>
                      <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition" 
                        placeholder="VD: Nguyễn Văn A"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Lớp học</label>
                      <input 
                        type="text" 
                        value={grade} 
                        onChange={(e) => setGrade(e.target.value)} 
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition" 
                        placeholder="VD: 10A1"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Học phí/buổi (đ)</label>
                        <input 
                          type="number" 
                          value={feePerPeriod} 
                          onChange={(e) => setFeePerPeriod(e.target.value)} 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Số buổi khởi tạo</label>
                        <input 
                          type="number" 
                          value={attendedPeriods} 
                          onChange={(e) => setAttendedPeriods(e.target.value)} 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>
                  </form>
                </div>

                <div className="border-t border-slate-100 pt-4 flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="w-1/3 py-2.5 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit" 
                    form="add-student-form"
                    disabled={loading}
                    className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-100 transition disabled:opacity-50"
                  >
                    {loading ? 'Đang lưu...' : 'Lưu học sinh'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal hiển thị VietQR BIDV */}
        {selectedQr && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-100">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-lg">Thanh toán VietQR</h3>
                <p className="text-xs text-slate-500">Học sinh: <span className="font-semibold text-slate-700">{selectedQr.name}</span> ({selectedQr.grade})</p>
              </div>
              
              <div className="p-3 border border-slate-100 rounded-2xl bg-slate-50 flex justify-center shadow-inner">
                <img src={selectedQr.qrUrl} alt="VietQR" className="w-60 h-60 object-contain rounded-xl" />
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-left text-xs space-y-1.5">
                <p className="text-slate-500">Chủ tài khoản: <span className="font-bold text-slate-800">THÁI HỮU PHÚC</span></p>
                <p className="text-slate-500">Số tài khoản: <span className="font-bold text-indigo-600">8813196135</span></p>
                <p className="text-slate-500">Ngân hàng: <span className="font-semibold text-slate-700">BIDV (CN Củ Chi)</span></p>[cite: 1]
              </div>

              <div className="text-base font-extrabold text-emerald-600">
                {Number(selectedQr.totalFee).toLocaleString('vi-VN')} VNĐ
              </div>

              <button 
                onClick={() => setSelectedQr(null)}
                className="w-full py-2.5 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-200 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}