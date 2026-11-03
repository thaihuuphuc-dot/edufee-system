const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const mongoose = require('mongoose');

// ==========================================
// KẾT NỐI MONGODB ATLAS CLOUD
// ==========================================
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://HuuPhuc:Huuphuc1511@cluster0-shard-00-00.kf1zbxe.mongodb.net:27017,cluster0-shard-00-01.kf1zbxe.mongodb.net:27017,cluster0-shard-00-02.kf1zbxe.mongodb.net:27017/edufee_db?ssl=true&replicaSet=atlas-13o6g0-shard-0&authSource=admin&retryWrites=true&w=majority";

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Đã kết nối thành công với MongoDB Atlas Cloud!');
    seedInitialStudents(); // Kiểm tra và sync dữ liệu ban đầu từ students.json nếu DB trống
  })
  .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// 1. Schema Học sinh (Students) - MỚI
const studentSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  grade: { type: String, required: true },
  feePerPeriod: { type: Number, default: 350000 },
  monthlyFee: { type: Number, default: 350000 },
  month: { type: String, default: '10/2026' },
  status: { type: String, default: 'UNPAID' },
  attendanceLogs: { type: Array, default: [] },
  paymentHistory: { type: Array, default: [] }
}, { timestamps: true });

const Student = mongoose.model('Student', studentSchema);

// 2. Schema Bài Viết (Posts)
const postSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  grade: { type: String, required: true },
  content: { type: String, required: true },
  attachments: { type: Array, default: [] },
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', postSchema);

// 3. Schema Bình Luận (Comments)
const commentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  postId: { type: String, required: true },
  author: { type: String, default: 'Học sinh' },
  role: { type: String, default: 'student' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', commentSchema);

// Thư viện Cloudinary & Storage
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
cloudinary.config({
  cloud_name: 'cj8k6qmg',
  api_key: '312531395222632',
  api_secret: 'bYl03ernzb3Iqd_EAwNKQyKWMXY'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'edufee_uploads',
    resource_type: 'auto',
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return uniqueSuffix;
    }
  }
});

const upload = multer({ storage });

// ==========================================
// 3. CẤU HÌNH AUTH & THÔNG TIN NGÂN HÀNG
// ==========================================
const JWT_SECRET = 'edufee_math_classic_secret_key_2026';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('15112006', 10);

const BANK_CONFIG = {
  bankId: "970418",
  accountNo: "8813196135",
  accountName: "THAI HUU PHUC",
};

// ==========================================
// 4. HÀM TỰ ĐỘNG SYNC DỮ LIỆU CŨ LÊN MONGODB (Chạy 1 lần khi DB trống)
// ==========================================
async function seedInitialStudents() {
  try {
    const count = await Student.countDocuments();
    if (count === 0) {
      const jsonPath = path.join(__dirname, 'data', 'students.json');
      if (fs.existsSync(jsonPath)) {
        const rawData = fs.readFileSync(jsonPath, 'utf-8');
        const students = JSON.parse(rawData || '[]');
        if (students.length > 0) {
          await Student.insertMany(students);
          console.log('📦 Đã tự động chuyển dữ liệu từ students.json lên MongoDB Atlas!');
        }
      }
    }
  } catch (err) {
    console.error('Lỗi khi seed dữ liệu học sinh:', err);
  }
}

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

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API UPLOAD FILE LÊN CLOUDINARY
app.post('/api/upload', authenticateAdmin, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Chưa chọn file để tải lên.' });
    }
    const originalFileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
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
// 5. API PUBLIC: TRA CỨU HỌC SINH (DÙNG MONGODB)
// ==========================================
app.post('/api/public/lookup', lookupLimiter, async (req, res) => {
  try {
    const { fullName, grade } = req.body;
    if (!fullName || !grade) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ Họ tên và Lớp.' });
    }

    const student = await Student.findOne({
      name: new RegExp(`^${fullName.trim()}$`, 'i'),
      grade: String(grade).trim()
    });

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
  } catch (error) {
    res.status(500).json({ error: 'Lỗi tra cứu thông tin học sinh.' });
  }
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
// 7. API ADMIN: LẤY DANH SÁCH HỌC SINH (DÙNG MONGODB)
// ==========================================
app.get('/api/students', authenticateAdmin, async (req, res) => {
  try {
    const students = await Student.find().sort({ id: 1 });
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
        ...s.toObject(), 
        paymentHistory: s.paymentHistory || [],
        attendedPeriods, 
        totalFee, 
        qrUrl 
      };
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách học sinh.' });
  }
});

