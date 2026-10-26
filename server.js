const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

// Thêm thư viện Cloudinary & Storage
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ==========================================
// 1. KHỞI TẠO EXPRESS APP & MIDDLEWARE CƠ BẢN
// ==========================================
const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 2. CẤU HÌNH CLOUDINARY (LƯU TẢI FILE MÂY)
// ==========================================
// ⚠️ Thay 3 thông số bên dưới bằng Key lấy từ Dashboard Cloudinary của bạn:
cloudinary.config({
  cloud_name: ' cj8k6qmg',
  api_key: '312531395222632',
  api_secret: 'bYl03ernzb3Iqd_EAwNKQyKWMXY'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'edufee_uploads', // Tên thư mục lưu trữ trên Cloudinary
    resource_type: 'auto',   // Tự động nhận diện Ảnh, Video, PDF
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return uniqueSuffix;
    }
  }
});

const upload = multer({ storage });

// ==========================================
// 3. CẤU HÌNH ĐƯỜNG DẪN DỮ LIỆU JSON & AUTH
// ==========================================
const DATA_FILE = path.join(__dirname, 'data', 'students.json');
const postsFilePath = path.join(__dirname, 'data', 'posts.json');
const commentsFilePath = path.join(__dirname, 'data', 'comments.json');

const JWT_SECRET = 'edufee_math_classic_secret_key_2026';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('15112006', 10); // Mật khẩu Admin: 15112006

const BANK_CONFIG = {
  bankId: "970418",
  accountNo: "8813196135",
  accountName: "THAI HUU PHUC",
};

// Dữ liệu học sinh mặc định nếu file chưa tồn tại
const DEFAULT_STUDENTS = [
  {
    id: 1,
    name: "An Khang",
    grade: "10",
    feePerPeriod: 350000,
    monthlyFee: 350000,
    month: "10/2026",
    status: "PAID",
    attendanceLogs: [
      {
        date: "2026-10-26",
        status: "ABSENT",
        note: "Đại số §1"
      }
    ],
    paymentHistory: []
  }
];

// ==========================================
// 4. HÀM BỔ TRỢ ĐỌC / GHI DỮ LIỆU
// ==========================================

// Đọc dữ liệu Học sinh từ students.json
const readStudentsData = () => {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_STUDENTS, null, 2), 'utf-8');
      return DEFAULT_STUDENTS;
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Lỗi đọc file students.json:', err);
    return DEFAULT_STUDENTS;
  }
};

// Ghi dữ liệu Học sinh vào students.json
const writeStudentsData = (data) => {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Lỗi ghi file students.json:', err);
  }
};

// Đọc dữ liệu EduFeed (Posts & Comments)
const readFeedData = (filePath) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error(`Lỗi đọc file ${filePath}:`, err);
    return [];
  }
};

