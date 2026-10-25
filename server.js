const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Đường dẫn file lưu trữ dữ liệu JSON
const DATA_FILE = path.join(__dirname, 'data', 'students.json');

// Cấu hình tài khoản thanh toán BIDV
const BANK_CONFIG = {
  bankId: "970418", // Mã BIN BIDV (QuickLink VietQR)
  accountNo: "8813196135",
  accountName: "THAI HUU PHUC",
};

// Dữ liệu mặc định khởi tạo nếu chưa có file JSON
const DEFAULT_STUDENTS = [
  { id: 1, name: 'Nguyễn Văn A', grade: '10A1', feePerPeriod: 150000, attendedPeriods: 8, status: 'PAID' },
  { id: 2, name: 'Trần Thị B', grade: '10A2', feePerPeriod: 150000, attendedPeriods: 10, status: 'UNPAID' },
  { id: 3, name: 'Lê Hoàng C', grade: '10A1', feePerPeriod: 150000, attendedPeriods: 6, status: 'UNPAID' }
];

// Hàm đọc dữ liệu từ file JSON
const readData = () => {
  try {
    // Tạo thư mục /data/ nếu chưa tồn tại
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Nếu chưa có file students.json, tạo mới với dữ liệu mẫu
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_STUDENTS, null, 2), 'utf-8');
      return DEFAULT_STUDENTS;
    }

    const fileData = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(fileData);
  } catch (err) {
    console.error('Lỗi khi đọc file JSON:', err);
    return DEFAULT_STUDENTS;
  }
};

// Hàm ghi dữ liệu vào file JSON
const writeData = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Lỗi khi ghi dữ liệu vào file JSON:', err);
  }
};

// 1. Healthcheck Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'edufee-api', storage: 'file-json' });
});

// 2. Lấy danh sách học sinh (Tính totalFee, qrUrl động và giữ nguyên status)
app.get('/api/students', (req, res) => {
  const students = readData();
  const data = students.map(s => {
    const totalFee = (Number(s.feePerPeriod) || 0) * (Number(s.attendedPeriods) || 0);
    const description = `Hoc phi ${s.name} ${s.grade}`;
    const params = new URLSearchParams({
      amount: String(totalFee),
      addInfo: description,
      accountName: BANK_CONFIG.accountName,
    });
    const qrUrl = `https://img.vietqr.io/image/${BANK_CONFIG.bankId}-${BANK_CONFIG.accountNo}-compact2.png?${params.toString()}`;
    return { ...s, totalFee, qrUrl };
  });
  res.json(data);
});

// 3. Thêm học sinh mới
app.post('/api/students', (req, res) => {
  const { name, grade, feePerPeriod, attendedPeriods, status } = req.body;
  if (!name || !grade) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ tên và lớp.' });
  }

  const students = readData();
  const newStudent = {
    id: students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1,
    name,
    grade,
    feePerPeriod: Number(feePerPeriod) || 150000,
    attendedPeriods: Number(attendedPeriods) || 0,
    status: status || 'UNPAID' // Mặc định là chưa thanh toán
  };

  students.push(newStudent);
  writeData(students); // Lưu bền vững vào data/students.json

  res.status(201).json(newStudent);
});

// 4. Cập nhật số buổi học (attendedPeriods) và/hoặc trạng thái thanh toán (status)
app.patch('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const { attendedPeriods, status } = req.body;

  const students = readData();
  const student = students.find(s => s.id === parseInt(id));

  if (!student) {
    return res.status(404).json({ error: 'Không tìm thấy học sinh.' });
  }

  // Cập nhật số buổi
  if (attendedPeriods !== undefined) {
    student.attendedPeriods = Math.max(0, Number(attendedPeriods));
  }

  // Cập nhật trạng thái thanh toán (PAID / UNPAID)
  if (status !== undefined) {
    student.status = status;
  }

  writeData(students); // Lưu bền vững vào file JSON
  res.json(student);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`EduFee Server running on http://localhost:${PORT}`);
  console.log(`Database File Location: ${DATA_FILE}`);
});
// 5. Xóa học sinh theo ID
app.delete('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const studentId = parseInt(id);

  let students = readData();
  const index = students.findIndex(s => s.id === studentId);

  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy học sinh cần xóa.' });
  }

  // Loại bỏ học sinh khỏi danh sách
  const deletedStudent = students.splice(index, 1)[0];
  
  // Lưu thay đổi vào file JSON
  writeData(students);

  res.json({ message: 'Đã xóa học sinh thành công.', student: deletedStudent });
});