// ==========================================
// 8. API ADMIN: THÊM HỌC SINH MỚI (DÙNG MONGODB)
// ==========================================
app.post('/api/students', authenticateAdmin, async (req, res) => {
  try {
    const { name, grade, monthlyFee, feePerPeriod, month, status } = req.body;
    if (!name || !grade) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ tên và lớp.' });
    }

    const maxStudent = await Student.findOne().sort({ id: -1 });
    const nextId = maxStudent ? maxStudent.id + 1 : 1;

    const newStudent = new Student({
      id: nextId,
      name: name.trim(),
      grade: String(grade).trim(),
      feePerPeriod: Number(feePerPeriod) || Number(monthlyFee) || 350000,
      monthlyFee: Number(monthlyFee) || 350000,
      month: month || '10/2026',
      status: status || 'UNPAID',
      attendanceLogs: [],
      paymentHistory: []
    });

    await newStudent.save();
    res.status(201).json(newStudent);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi thêm học sinh mới.' });
  }
});

// ==========================================
// 9. API ADMIN: CẬP NHẬT THÔNG TIN HỌC SINH (DÙNG MONGODB)
// ==========================================
app.patch('/api/students/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, grade, monthlyFee, feePerPeriod, month, status } = req.body;

    const student = await Student.findOne({ id: Number(id) });
    if (!student) return res.status(404).json({ error: 'Không tìm thấy học sinh.' });

    if (name !== undefined) student.name = name.trim();
    if (grade !== undefined) student.grade = String(grade).trim();
    if (feePerPeriod !== undefined) student.feePerPeriod = Math.max(0, Number(feePerPeriod));
    if (monthlyFee !== undefined) student.monthlyFee = Math.max(0, Number(monthlyFee));
    if (month !== undefined) student.month = String(month).trim();
    if (status !== undefined) student.status = status;

    await student.save();
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi cập nhật học sinh.' });
  }
});

// ==========================================
// 10. API ADMIN: XÓA HỌC SINH (DÙNG MONGODB)
// ==========================================
app.delete('/api/students/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedStudent = await Student.findOneAndDelete({ id: Number(id) });

    if (!deletedStudent) return res.status(404).json({ error: 'Không tìm thấy học sinh cần xóa.' });

    res.json({ message: 'Đã xóa học sinh thành công.', student: deletedStudent });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi xóa học sinh.' });
  }
});


// ==========================================
// API XÓA BÌNH LUẬN (CHỈ DÀNH CHO ADMIN)
// ==========================================
app.delete('/api/comments/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm và xóa bình luận từ MongoDB Atlas
    const deletedComment = await Comment.findByIdAndDelete(id);

    if (!deletedComment) {
      return res.status(404).json({ message: 'Không tìm thấy bình luận cần xóa.' });
    }

    res.json({ message: 'Đã xóa bình luận thành công.', commentId: id });
  } catch (error) {
    console.error('Lỗi khi xóa bình luận:', error);
    res.status(500).json({ message: 'Lỗi server khi xử lý xóa bình luận.' });
  }
});


