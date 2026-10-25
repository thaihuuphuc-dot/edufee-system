const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Database giả lập lưu trong bộ nhớ (In-memory Storage)
let students = [
  { id: 1, name: 'Nguyễn Văn A', grade: '10A1', feePerPeriod: 150000, attendedPeriods: 8 },
  { id: 2, name: 'Trần Thị B', grade: '10A2', feePerPeriod: 150000, attendedPeriods: 10 }
];

// Cấu hình thanh toán VietQR (Cập nhật thông tin tài khoản thật khi production)
const BANK_CONFIG = {
  bankId: "970418",
  accountNo: "8813196135",
  accountName: "THAI HUU PHUC",
};

// 1. Endpoint kiểm tra hệ thống
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'edufee-api' });
});

// 2. Lấy danh sách học sinh & tính tổng học phí
app.get('/api/students', (req, res) => {
  const data = students.map(s => {
    const totalFee = s.feePerPeriod * s.attendedPeriods;
    
    // Tạo link ảnh VietQR động dựa trên cú pháp chuẩn QuickLink VietQR
    // Cú pháp: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-compact2.png?amount=<AMOUNT>&addInfo=<DESCRIPTION>&accountName=<NAME>
    const description = `Hoc phi ${s.name} ${s.grade}`;
    const params = new URLSearchParams({
        amount: String(totalFee),
        addInfo: description,
        accountName: BANK_CONFIG.accountName,
    });

    const qrUrl = `https://img.vietqr.io/image/${BANK_CONFIG.bankId}-${BANK_CONFIG.accountNo}-compact2.png?${params.toString()}`;
    return {
      ...s,
      totalFee,
      qrUrl
    };
  });
  
  res.json(data);
});

// 3. Thêm học sinh mới
app.post('/api/students', (req, res) => {
  const { name, grade, feePerPeriod, attendedPeriods } = req.body;
  if (!name || !grade) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ tên và lớp.' });
  }

  const newStudent = {
    id: students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1,
    name,
    grade,
    feePerPeriod: Number(feePerPeriod) || 150000,
    attendedPeriods: Number(attendedPeriods) || 0
  };

  students.push(newStudent);
  res.status(201).json(newStudent);
});

// 4. Cập nhật số buổi học của học sinh
app.patch('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const { attendedPeriods } = req.body;

  const student = students.find(s => s.id === parseInt(id));
  if (!student) {
    return res.status(404).json({ error: 'Không tìm thấy học sinh.' });
  }

  if (attendedPeriods !== undefined) {
    student.attendedPeriods = Number(attendedPeriods);
  }

  res.json(student);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`EduFee Server running on http://localhost:${PORT}`);
});