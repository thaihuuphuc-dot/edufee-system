import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';

export default function App() {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [feePerPeriod, setFeePerPeriod] = useState(150000);
  const [attendedPeriods, setAttendedPeriods] = useState(8);
  const [selectedQr, setSelectedQr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const API_BASE = 'http://localhost:3000/api/students';

  // Lấy danh sách học sinh
  const fetchStudents = async () => {
    try {
      setErrorMsg('');
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('Không thể kết nối đến máy chủ API');
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error('Lỗi kết nối Express Backend:', err);
      setErrorMsg('Chưa kết nối được với Backend Server (Cổng 3000). Hãy đảm bảo bạn đã chạy node server.js!');
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Xử lý thêm học sinh
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
        await fetchStudents();
      } else {
        alert('Lỗi khi thêm học sinh!');
      }
    } catch (err) {
      alert('Không thể gửi dữ liệu tới Server. Vui lòng kiểm tra lại backend!');
    } finally {
      setLoading(false);
    }
  };

  // Xuất phiếu thu PDF
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
      doc.text('Ngan hang: BIDV (CN Cu Chi)', 12, 90); //[cite: 1]
      doc.text('So tai khoan: 8813196135', 12, 95); //[cite: 1]
      doc.text('Chu tai khoan: THAI HUU PHUC', 12, 100); //[cite: 1]

      doc.text('Nguoi lap phieu', 95, 112);
      doc.setFont('helvetica', 'italic');
      doc.text('(Ky va ghi ro ho ten)', 92, 117);
      doc.text('Thai Huu Phuc', 95, 132);

      doc.save(`Phieu_Thu_${student.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Lỗi in PDF:', err);
      alert('Có lỗi xảy ra khi tạo file PDF!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Quản lý Học phí (EduFee)</h1>
            <p className="text-slate-500 text-sm">Hệ thống tính học phí & tạo mã thanh toán VietQR tự động</p>
          </div>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">MVP v1.1</span>
        </header>

        {errorMsg && (
          <div className="p-4 bg-rose-100 border border-rose-300 text-rose-700 text-sm rounded-xl">
            ⚠️ <strong>Cảnh báo:</strong> {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form thêm học sinh */}
          <form onSubmit={handleAddStudent} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-lg font-semibold text-slate-700">Thêm học sinh mới</h2>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Họ và tên</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="VD: Nguyễn Văn A"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Lớp</label>
              <input 
                type="text" 
                value={grade} 
                onChange={(e) => setGrade(e.target.value)} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="VD: 10A1"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Học phí/buổi (đ)</label>
                <input 
                  type="number" 
                  value={feePerPeriod} 
                  onChange={(e) => setFeePerPeriod(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Số buổi học</label>
                <input 
                  type="number" 
                  value={attendedPeriods} 
                  onChange={(e) => setAttendedPeriods(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg text-sm hover:bg-indigo-700 transition disabled:bg-slate-400"
            >
              {loading ? 'Đang lưu...' : 'Thêm Học Sinh'}
            </button>
          </form>

          {/* Bảng danh sách học sinh */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Danh sách học sinh & Thanh toán</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Họ tên</th>
                    <th className="p-3">Lớp</th>
                    <th className="p-3">Số buổi</th>
                    <th className="p-3">Tổng học phí</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-4 text-center text-slate-400">Chưa có dữ liệu học sinh</td>
                    </tr>
                  ) : (
                    students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-800">{s.name}</td>
                        <td className="p-3">{s.grade}</td>
                        <td className="p-3">{s.attendedPeriods} buổi</td>
                        <td className="p-3 font-semibold text-indigo-600">{Number(s.totalFee).toLocaleString('vi-VN')} đ</td>
                        <td className="p-3 text-right space-x-2">
                          <button 
                            onClick={() => setSelectedQr(s)}
                            className="px-3 py-1 bg-slate-800 text-white text-xs rounded-md hover:bg-slate-700 transition"
                          >
                            Mã VietQR
                          </button>
                          <button 
                            onClick={() => handleExportPDF(s)}
                            className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-md hover:bg-emerald-700 transition"
                          >
                            In PDF
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal VietQR */}
        {selectedQr && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl">
              <h3 className="font-bold text-slate-800 text-lg">Thanh toán qua VietQR</h3>
              <p className="text-xs text-slate-500">Học sinh: <span className="font-semibold text-slate-700">{selectedQr.name}</span> ({selectedQr.grade})</p>
              
              <div className="p-2 border border-slate-200 rounded-xl bg-slate-50 flex justify-center">
                <img src={selectedQr.qrUrl} alt="VietQR" className="w-64 h-64 object-contain rounded-lg" />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-left text-xs space-y-1">
                <p className="text-slate-500">Chủ tài khoản: <span className="font-bold text-slate-700">THÁI HỮU PHÚC</span></p>
                <p className="text-slate-500">Số tài khoản: <span className="font-bold text-indigo-600">8813196135</span></p>
                <p className="text-slate-500">Ngân hàng: <span className="font-semibold text-slate-700">BIDV (CN Củ Chi)</span></p>
              </div>

              <div className="text-sm font-bold text-emerald-600">
                Số tiền: {Number(selectedQr.totalFee).toLocaleString('vi-VN')} đ
              </div>
              <button 
                onClick={() => setSelectedQr(null)}
                className="w-full py-2 bg-slate-200 text-slate-700 font-medium text-sm rounded-lg hover:bg-slate-300 transition"
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