// Ghi dữ liệu EduFeed (Posts & Comments)
const writeFeedData = (filePath, data) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Lỗi ghi file ${filePath}:`, err);
  }
};

// Middleware xác thực Admin
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Yêu cầu đăng nhập Admin.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Phiên đăng nhập không hợp lệ.' });
    req.user = user;
    next();
  });
};

const lookupLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: 'Thao tác quá nhanh. Vui lòng thử lại sau 1 phút.' }
});

// Mở quyền truy cập tĩnh thư mục uploads (Vẫn giữ dự phòng)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// API UPLOAD FILE LÊN CLOUDINARY (Đã hỗ trợ Tiếng Việt & Cloud Storage)
// ==========================================
app.post('/api/upload', authenticateAdmin, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Chưa chọn file để tải lên.' });
    }

    // Chuyển đổi tên file gốc từ latin1 sang UTF-8 để giữ nguyên tiếng Việt có dấu
    const originalFileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    // req.file.path là URL mây trực tiếp do Cloudinary cấp
    const fileUrl = req.file.path; 

    res.json({
      success: true,
      fileUrl,
      fileName: originalFileName,
      fileType: req.file.mimetype
    });
  } catch (error) {
    console.error('Lỗi upload file Cloudinary:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tải file lên Cloudinary.' });
  }
});

// ==========================================
// 5. API PUBLIC: TRA CỨU HỌC SINH
// ==========================================
app.post('/api/public/lookup', lookupLimiter, (req, res) => {
  const { fullName, grade } = req.body;
  if (!fullName || !grade) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ Họ tên và Lớp.' });
  }

  const students = readStudentsData();
  const student = students.find(s =>
    s.name.trim().toLowerCase() === fullName.trim().toLowerCase() &&
    String(s.grade).trim().toLowerCase() === String(grade).trim().toLowerCase()
  );

  if (!student) {
    return res.status(404).json({ error: 'Không tìm thấy thông tin học sinh khớp dữ liệu.' });
  }

  const logs = student.attendanceLogs || [];
  const attendedPeriods = logs.filter(l => l.status === 'PRESENT').length;
  const totalFee = Number(student.monthlyFee) || 0;

  const params = new URLSearchParams({
    amount: String(totalFee),
    addInfo: `Hoc phi Thang ${student.month || '10/2026'} ${student.name} Lop ${student.grade}`,
    accountName: BANK_CONFIG.accountName,
  });
  const qrUrl = `https://img.vietqr.io/image/${BANK_CONFIG.bankId}-${BANK_CONFIG.accountNo}-compact2.png?${params.toString()}`;

  res.json({
    id: student.id,
    name: student.name,
    grade: student.grade,
    month: student.month || '10/2026',
    monthlyFee: totalFee,
    feePerPeriod: student.feePerPeriod || 0,
    status: student.status,
    attendedPeriods,
    totalFee,
    qrUrl,
    attendanceLogs: logs,
    paymentHistory: student.paymentHistory || []
  });
});

// ==========================================
// 6. API AUTH: ĐĂNG NHẬP ADMIN
// ==========================================
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (!password || !bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    return res.status(400).json({ error: 'Mật khẩu quản trị không chính xác.' });
  }
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, message: 'Đăng nhập thành công.' });
});

// ==========================================
// 7. API ADMIN: LẤY DANH SÁCH HỌC SINH
// ==========================================
app.get('/api/students', authenticateAdmin, (req, res) => {
  const students = readStudentsData();
  const data = students.map(s => {
    const logs = s.attendanceLogs || [];
    const attendedPeriods = logs.filter(l => l.status === 'PRESENT').length;
    const totalFee = Number(s.monthlyFee) || 0;

    const params = new URLSearchParams({
      amount: String(totalFee),
      addInfo: `Hoc phi Thang ${s.month || '10/2026'} ${s.name} Lop ${s.grade}`,
      accountName: BANK_CONFIG.accountName,
    });
    const qrUrl = `https://img.vietqr.io/image/${BANK_CONFIG.bankId}-${BANK_CONFIG.accountNo}-compact2.png?${params.toString()}`;

    return { 
      ...s, 
      paymentHistory: s.paymentHistory || [],
      attendedPeriods, 
      totalFee, 
      qrUrl 
    };
  });
  res.json(data);
});

// ==========================================
// 8. API ADMIN: THÊM HỌC SINH MỚI
// ==========================================
app.post('/api/students', authenticateAdmin, (req, res) => {
  const { name, grade, monthlyFee, feePerPeriod, month, status } = req.body;
  if (!name || !grade) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ tên và lớp.' });
  }

  const students = readStudentsData();
  const newStudent = {
    id: students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1,
    name: name.trim(),
    grade: String(grade).trim(),
    feePerPeriod: Number(feePerPeriod) || Number(monthlyFee) || 350000,
    monthlyFee: Number(monthlyFee) || 350000,
    month: month || '10/2026',
    status: status || 'UNPAID',
    attendanceLogs: [],
    paymentHistory: []
  };

  students.push(newStudent);
  writeStudentsData(students);
  res.status(201).json(newStudent);
});

