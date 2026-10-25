import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
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
  Minus,
  Eye,
  BarChart3,
  Download,
  CheckCircle2,
  AlertCircle,
  Trash2
} from 'lucide-react';

export default function App() {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [feePerPeriod, setFeePerPeriod] = useState(150000);
  const [attendedPeriods, setAttendedPeriods] = useState(8);
  
  // States Pha 2, 3 & 4 UI
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQr, setSelectedQr] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null); // Modal Xác nhận Xóa
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
      
      const mappedData = data.map(s => ({
        ...s,
        status: s.status || 'UNPAID'
      }));
      setStudents(mappedData);
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
        body: JSON.stringify({ name, grade, feePerPeriod, attendedPeriods, status: 'UNPAID' })
      });

      if (res.ok) {
        setName('');
        setGrade('');
        setIsDrawerOpen(false);
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

  // Cập nhật nhanh số buổi (+ / -)
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

  // Toggle trạng thái thanh toán (PAID / UNPAID) 1-Click
  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID';
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: nextStatus } : s));

    try {
      await fetch(`${API_BASE}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái:', err);
    }
  };

  // Thực hiện Xóa học sinh qua DELETE API
  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;

    try {
      const res = await fetch(`${API_BASE}/${deletingStudent.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setStudents(prev => prev.filter(s => s.id !== deletingStudent.id));
        setDeletingStudent(null);
      } else {
        alert('Lỗi khi xóa học sinh!');
      }
    } catch (err) {
      console.error('Lỗi khi gọi API xóa:', err);
      alert('Không thể kết nối đến Backend!');
    }
  };

  // Danh sách các lớp học duy nhất
  const availableGrades = useMemo(() => {
    const gradesSet = new Set(students.map(s => s.grade));
    return ['ALL', ...Array.from(gradesSet)];
  }, [students]);

  // Bộ lọc Search Term + Grade + Status
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.grade.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGrade = selectedGradeFilter === 'ALL' || s.grade === selectedGradeFilter;
      const matchesStatus = selectedStatusFilter === 'ALL' || s.status === selectedStatusFilter;
      return matchesSearch && matchesGrade && matchesStatus;
    });
  }, [students, searchTerm, selectedGradeFilter, selectedStatusFilter]);

  // Thống kê tổng quan
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const totalRevenue = students.reduce((acc, curr) => acc + (Number(curr.totalFee || curr.feePerPeriod * curr.attendedPeriods) || 0), 0);
    const collectedRevenue = students
      .filter(s => s.status === 'PAID')
      .reduce((acc, curr) => acc + (Number(curr.totalFee || curr.feePerPeriod * curr.attendedPeriods) || 0), 0);
    const totalPeriods = students.reduce((acc, curr) => acc + (Number(curr.attendedPeriods) || 0), 0);
    return { totalStudents, totalRevenue, collectedRevenue, totalPeriods };
  }, [students]);

  // Biểu đồ Doanh thu Recharts
  const chartData = useMemo(() => {
    const map = {};
    students.forEach(s => {
      if (!map[s.grade]) {
        map[s.grade] = 0;
      }
      map[s.grade] += Number(s.totalFee || s.feePerPeriod * s.attendedPeriods) || 0;
    });

    return Object.keys(map).map(grade => ({
      grade: `Lớp ${grade}`,
      revenue: map[grade]
    }));
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
      doc.text(`TONG CONG: ${Number(student.totalFee || student.feePerPeriod * student.attendedPeriods).toLocaleString('vi-VN')} VND`, 12, 73);

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

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

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
              Phase 3 Pro Analytics
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
              <p className="text-xs text-emerald-600 font-semibold">
                Thực thu: {stats.collectedRevenue.toLocaleString('vi-VN')} đ
              </p>
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

        {/* 2. Biểu đồ Phân tích Doanh thu theo Lớp (Recharts) */}
        {chartData.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-800">Biểu đồ Doanh thu theo Lớp học</h2>
            </div>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="grade" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tickFormatter={(val) => `${val / 1000}k`} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [`${Number(value).toLocaleString('vi-VN')} đ`, 'Doanh thu']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 3. Main Data Table with Advanced Filters */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">Danh sách học sinh</h2>
              <span className="text-xs text-slate-400 font-medium">({filteredStudents.length} học sinh)</span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {/* Tab Lọc Trạng thái Thanh toán */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600 w-full sm:w-auto justify-center">
                <button
                  onClick={() => setSelectedStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${selectedStatusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'}`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setSelectedStatusFilter('UNPAID')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${selectedStatusFilter === 'UNPAID' ? 'bg-amber-500 text-white font-bold shadow-xs' : 'hover:text-slate-900'}`}
                >
                  Chờ thu
                </button>
                <button
                  onClick={() => setSelectedStatusFilter('PAID')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${selectedStatusFilter === 'PAID' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'hover:text-slate-900'}`}
                >
                  Đã thu
                </button>
              </div>

              {/* Lọc Lớp học */}
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
              <div className="relative w-full sm:w-56">
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

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Học sinh</th>
                  <th className="py-3 px-4">Lớp</th>
                  <th className="py-3 px-4">Số buổi</th>
                  <th className="py-3 px-4">Tổng tiền học phí</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400 text-xs">
                      Không có học sinh nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => {
                    const isPaid = s.status === 'PAID';

                    return (
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
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-semibold text-slate-700 w-12 text-center text-xs">
                              {s.attendedPeriods} buổi
                            </span>
                            <button 
                              onClick={() => handleUpdatePeriods(s.id, 1)}
                              className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-indigo-600">
                          {Number(s.totalFee || s.feePerPeriod * s.attendedPeriods).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(s.id, s.status)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all active:scale-95 ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                            title="Bấm để đổi trạng thái"
                          >
                            {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                            {isPaid ? 'Đã thu' : 'Chờ thu'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setPreviewInvoice(s)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition"
                              title="Xem trước phiếu thu A5"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" /> Xem trước
                            </button>
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
                              <Download className="w-3.5 h-3.5" /> Tải PDF
                            </button>

                            {/* Nút Xóa Học Sinh */}
                            <button 
                              onClick={() => setDeletingStudent(s)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                              title="Xóa học sinh"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Modal Live Preview Hóa Đơn A5 */}
        {previewInvoice && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-slate-100">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" /> Xem trước Phiếu thu A5
                </h3>
                <button onClick={() => setPreviewInvoice(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Khung mô phỏng tờ giấy A5 */}
              <div className="border border-slate-200 p-6 rounded-xl bg-slate-50/50 space-y-4 text-xs font-sans shadow-inner">
                <div className="text-center space-y-1 border-b border-slate-200 pb-3">
                  <h4 className="font-extrabold text-slate-900 text-base uppercase tracking-wide">Phiếu Thu Học Phí</h4>
                  <p className="text-slate-400">Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</p>
                </div>

                <div className="space-y-2 text-slate-700">
                  <p><span className="text-slate-400">Họ và tên học sinh:</span> <strong className="text-slate-900">{previewInvoice.name}</strong></p>
                  <p><span className="text-slate-400">Lớp học:</span> <strong>{previewInvoice.grade}</strong></p>
                  <p><span className="text-slate-400">Số buổi đã học:</span> {previewInvoice.attendedPeriods} buổi</p>
                  <p><span className="text-slate-400">Đơn giá/buổi:</span> {Number(previewInvoice.feePerPeriod).toLocaleString('vi-VN')} VNĐ</p>
                </div>

                <div className="border-t border-b border-slate-200 py-2.5 text-sm flex justify-between font-bold text-indigo-600">
                  <span>TỔNG CỘNG:</span>
                  <span>{Number(previewInvoice.totalFee || previewInvoice.feePerPeriod * previewInvoice.attendedPeriods).toLocaleString('vi-VN')} VNĐ</span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-500 bg-white p-3 rounded-lg border border-slate-200/60">
                  <p className="font-semibold text-slate-700">Thông tin chuyển khoản:</p>
                  <p>Ngân hàng: <strong>BIDV (CN Củ Chi)</strong></p>
                  <p>Số tài khoản: <strong className="text-indigo-600">8813196135</strong></p>
                  <p>Chủ tài khoản: <strong>THÁI HỮU PHÚC</strong></p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setPreviewInvoice(null)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-200 transition"
                >
                  Đóng
                </button>
                <button 
                  onClick={() => {
                    handleExportPDF(previewInvoice);
                    setPreviewInvoice(null);
                  }}
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-100 flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4" /> Tải về PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. Drawer Thêm Học Sinh */}
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

        {/* 6. Modal VietQR BIDV */}
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
                <p className="text-slate-500">Ngân hàng: <span className="font-semibold text-slate-700">BIDV (CN Củ Chi)</span></p>
              </div>

              <div className="text-base font-extrabold text-emerald-600">
                {Number(selectedQr.totalFee || selectedQr.feePerPeriod * selectedQr.attendedPeriods).toLocaleString('vi-VN')} VNĐ
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

        {/* 7. Modal Xác Nhận Xóa Học Sinh */}
        {deletingStudent && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 bg-rose-50 rounded-xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Xác nhận xóa</h3>
              </div>
              
              <p className="text-sm text-slate-600">
                Bạn có chắc chắn muốn xóa học sinh <strong className="text-slate-900">{deletingStudent.name}</strong> (Lớp {deletingStudent.grade}) khỏi hệ thống? Dữ liệu này không thể khôi phục.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setDeletingStudent(null)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-200 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteStudent}
                  className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-rose-100 transition"
                >
                  Xóa luôn
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}