// ==========================================
// 11. API ADMIN: THAO TÁC HÀNG LOẠT (DÙNG MONGODB)
// ==========================================
app.post('/api/students/batch', authenticateAdmin, async (req, res) => {
  try {
    const { ids, action, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Danh sách ID không hợp lệ.' });

    if (action === 'DELETE') {
      await Student.deleteMany({ id: { $in: ids } });
    } else if (action === 'UPDATE_STATUS') {
      await Student.updateMany({ id: { $in: ids } }, { $set: { status: status || 'PAID' } });
    }

    res.json({ message: 'Xử lý hàng loạt thành công.', totalAffected: ids.length });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi xử lý hàng loạt.' });
  }
});

// ==========================================
// 12. API ADMIN: ĐIỂM DANH THEO LỚP & NGÀY (DÙNG MONGODB)
// ==========================================
app.post('/api/attendance/batch', authenticateAdmin, async (req, res) => {
  try {
    const { date, records, note } = req.body;
    if (!date || !Array.isArray(records)) return res.status(400).json({ error: 'Dữ liệu điểm danh không hợp lệ.' });

    for (const rec of records) {
      const student = await Student.findOne({ id: rec.studentId });
      if (student) {
        if (!student.attendanceLogs) student.attendanceLogs = [];
        const existingIdx = student.attendanceLogs.findIndex(l => l.date === date);
        const logItem = { date, status: rec.status, note: note || 'Buổi học định kỳ' };
        
        if (existingIdx >= 0) {
          student.attendanceLogs[existingIdx] = logItem;
        } else {
          student.attendanceLogs.push(logItem);
        }
        
        student.markModified('attendanceLogs');
        await student.save();
      }
    }

    res.json({ message: 'Lưu điểm danh thành công.', total: records.length });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi lưu điểm danh.' });
  }
});

// ==========================================
// 13. API ADMIN: ROLLOVER (CHUYỂN THÁNG HỌC PHÍ MỚI - DÙNG MONGODB)
// ==========================================
app.post('/api/students/rollover', authenticateAdmin, async (req, res) => {
  try {
    const { targetMonth } = req.body;
    if (!targetMonth) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tháng mục tiêu (VD: 11/2026).' });
    }

    const students = await Student.find();

    for (const student of students) {
      const history = student.paymentHistory || [];
      history.push({
        month: student.month || 'Không xác định',
        monthlyFee: student.monthlyFee,
        status: student.status,
        archivedAt: new Date().toISOString()
      });

      student.month = String(targetMonth).trim();
      student.status = 'UNPAID';
      student.paymentHistory = history;
      student.markModified('paymentHistory');
      
      await student.save();
    }

    res.json({
      message: `Đã chuyển thành công ${students.length} học sinh sang tháng ${targetMonth}.`,
      count: students.length,
      targetMonth
    });
  } catch (error) {
    console.error('Lỗi khi thực hiện Rollover:', error);
    res.status(500).json({ error: 'Có lỗi xảy ra khi thực hiện chuyển tháng.' });
  }
});

// ==========================================
// 14. EDUFEED API ENDPOINTS (DÙNG MONGODB ATLAS)
// ==========================================
app.get('/api/posts', async (req, res) => {
  try {
    const { grade } = req.query;
    const query = (grade && grade !== 'ALL') ? { grade: String(grade) } : {};
    const posts = await Post.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách bài viết.' });
  }
});

app.post('/api/posts', authenticateAdmin, async (req, res) => {
  try {
    const { title, content, grade, attachments } = req.body;
    if (!title || !content || !grade) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ tiêu đề, nội dung và khối lớp.' });
    }

    const newPost = new Post({
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      grade: String(grade),
      attachments: attachments || [],
      likes: 0,
      createdAt: new Date()
    });

    await newPost.save();
    res.status(201).json({ success: true, data: newPost, message: 'Đăng bài viết thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng bài viết.' });
  }
});

app.delete('/api/posts/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPost = await Post.findOneAndDelete({ id: String(id) });
    if (!deletedPost) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });

    await Comment.deleteMany({ postId: String(id) });
    res.json({ success: true, message: 'Đã xóa bài viết và các bình luận liên quan thành công.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa bài viết.' });
  }
});

app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findOne({ id: String(id) });
    if (!post) return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết.' });

    post.likes = (post.likes || 0) + 1;
    await post.save();
    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi thả tim.' });
  }
});

app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await Comment.find({ postId: String(id) }).sort({ createdAt: 1 });
    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy bình luận.' });
  }
});

app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { author, text, isAdmin } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Nội dung bình luận không được để trống.' });
    }

    const newComment = new Comment({
      id: Date.now().toString(),
      postId: String(id),
      author: author && author.trim() !== '' ? author.trim() : 'Học sinh',
      role: isAdmin ? 'teacher' : 'student',
      text: text.trim(),
      createdAt: new Date()
    });

    await newComment.save();
    res.status(201).json({ success: true, data: newComment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi bình luận.' });
  }
});

// ==========================================
// 15. CẤU HÌNH PHỤC VỤ FRONTEND REACT (DIST)
// ==========================================
app.use(express.static(path.join(__dirname, 'client', 'dist')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API Endpoint không tồn tại' });
  }
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

// KHỞI CHẠY SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`EduFee Server running on port ${PORT}`));