// ==========================================
// 9. API ADMIN: CẬP NHẬT THÔNG TIN HỌC SINH
// ==========================================
app.patch('/api/students/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { name, grade, monthlyFee, feePerPeriod, month, status } = req.body;

  const students = readStudentsData();
  const student = students.find(s => s.id === parseInt(id));

  if (!student) return res.status(404).json({ error: 'Không tìm thấy học sinh.' });

  if (name !== undefined) student.name = name.trim();
  if (grade !== undefined) student.grade = String(grade).trim();
  if (feePerPeriod !== undefined) student.feePerPeriod = Math.max(0, Number(feePerPeriod));
  if (monthlyFee !== undefined) student.monthlyFee = Math.max(0, Number(monthlyFee));
  if (month !== undefined) student.month = String(month).trim();
  if (status !== undefined) student.status = status;

  writeStudentsData(students);
  res.json(student);
});

// ==========================================
// 10. API ADMIN: XÓA HỌC SINH
// ==========================================
app.delete('/api/students/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  let students = readStudentsData();
  const index = students.findIndex(s => s.id === parseInt(id));

  if (index === -1) return res.status(404).json({ error: 'Không tìm thấy học sinh cần xóa.' });

  const deletedStudent = students.splice(index, 1)[0];
  writeStudentsData(students);
  res.json({ message: 'Đã xóa học sinh thành công.', student: deletedStudent });
});

// ==========================================
// 11. API ADMIN: THAO TÁC HÀNG LOẠT
// ==========================================
app.post('/api/students/batch', authenticateAdmin, (req, res) => {
  const { ids, action, status } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Danh sách ID không hợp lệ.' });

  let students = readStudentsData();
  if (action === 'DELETE') {
    students = students.filter(s => !ids.includes(s.id));
  } else if (action === 'UPDATE_STATUS') {
    students = students.map(s => ids.includes(s.id) ? { ...s, status: status || 'PAID' } : s);
  }

  writeStudentsData(students);
  res.json({ message: 'Xử lý hàng loạt thành công.', totalAffected: ids.length });
});

// ==========================================
// 12. API ADMIN: ĐIỂM DANH THEO LỚP & NGÀY
// ==========================================
app.post('/api/attendance/batch', authenticateAdmin, (req, res) => {
  const { date, records, note } = req.body;
  if (!date || !Array.isArray(records)) return res.status(400).json({ error: 'Dữ liệu điểm danh không hợp lệ.' });

  let students = readStudentsData();
  records.forEach(rec => {
    const student = students.find(s => s.id === rec.studentId);
    if (student) {
      if (!student.attendanceLogs) student.attendanceLogs = [];
      const existingIdx = student.attendanceLogs.findIndex(l => l.date === date);
      const logItem = { date, status: rec.status, note: note || 'Buổi học định kỳ' };
      
      if (existingIdx >= 0) {
        student.attendanceLogs[existingIdx] = logItem;
      } else {
        student.attendanceLogs.push(logItem);
      }
    }
  });

  writeStudentsData(students);
  res.json({ message: 'Lưu điểm danh thành công.', total: records.length });
});

// ==========================================
// 13. API ADMIN: ROLLOVER (CHUYỂN THÁNG HỌC PHÍ MỚI)
// ==========================================
app.post('/api/students/rollover', authenticateAdmin, (req, res) => {
  try {
    const { targetMonth } = req.body;
    if (!targetMonth) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tháng mục tiêu (VD: 11/2026).' });
    }

    const students = readStudentsData();

    const updatedStudents = students.map(student => {
      const history = student.paymentHistory || [];

      history.push({
        month: student.month || 'Không xác định',
        monthlyFee: student.monthlyFee,
        status: student.status,
        archivedAt: new Date().toISOString()
      });

      return {
        ...student,
        month: String(targetMonth).trim(),
        status: 'UNPAID',
        paymentHistory: history
      };
    });

    writeStudentsData(updatedStudents);

    res.json({
      message: `Đã chuyển thành công ${updatedStudents.length} học sinh sang tháng ${targetMonth}.`,
      count: updatedStudents.length,
      targetMonth
    });
  } catch (error) {
    console.error('Lỗi khi thực hiện Rollover:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra khi thực hiện chuyển tháng.' });
  }
});

