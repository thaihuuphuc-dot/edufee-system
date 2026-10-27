import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import EduFeed from './components/EduFeed';
import AdminFeed from './components/AdminFeed';
import katex from 'katex';
import 'katex/dist/katex.min.css';

import { 
  BarChart, Bar, PieChart, Pie, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { 
  Users, Wallet, Clock, Search, UserPlus, FileText, QrCode, TrendingUp, X, Filter,
  Eye, BarChart3, Download, CheckCircle2, Trash2, Pencil,
  CheckSquare, Square, FileSpreadsheet, PieChart as PieIcon,
  Sun, Moon, Shield, LogOut, Calendar, XCircle, Check, Save, MessageSquare
} from 'lucide-react';

function MathFormula({ math, block = false }) {
  const containerRef = React.useRef(null);
  React.useEffect(() => {
    if (containerRef.current) {
      katex.render(math, containerRef.current, { displayMode: block, throwOnError: false });
    }
  }, [math, block]);
  return <span ref={containerRef} />;
}

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [view, setView] = useState('portal'); // 'portal' | 'login' | 'admin'
  const [publicTab, setPublicTab] = useState('lookup'); // 'lookup' | 'edufeed'
  const [adminTab, setAdminTab] = useState('students'); // 'students' | 'attendance' | 'feed'
  const [token, setToken] = useState(localStorage.getItem('edufee_token') || '');

  // Public Portal States
  const [lookupName, setLookupName] = useState('');
  const [lookupGrade, setLookupGrade] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Admin Rollover States
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  const [nextMonthInput, setNextMonthInput] = useState('11/2026');
  const [isRolloverLoading, setIsRolloverLoading] = useState(false);

  // Admin Auth States
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Main Data States
  const [students, setStudents] = useState([]);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [monthlyFee, setMonthlyFee] = useState(1200000);
  const [month, setMonth] = useState('10/2026');

  // Attendance Tab States
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attGrade, setAttGrade] = useState('10A1');
  const [attRecords, setAttRecords] = useState({}); // { studentId: 'PRESENT' | 'ABSENT' }
  const [attNote, setAttNote] = useState('Đại số §1');
  const [attSavedMsg, setAttSavedMsg] = useState('');

  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQr, setSelectedQr] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const API_BASE = '/api';

  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-[#0B1B33] text-[#F1EBDD]' : 'bg-[#F6F0E1] text-[#1B2A41]';
  const cardBg = isDark ? 'bg-[#12284A] border-[#1E3A66]' : 'bg-[#FBF7EC] border-[#E2D7C3]';
  const accentColor = isDark ? 'text-[#C9A24B]' : 'text-[#9A7424]';
  const buttonPrimary = isDark 
    ? 'bg-[#C9A24B] text-[#0B1B33] hover:bg-[#d8b056]' 
    : 'bg-[#9A7424] text-[#F6F0E1] hover:bg-[#83621d]';

  const fetchStudents = async () => {
    if (!token) return;
    try {
      setErrorMsg('');
      const res = await fetch(`${API_BASE}/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      setErrorMsg('Không thể kết nối đến Backend (Cổng 3000).');
    }
  };

  useEffect(() => {
    if (token && view === 'admin') fetchStudents();
  }, [token, view]);

  // Tự động gán lớp hợp lệ nếu attGrade chưa có trong danh sách
  useEffect(() => {
    if (students.length > 0) {
      const existingGrades = Array.from(new Set(students.map(s => String(s.grade))));
      if (existingGrades.length > 0 && !existingGrades.includes(String(attGrade))) {
        setAttGrade(existingGrades[0]);
      }
    }
  }, [students]);

  // Cập nhật trạng thái điểm danh trong Tab Attendance khi đổi lớp/ngày
  useEffect(() => {
    const classStudents = students.filter(s => String(s.grade) === String(attGrade));
    const initialMap = {};
    classStudents.forEach(s => {
      const existingLog = (s.attendanceLogs || []).find(l => l.date === attDate);
      initialMap[s.id] = existingLog ? existingLog.status : 'PRESENT';
    });
    setAttRecords(initialMap);
  }, [attGrade, attDate, students]);

  const handleMonthRollover = async () => {
    if (!nextMonthInput.trim()) {
      alert('Vui lòng nhập tháng áp dụng mới!');
      return;
    }

    setIsRolloverLoading(true);
    try {
      const response = await fetch(`${API_BASE}/students/rollover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetMonth: nextMonthInput.trim() })
      });

      const data = await response.json();
      if (response.ok) {
        alert(`🎉 ${data.message}`);
        setIsRolloverModalOpen(false);
        await fetchStudents();
      } else {
        alert(`❌ Lỗi: ${data.error || 'Không thể chuyển tháng.'}`);
      }
    } catch (err) {
      console.error('Lỗi kết nối API Rollover:', err);
      alert('❌ Không thể kết nối đến máy chủ Backend.');
    } finally {
      setIsRolloverLoading(false);
    }
  };

  const handlePublicLookup = async (e) => {
    e.preventDefault();
    setLookupError('');
    setLookupResult(null);
    setIsSearching(true);

    try {
      const res = await fetch(`${API_BASE}/public/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: lookupName, grade: lookupGrade }),
      });
      const data = await res.json();
      if (!res.ok) setLookupError(data.error || 'Lỗi tra cứu.');
      else setLookupResult(data);
    } catch (err) {
      setLookupError('Không thể kết nối máy chủ.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) setAdminError(data.error || 'Mật khẩu sai.');
      else {
        setToken(data.token);
        localStorage.setItem('edufee_token', data.token);
        setView('admin');
        setAdminPassword('');
      }
    } catch (err) {
      setAdminError('Không thể kết nối máy chủ.');
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('edufee_token');
    setView('portal');
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!name || !grade) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, grade, monthlyFee, month, status: 'UNPAID' })
      });
      if (res.ok) {
        setName(''); setGrade(''); setIsDrawerOpen(false);
        await fetchStudents();
      }
    } catch (err) {
      alert('Lỗi thêm học sinh!');
    } finally { setLoading(false); }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/students/${editingStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editingStudent)
      });
      if (res.ok) {
        setEditingStudent(null);
        await fetchStudents();
      }
    } catch (err) {
      alert('Lỗi cập nhật học sinh!');
    } finally { setLoading(false); }
  };

  // Xuất Báo cáo Học phí & Điểm danh Tổng hợp theo Tháng ra CSV/Excel chuẩn UTF-8 (5 Cột)
  const handleExportMonthlyCSV = () => {
    const targetStudents = selectedGradeFilter === 'ALL' 
      ? students 
      : students.filter(s => String(s.grade) === String(selectedGradeFilter));

    if (targetStudents.length === 0) {
      alert(`Không có dữ liệu học sinh để xuất báo cáo!`);
      return;
    }

    const headers = [
      "STT",
      "TÊN",
      "LỚP",
      "SỐ BUỔI NGHỈ TRONG THÁNG (GHI CHÚ NGÀY NGHỈ)",
      "TÌNH TRẠNG HỌC PHÍ"
    ];

    const rows = targetStudents.map((s, index) => {
      const logs = s.attendanceLogs || [];
      const absentLogs = logs.filter(l => l.status === 'ABSENT');
      const absentCount = absentLogs.length;

      let absentDetail = "0 buổi";
      if (absentCount > 0) {
        const absentDates = absentLogs.map(l => l.date).join(', ');
        absentDetail = `${absentCount} buổi (Nghỉ ngày: ${absentDates})`;
      }

      const feeStatus = s.status === 'PAID' ? 'Đã đóng' : 'Chưa đóng';

      return [
        index + 1,
        `"${s.name}"`,
        `"${s.grade}"`,
        `"${absentDetail}"`,
        `"${feeStatus}"`
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const currentMonthStr = targetStudents[0]?.month || 'Thang';
    const gradeStr = selectedGradeFilter === 'ALL' ? 'Tat_Ca_Lop' : `Lop_${selectedGradeFilter}`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_Cao_Hoc_Phi_Diem_Danh_${gradeStr}_${currentMonthStr.replace('/', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveAttendance = async () => {
    const classStudents = students.filter(s => String(s.grade) === String(attGrade));
    const recordsPayload = classStudents.map(s => ({
      studentId: s.id,
      status: attRecords[s.id] || 'PRESENT'
    }));

    try {
      const res = await fetch(`${API_BASE}/attendance/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ date: attDate, note: attNote, records: recordsPayload })
      });
      if (res.ok) {
        setAttSavedMsg('Đã lưu điểm danh thành công!');
        setTimeout(() => setAttSavedMsg(''), 3000);
        await fetchStudents();
      }
    } catch (err) {
      alert('Không thể lưu điểm danh!');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID';
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status: nextStatus } : s));
    try {
      await fetch(`${API_BASE}/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (err) { console.error(err); }
  };

  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;
    try {
      const res = await fetch(`${API_BASE}/students/${deletingStudent.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStudents(prev => prev.filter(s => s.id !== deletingStudent.id));
        setDeletingStudent(null);
      }
    } catch (err) { alert('Lỗi khi xóa!'); }
  };

  const handleExportPDF = (student) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('PHIEU THU HOC PHI', 45, 18);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Ngay xuat: ${new Date().toLocaleDateString('vi-VN')}`, 52, 24);
      doc.line(12, 28, 136, 28);
      doc.setFontSize(10);
      doc.text(`Ho va ten: ${student.name}`, 12, 38);
      doc.text(`Lop: ${student.grade}`, 12, 45);
      doc.text(`Thang hoc: ${student.month || '10/2026'}`, 12, 52);
      doc.text(`So buoi co mat: ${student.attendedPeriods || 0} buoi`, 12, 59);
      doc.line(12, 64, 136, 64);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`TONG HOC PHI THANG: ${Number(student.monthlyFee || 0).toLocaleString('vi-VN')} VND`, 12, 73);
      doc.save(`Phieu_Thu_${student.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) { alert('Lỗi xuất PDF!'); }
  };

  const availableGrades = useMemo(() => {
    const gradesSet = new Set(students.map(s => String(s.grade)));
    return ['ALL', ...Array.from(gradesSet)];
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            String(s.grade).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGrade = selectedGradeFilter === 'ALL' || String(s.grade) === String(selectedGradeFilter);
      const matchesStatus = selectedStatusFilter === 'ALL' || s.status === selectedStatusFilter;
      return matchesSearch && matchesGrade && matchesStatus;
    });
  }, [students, searchTerm, selectedGradeFilter, selectedStatusFilter]);

  const stats = useMemo(() => {
    const totalStudents = students.length;
    const collectedRevenue = students
      .filter(s => s.status === 'PAID')
      .reduce((acc, curr) => acc + (Number(curr.monthlyFee) || 0), 0);
    const pendingRevenue = students
      .filter(s => s.status === 'UNPAID')
      .reduce((acc, curr) => acc + (Number(curr.monthlyFee) || 0), 0);
    const totalPeriods = students.reduce((acc, curr) => acc + (Number(curr.attendedPeriods) || 0), 0);

    return { totalStudents, collectedRevenue, pendingRevenue, totalPeriods };
  }, [students]);

  const chartData = useMemo(() => {
    const map = {};
    students.forEach(s => {
      const g = String(s.grade);
      if (!map[g]) map[g] = 0;
      map[g] += Number(s.monthlyFee) || 0;
    });
    return Object.keys(map).map(grade => ({ grade: `Lớp ${grade}`, revenue: map[grade] }));
  }, [students]);

  const pieChartData = useMemo(() => {
    const paidCount = students.filter(s => s.status === 'PAID').length;
    const unpaidCount = students.filter(s => s.status === 'UNPAID').length;
    return [
      { name: 'Đã hoàn tất', value: paidCount, color: '#10b981' },
      { name: 'Chưa thu', value: unpaidCount, color: '#f59e0b' }
    ];
  }, [students]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className={`min-h-screen ${bgColor} transition-colors duration-300 flex flex-col font-sans`}>
      {/* HEADER BAR */}
      <header className={`border-b ${isDark ? 'border-[#1E3A66]' : 'border-[#E2D7C3]'} px-6 py-4 flex items-center justify-between`}>
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('portal')}>
          <div className={`w-8 h-8 rounded-full border ${isDark ? 'border-[#C9A24B]' : 'border-[#9A7424]'} flex items-center justify-center font-serif text-lg font-bold`}>
            ∫
          </div>
          <span className="font-serif text-2xl font-bold tracking-wide">EduFee</span>
          <span className="text-xs px-2 py-0.5 rounded border border-current opacity-70">Math Classic</span>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`p-2 rounded-lg border ${isDark ? 'border-[#1E3A66] hover:bg-[#12284A]' : 'border-[#E2D7C3] hover:bg-[#FBF7EC]'} transition`}
            title="Đổi giao diện Bảng đen / Giấy da"
          >
            {isDark ? <Sun className="w-5 h-5 text-[#C9A24B]" /> : <Moon className="w-5 h-5 text-[#9A7424]" />}
          </button>

          {token ? (
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setView(view === 'admin' ? 'portal' : 'admin')}
                className={`text-sm px-3 py-1.5 rounded font-medium border ${isDark ? 'border-[#1E3A66]' : 'border-[#E2D7C3]'}`}
              >
                {view === 'admin' ? 'Cổng Tra Cứu' : 'Bảng Quản Lý'}
              </button>
              <button onClick={handleLogout} className="text-red-400 p-2 hover:bg-red-500/10 rounded" title="Đăng xuất">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setView(view === 'login' ? 'portal' : 'login')}
              className={`flex items-center space-x-1 text-sm px-3 py-1.5 rounded font-medium border ${isDark ? 'border-[#1E3A66]' : 'border-[#E2D7C3]'}`}
            >
              <Shield className="w-4 h-4" />
              <span>Quản trị</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        
        {/* VIEW 1: CỔNG TRA CỨU PUBLIC */}
        {view === 'portal' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* PUBLIC NAVIGATION TABS */}
            <div className="flex justify-center gap-3 border-b border-current/10 pb-4">
              <button
                onClick={() => setPublicTab('lookup')}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition ${
                  publicTab === 'lookup' ? buttonPrimary : 'bg-white/5 opacity-70 hover:opacity-100'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Tra Cứu Học Phí</span>
              </button>
              <button
                onClick={() => setPublicTab('edufeed')}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition ${
                  publicTab === 'edufeed' ? buttonPrimary : 'bg-white/5 opacity-70 hover:opacity-100'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Bảng Tin Bài Học (EduFeed)</span>
              </button>
            </div>

            {/* TAB PUBLIC 1: TRA CỨU HỌC PHÍ */}
            {publicTab === 'lookup' && (
              <div className="space-y-8">
                <div className="text-center space-y-2 py-4">
                  <h1 className="font-serif text-4xl font-bold">§1. Tra Cứu Học Phí & Điểm Danh</h1>
                  <p className="opacity-70 text-sm">Nhập chính xác Họ tên và Lớp để tra cứu mức phí tháng và chi tiết điểm danh.</p>
                </div>

                <form onSubmit={handlePublicLookup} className={`p-6 rounded-xl border ${cardBg} space-y-4 shadow-lg`}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs uppercase font-semibold mb-1 opacity-80">Họ và Tên Học Sinh</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ví dụ: Nguyễn Văn A"
                        value={lookupName}
                        onChange={e => setLookupName(e.target.value)}
                        className={`w-full px-3 py-2 rounded border bg-transparent focus:outline-none ${isDark ? 'border-[#1E3A66] focus:border-[#C9A24B]' : 'border-[#E2D7C3] focus:border-[#9A7424]'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase font-semibold mb-1 opacity-80">Lớp</label>
                      <input 
                        type="text" 
                        required
                        placeholder="10A1"
                        value={lookupGrade}
                        onChange={e => setLookupGrade(e.target.value)}
                        className={`w-full px-3 py-2 rounded border bg-transparent focus:outline-none ${isDark ? 'border-[#1E3A66] focus:border-[#C9A24B]' : 'border-[#E2D7C3] focus:border-[#9A7424]'}`}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSearching}
                    className={`w-full py-2.5 rounded font-semibold transition flex items-center justify-center space-x-2 ${buttonPrimary}`}
                  >
                    <Search className="w-4 h-4" />
                    <span>{isSearching ? 'Đang tra cứu...' : 'Tra Cứu Học Phí'}</span>
                  </button>

                  {lookupError && (
                    <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                      {lookupError}
                    </div>
                  )}
                </form>

                {lookupResult && (
                  <div className={`p-6 rounded-xl border ${cardBg} grid grid-cols-1 md:grid-cols-2 gap-6 shadow-xl`}>
                    <div className="space-y-4">
                      <div className="border-b pb-3 border-current/10">
                        <span className="text-xs uppercase tracking-wider opacity-60">Thẻ Kết Quả Học Sinh</span>
                        <h2 className="font-serif text-3xl font-bold">{lookupResult.name}</h2>
                        <p className="text-sm opacity-80">Lớp: {lookupResult.grade} · Tháng: {lookupResult.month}</p>
                      </div>

                      <div className="p-4 rounded border border-current/10 bg-black/5 space-y-1">
                        <span className="text-xs font-semibold uppercase opacity-70 block">HỌC PHÍ THÁNG {lookupResult.month}</span>
                        <div className="text-lg">
                          <MathFormula math={` ${lookupResult.monthlyFee.toLocaleString()} \\text{ VNĐ}`} block />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-sm">Trạng thái đóng phí:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${lookupResult.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                          {lookupResult.status === 'PAID' ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>Nhật ký điểm danh (Số buổi có mặt: {lookupResult.attendedPeriods})</span>
                        </h3>
                        <div className="max-h-40 overflow-y-auto space-y-1 text-xs pr-2">
                          {lookupResult.attendanceLogs.map((log, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded border border-current/10">
                              <span>{log.date} {log.note || 'Buổi học'}</span>
                              {log.status === 'PRESENT' ? (
                                <span className="text-emerald-400 font-bold flex items-center space-x-1"><CheckCircle2 className="w-3.5 h-3.5" /> <span>Có mặt</span></span>
                              ) : (
                                <span className="text-rose-400 font-bold flex items-center space-x-1"><XCircle className="w-3.5 h-3.5" /> <span>Vắng</span></span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-4 border border-current/10 rounded-xl bg-white/5 text-center space-y-3">
                      <span className="text-xs uppercase font-semibold opacity-80">Quét VietQR Chuyển Khoản Tự Động</span>
                      <img src={lookupResult.qrUrl} alt="VietQR Payment" className="w-56 h-56 object-contain rounded bg-white p-2" />
                      <p className="text-xs opacity-70">BIDV · THÁI HỮU PHÚC · 8813196135</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB PUBLIC 2: BẢNG TIN EDUFEED */}
            {publicTab === 'edufeed' && <EduFeed />}
          </div>
        )}

        {/* VIEW 2: ĐĂNG NHẬP ADMIN */}
        {view === 'login' && (
          <div className="max-w-md mx-auto py-12">
            <form onSubmit={handleAdminLogin} className={`p-8 rounded-xl border ${cardBg} space-y-6 shadow-2xl`}>
              <div className="text-center space-y-2">
                <Shield className={`w-12 h-12 mx-auto ${accentColor}`} />
                <h2 className="font-serif text-3xl font-bold">Xác Thực Quản Trị</h2>
                <p className="text-xs opacity-70">Nhập mật khẩu quản trị để mở khóa hệ thống EduFee.</p>
              </div>

              <div>
                <label className="block text-xs uppercase font-semibold mb-1 opacity-80">Mật khẩu Admin</label>
                <input 
                  type="password" 
                  required
                  placeholder="Mặc định: 123456"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  className={`w-full px-3 py-2 rounded border bg-transparent focus:outline-none ${isDark ? 'border-[#1E3A66] focus:border-[#C9A24B]' : 'border-[#E2D7C3] focus:border-[#9A7424]'}`}
                />
              </div>

              {adminError && <div className="text-red-400 text-xs text-center">{adminError}</div>}

              <button type="submit" className={`w-full py-2.5 rounded font-semibold transition ${buttonPrimary}`}>
                Đăng Nhập Quản Trị
              </button>
            </form>
          </div>
        )}

        {/* VIEW 3: BẢNG QUẢN LÝ ADMIN */}
        {view === 'admin' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-current/10">
              <h1 className="font-serif text-3xl font-bold">Bảng Điều Khiển Quản Trị</h1>
              
              <div className="flex items-center space-x-3">
                {/* ADMIN TAB SWITCHER */}
                <div className="flex rounded-lg border border-current/20 p-1">
                  <button 
                    onClick={() => setAdminTab('students')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold ${adminTab === 'students' ? buttonPrimary : 'opacity-70'}`}
                  >
                    Học Phí Theo Tháng
                  </button>
                  <button 
                    onClick={() => setAdminTab('attendance')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold ${adminTab === 'attendance' ? buttonPrimary : 'opacity-70'}`}
                  >
                    Điểm Danh Theo Buổi
                  </button>
                  <button 
                    onClick={() => setAdminTab('feed')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold ${adminTab === 'feed' ? buttonPrimary : 'opacity-70'}`}
                  >
                    ✍️ Quản Lý Bảng Tin & KaTeX
                  </button>
                </div>

                {adminTab === 'students' && (
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setIsRolloverModalOpen(true)}
                      className={`px-3 py-2 rounded font-semibold text-xs flex items-center gap-1.5 border ${
                        isDark ? 'border-[#C9A24B]/40 text-[#C9A24B] hover:bg-[#C9A24B]/10' : 'border-[#9A7424]/40 text-[#9A7424] hover:bg-[#9A7424]/10'
                      } transition`}
                      title="Lưu vết tháng cũ vào lịch sử và chuyển tất cả học sinh sang tháng mới"
                    >
                      <span className="text-sm">🔄</span>
                      <span>Chuyển Tháng Mới</span>
                    </button>

                    <button 
                      onClick={() => setIsDrawerOpen(true)}
                      className={`px-4 py-2 rounded font-semibold text-xs flex items-center gap-2 ${buttonPrimary}`}
                    >
                      <UserPlus className="w-4 h-4" /> Thêm học sinh
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* TAB ADMIN 1: QUẢN LÝ HỌC PHÍ THÁNG */}
            {adminTab === 'students' && (
              <>
                {/* STAT CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className={`p-6 rounded-2xl border ${cardBg} flex items-center justify-between`}>
                    <div>
                      <p className="text-xs uppercase opacity-60">Tổng học sinh</p>
                      <h3 className="text-3xl font-extrabold">{stats.totalStudents}</h3>
                    </div>
                    <Users className="w-7 h-7 text-blue-400" />
                  </div>

                  <div className={`p-6 rounded-2xl border ${cardBg} flex items-center justify-between`}>
                    <div>
                      <p className="text-xs uppercase opacity-60">Thực thu tháng</p>
                      <h3 className="text-2xl font-extrabold text-emerald-400">{stats.collectedRevenue.toLocaleString()} đ</h3>
                    </div>
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </div>

                  <div className={`p-6 rounded-2xl border ${cardBg} flex items-center justify-between`}>
                    <div>
                      <p className="text-xs uppercase opacity-60">Công nợ tháng</p>
                      <h3 className="text-2xl font-extrabold text-amber-400">{stats.pendingRevenue.toLocaleString()} đ</h3>
                    </div>
                    <Wallet className="w-7 h-7 text-amber-400" />
                  </div>

                  <div className={`p-6 rounded-2xl border ${cardBg} flex items-center justify-between`}>
                    <div>
                      <p className="text-xs uppercase opacity-60">Tổng lượt có mặt</p>
                      <h3 className="text-3xl font-extrabold">{stats.totalPeriods} <span className="text-sm font-normal opacity-60">buổi</span></h3>
                    </div>
                    <Clock className="w-7 h-7 text-indigo-400" />
                  </div>
                </div>

                {/* CHARTS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className={`lg:col-span-2 p-6 rounded-2xl border ${cardBg} space-y-4`}>
                    <h2 className="text-lg font-bold flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-400" /> Doanh thu theo Lớp</h2>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <XAxis dataKey="grade" tick={{ fill: isDark ? '#F1EBDD' : '#1B2A41' }} />
                          <YAxis tickFormatter={v => `${v/1000}k`} tick={{ fill: isDark ? '#F1EBDD' : '#1B2A41' }} />
                          <Tooltip formatter={v => `${Number(v).toLocaleString()} đ`} />
                          <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                            {chartData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className={`p-6 rounded-2xl border ${cardBg} flex flex-col justify-between`}>
                    <h2 className="text-lg font-bold flex items-center gap-2"><PieIcon className="w-5 h-5 text-emerald-400" /> Tỷ lệ thu học phí</h2>
                    <div className="h-56 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieChartData} innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                            {pieChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* MAIN TABLE TAB 1 */}
                <div className={`p-6 rounded-2xl border ${cardBg} space-y-4`}>
                  <div className="flex justify-between items-center border-b pb-4 border-current/10">
                    <h2 className="text-lg font-bold">Danh sách học phí hàng tháng</h2>
                    <div className="flex items-center space-x-3">
                      <select 
                        value={selectedGradeFilter} 
                        onChange={e => setSelectedGradeFilter(e.target.value)}
                        className="bg-transparent border border-current/20 rounded px-2 py-1 text-xs"
                      >
                        {availableGrades.map(g => <option key={g} value={g} className="text-slate-900">{g === 'ALL' ? 'Tất cả lớp' : `Lớp ${g}`}</option>)}
                      </select>
                      <input 
                        type="text" 
                        placeholder="Tìm kiếm..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                        className="bg-transparent border border-current/20 rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-current/10 text-xs uppercase opacity-60">
                          <th className="p-3">Họ và Tên</th>
                          <th className="p-3">Lớp</th>
                          <th className="p-3">Tháng</th>
                          <th className="p-3">Số Buổi Đã Học</th>
                          <th className="p-3">Học Phí Tháng</th>
                          <th className="p-3 text-center">Trạng Thái</th>
                          <th className="p-3 text-right">Hành Động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-current/10">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="p-8 text-center text-xs opacity-60">
                              Không tìm thấy dữ liệu học sinh phù hợp.
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map(s => (
                            <tr key={s.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-3 font-semibold">{s.name}</td>
                              <td className="p-3">{s.grade}</td>
                              <td className="p-3">{s.month || '10/2026'}</td>
                              <td className="p-3 font-mono font-bold text-indigo-400">
                                {s.attendedPeriods || 0} buổi
                              </td>
                              <td className="p-3 font-mono font-semibold">
                                {Number(s.monthlyFee || 0).toLocaleString()} đ
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleToggleStatus(s.id, s.status)}
                                  className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                                    s.status === 'PAID'
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  }`}
                                >
                                  {s.status === 'PAID' ? 'ĐÃ ĐÓNG' : 'CHƯA ĐÓNG'}
                                </button>
                              </td>
                              <td className="p-3 text-right space-x-1.5">
                                <button
                                  onClick={() => setSelectedQr(s.qrUrl)}
                                  className="p-1.5 rounded border border-current/20 hover:bg-white/10"
                                  title="Xem mã VietQR"
                                >
                                  <QrCode className="w-4 h-4 text-amber-400" />
                                </button>
                                <button
                                  onClick={() => handleExportPDF(s)}
                                  className="p-1.5 rounded border border-current/20 hover:bg-white/10"
                                  title="Xuất phiếu thu PDF A5"
                                >
                                  <FileText className="w-4 h-4 text-blue-400" />
                                </button>
                                <button
                                  onClick={() => setEditingStudent(s)}
                                  className="p-1.5 rounded border border-current/20 hover:bg-white/10"
                                  title="Sửa thông tin"
                                >
                                  <Pencil className="w-4 h-4 text-stone-300" />
                                </button>
                                <button
                                  onClick={() => setDeletingStudent(s)}
                                  className="p-1.5 rounded border border-current/20 hover:bg-white/10"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-400" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* TAB ADMIN 2: ĐIỂM DANH THEO BUỔI */}
            {adminTab === 'attendance' && (
              <div className={`p-6 rounded-2xl border ${cardBg} space-y-6`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-current/10">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-400" /> Bảng Điểm Danh Lớp Học</h2>
                    <p className="text-xs opacity-60">Chọn ngày và tích Có mặt / Vắng cho học sinh trong lớp.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <label className="text-xs block opacity-60">Chọn Lớp</label>
                      <select 
                        value={attGrade} 
                        onChange={e => setAttGrade(e.target.value)}
                        className="bg-transparent border border-current/20 rounded px-3 py-1.5 text-sm font-bold text-slate-900 bg-white"
                      >
                        {availableGrades.filter(g => g !== 'ALL').map(g => <option key={g} value={g}>Lớp {g}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs block opacity-60">Ngày dạy</label>
                      <input 
                        type="date" 
                        value={attDate} 
                        onChange={e => setAttDate(e.target.value)}
                        className="bg-transparent border border-current/20 rounded px-3 py-1 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-xs block opacity-60">Nội dung buổi học</label>
                      <input 
                        type="text" 
                        value={attNote} 
                        onChange={e => setAttNote(e.target.value)}
                        placeholder="Nội dung..."
                        className="bg-transparent border border-current/20 rounded px-3 py-1 text-sm"
                      />
                    </div>

                    <div className="flex items-center space-x-2 mt-4 md:mt-0">
                      <button 
                        type="button"
                        onClick={handleExportMonthlyCSV}
                        className="px-3.5 py-2 rounded font-semibold text-xs flex items-center gap-1.5 border border-emerald-600/50 text-emerald-400 hover:bg-emerald-600/10 transition shadow-sm"
                        title="Xuất Báo cáo Điểm danh vắng & Trạng thái học phí theo Tháng ra Excel"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span>Xuất Báo Cáo Tháng (Excel)</span>
                      </button>

                      <button 
                        onClick={handleSaveAttendance}
                        className={`px-4 py-2 rounded font-semibold text-xs flex items-center gap-2 ${buttonPrimary}`}
                      >
                        <Save className="w-4 h-4" /> Lưu Điểm Danh
                      </button>
                    </div>
                  </div>
                </div>

                {attSavedMsg && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-sm rounded text-center">
                    {attSavedMsg}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-current/10 text-xs uppercase opacity-60">
                        <th className="p-3">Học sinh</th>
                        <th className="p-3">Lớp</th>
                        <th className="p-3 text-center">Trạng Thái Điểm Danh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-current/10">
                      {students.filter(s => String(s.grade) === String(attGrade)).length === 0 ? (
                        <tr>
                          <td colSpan="3" className="p-8 text-center text-xs opacity-60">
                            Chưa có học sinh thuộc lớp <strong>{attGrade}</strong>.
                          </td>
                        </tr>
                      ) : (
                        students.filter(s => String(s.grade) === String(attGrade)).map(s => {
                          const status = attRecords[s.id] || 'PRESENT';
                          return (
                            <tr key={s.id} className="hover:bg-white/5">
                              <td className="p-3 font-semibold">{s.name}</td>
                              <td className="p-3">{s.grade}</td>
                              <td className="p-3 text-center space-x-3">
                                <button 
                                  onClick={() => setAttRecords(prev => ({ ...prev, [s.id]: 'PRESENT' }))}
                                  className={`px-4 py-1.5 rounded text-xs font-bold transition ${status === 'PRESENT' ? 'bg-emerald-600 text-white' : 'border border-current/20 opacity-50'}`}
                                >
                                  ✓ Có Mặt
                                </button>
                                <button 
                                  onClick={() => setAttRecords(prev => ({ ...prev, [s.id]: 'ABSENT' }))}
                                  className={`px-4 py-1.5 rounded text-xs font-bold transition ${status === 'ABSENT' ? 'bg-rose-600 text-white' : 'border border-current/20 opacity-50'}`}
                                >
                                  ✕ Vắng
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB ADMIN 3: QUẢN LÝ BẢNG TIN & KATEX */}
            {adminTab === 'feed' && <AdminFeed adminToken={token} />}
          </div>
        )}
      </main>

      {/* DRAWER & MODALS */}
      {(isDrawerOpen || editingStudent) && (
        <div className="fixed inset-0 z-50 overflow-hidden text-slate-900">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setIsDrawerOpen(false); setEditingStudent(null); }} />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white p-6 space-y-6 flex flex-col justify-between shadow-2xl">
              <div className="space-y-4">
                <h2 className="text-lg font-bold border-b pb-3">{editingStudent ? 'Chỉnh sửa học sinh' : 'Thêm học sinh mới'}</h2>
                <form onSubmit={editingStudent ? handleUpdateStudent : handleAddStudent} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Họ và tên</label>
                    <input 
                      type="text" required 
                      value={editingStudent ? editingStudent.name : name} 
                      onChange={e => editingStudent ? setEditingStudent({...editingStudent, name: e.target.value}) : setName(e.target.value)}
                      className="w-full px-3 py-2 border rounded bg-slate-50 text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Lớp học</label>
                    <input 
                      type="text" required 
                      value={editingStudent ? editingStudent.grade : grade} 
                      onChange={e => editingStudent ? setEditingStudent({...editingStudent, grade: e.target.value}) : setGrade(e.target.value)}
                      className="w-full px-3 py-2 border rounded bg-slate-50 text-sm" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Học phí tháng (đ)</label>
                      <input 
                        type="number" 
                        value={editingStudent ? editingStudent.monthlyFee : monthlyFee} 
                        onChange={e => editingStudent ? setEditingStudent({...editingStudent, monthlyFee: e.target.value}) : setMonthlyFee(e.target.value)}
                        className="w-full px-3 py-2 border rounded bg-slate-50 text-sm" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Tháng học</label>
                      <input 
                        type="text" 
                        value={editingStudent ? editingStudent.month : month} 
                        onChange={e => editingStudent ? setEditingStudent({...editingStudent, month: e.target.value}) : setMonth(e.target.value)}
                        className="w-full px-3 py-2 border rounded bg-slate-50 text-sm" 
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-2.5 bg-indigo-600 text-white rounded font-semibold text-sm">
                    {loading ? 'Đang lưu...' : 'Lưu học sinh'}
                  </button>
                </form>
              </div>
              <button onClick={() => { setIsDrawerOpen(false); setEditingStudent(null); }} className="w-full py-2 border rounded font-semibold text-sm">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VIETQR PREVIEW */}
      {selectedQr && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-sm w-full p-6 rounded-2xl border ${cardBg} text-center space-y-4`}>
            <h3 className="font-serif font-bold text-lg">Mã VietQR Thanh Toán</h3>
            <img src={selectedQr} alt="QR Code" className="w-64 h-64 mx-auto rounded bg-white p-2" />
            <button 
              onClick={() => setSelectedQr(null)}
              className="w-full py-2 bg-stone-700 hover:bg-stone-600 text-white text-xs font-bold rounded"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-sm w-full p-6 rounded-2xl border ${cardBg} space-y-4`}>
            <h3 className="font-serif font-bold text-lg text-rose-400">⚠️ Xác nhận xóa</h3>
            <p className="text-xs opacity-80">Bạn có chắc chắn muốn xóa học sinh <strong>{deletingStudent.name}</strong> không?</p>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setDeletingStudent(null)} className="px-3 py-1.5 rounded text-xs border border-current/20">Hủy</button>
              <button onClick={handleDeleteStudent} className="px-3 py-1.5 rounded text-xs bg-rose-600 text-white font-bold">Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DIALOG CHUYỂN THÁNG HỌC PHÍ (ROLLOVER) */}
      {isRolloverModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full p-6 rounded-xl border shadow-2xl ${cardBg} space-y-4`}>
            <div className="flex items-center space-x-3 border-b pb-3 border-current/10">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-serif text-lg font-bold text-amber-400">Xác Nhận Chuyển Tháng Học Phí</h3>
                <p className="text-xs opacity-70">Tự động hóa dữ liệu niên khóa Math Classic</p>
              </div>
            </div>

            <div className="text-sm space-y-2 leading-relaxed opacity-90">
              <p>Thao tác này sẽ áp dụng các thay đổi cho <strong>tất cả học sinh</strong>:</p>
              <ul className="list-disc pl-5 text-xs opacity-80 space-y-1">
                <li>Lưu vết tháng hiện tại vào lịch sử thanh toán <code className="text-amber-400">paymentHistory</code>.</li>
                <li>Đặt lại trạng thái học phí về <span className="text-rose-400 font-bold">UNPAID (Chưa đóng)</span>.</li>
                <li>Giữ nguyên lịch sử điểm danh tích lũy.</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs uppercase font-semibold mb-1 opacity-80">Tháng áp dụng mới</label>
              <input 
                type="text"
                value={nextMonthInput}
                onChange={e => setNextMonthInput(e.target.value)}
                placeholder="Ví dụ: 11/2026"
                className={`w-full px-3 py-2 rounded border bg-transparent font-mono text-sm focus:outline-none ${
                  isDark ? 'border-[#1E3A66] focus:border-[#C9A24B]' : 'border-[#E2D7C3] focus:border-[#9A7424]'
                }`}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-current/10">
              <button
                type="button"
                disabled={isRolloverLoading}
                onClick={() => setIsRolloverModalOpen(false)}
                className="px-4 py-2 rounded text-xs font-semibold border border-current/20 hover:bg-white/5"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isRolloverLoading}
                onClick={handleMonthRollover}
                className={`px-4 py-2 rounded text-xs font-semibold flex items-center space-x-2 ${buttonPrimary}`}
              >
                {isRolloverLoading ? 'Đang chuyển...' : '✓ Xác Nhận Chuyển Tháng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className={`border-t ${isDark ? 'border-[#1E3A66]' : 'border-[#E2D7C3]'} py-4 text-center text-xs opacity-60 font-serif italic`}>
        "Mathematics is the language in which God has written the universe." — Galileo Galilei
      </footer>
    </div>
  );
}