// ==========================================
// 14. EDUFEED API ENDPOINTS
// ==========================================

// GET /api/posts - Lấy danh sách bài viết
app.get('/api/posts', (req, res) => {
  try {
    const { grade } = req.query;
    let posts = readFeedData(postsFilePath);

    if (grade && grade !== 'ALL') {
      posts = posts.filter(p => String(p.grade) === String(grade));
    }

    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách bài viết.' });
  }
});

// POST /api/posts - Đăng bài viết mới
app.post('/api/posts', authenticateAdmin, (req, res) => {
  try {
    const { title, content, grade, attachments } = req.body;

    if (!title || !content || !grade) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tiêu đề, nội dung và khối lớp.' });
    }

    const posts = readFeedData(postsFilePath);
    const newPost = {
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      grade: String(grade),
      attachments: attachments || [],
      createdAt: new Date().toISOString(),
      likes: 0
    };

    posts.unshift(newPost);
    writeFeedData(postsFilePath, posts);

    res.status(201).json({ success: true, data: newPost, message: 'Đăng bài viết thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng bài viết.' });
  }
});

// DELETE /api/posts/:id - Xóa bài viết
app.delete('/api/posts/:id', authenticateAdmin, (req, res) => {
  try {
    const { id } = req.params;
    let posts = readFeedData(postsFilePath);
    const initialLength = posts.length;
    posts = posts.filter(p => String(p.id) !== String(id));

    if (posts.length === initialLength) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
    }

    writeFeedData(postsFilePath, posts);
    res.json({ success: true, message: 'Đã xóa bài viết thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa bài viết.' });
  }
});

// POST /api/posts/:id/like - Thả tim bài viết
app.post('/api/posts/:id/like', (req, res) => {
  try {
    const { id } = req.params;
    const posts = readFeedData(postsFilePath);
    const postIndex = posts.findIndex(p => String(p.id) === String(id));

    if (postIndex === -1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });
    }

    posts[postIndex].likes = (posts[postIndex].likes || 0) + 1;
    writeFeedData(postsFilePath, posts);

    res.json({ success: true, data: posts[postIndex] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi thả tim.' });
  }
});

// GET /api/posts/:id/comments - Lấy danh sách bình luận
app.get('/api/posts/:id/comments', (req, res) => {
  try {
    const { id } = req.params;
    const comments = readFeedData(commentsFilePath);
    const postComments = comments.filter(c => String(c.postId) === String(id));

    res.json({ success: true, data: postComments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy bình luận.' });
  }
});

// POST /api/posts/:id/comments - Gửi bình luận mới
app.post('/api/posts/:id/comments', (req, res) => {
  try {
    const { id } = req.params;
    const { author, text, isAdmin } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Nội dung bình luận không được để trống.' });
    }

    if (text.length > 500) {
      return res.status(400).json({ success: false, message: 'Bình luận vượt quá giới hạn 500 ký tự.' });
    }

    const comments = readFeedData(commentsFilePath);
    const newComment = {
      id: Date.now().toString(),
      postId: String(id),
      author: author && author.trim() !== '' ? author.trim() : 'Học sinh',
      role: isAdmin ? 'teacher' : 'student',
      text: text.trim(),
      createdAt: new Date().toISOString()
    };

    comments.push(newComment);
    writeFeedData(commentsFilePath, comments);

    res.status(201).json({ success: true, data: newComment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi bình luận.' });
  }
});

// KHỞI CHẠY SERVER
// DÙNG CỔNG DỘNG CỦA RENDER CẤP HOẶC CỔNG 3000 KHI CHẠY LOCAL
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`EduFee Server running on port ${PORT}`));