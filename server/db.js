const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// On Netlify, copy bundled DB to writable /tmp; locally use project root
let dbPath = path.join(__dirname, '..', 'employee.db');
if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const tmpDb = '/tmp/employee.db';
  const srcDb = path.join(__dirname, '..', 'employee.db');
  if (!fs.existsSync(tmpDb) && fs.existsSync(srcDb)) {
    fs.copyFileSync(srcDb, tmpDb);
  }
  dbPath = tmpDb;
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    department TEXT,
    designation TEXT,
    joiningDate TEXT,
    managerId INTEGER REFERENCES employees(id),
    role TEXT DEFAULT 'employee' CHECK(role IN ('admin','manager','employee')),
    avatar TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
    dateOfBirth TEXT,
    bloodGroup TEXT,
    address TEXT,
    emergencyContactName TEXT,
    emergencyContactPhone TEXT,
    gender TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leave_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    defaultBalance INTEGER NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS leave_balances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL REFERENCES employees(id),
    leaveTypeId INTEGER NOT NULL REFERENCES leave_types(id),
    total INTEGER NOT NULL,
    used INTEGER DEFAULT 0,
    UNIQUE(employeeId, leaveTypeId)
  );

  CREATE TABLE IF NOT EXISTS leave_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL REFERENCES employees(id),
    leaveTypeId INTEGER NOT NULL REFERENCES leave_types(id),
    fromDate TEXT NOT NULL,
    toDate TEXT NOT NULL,
    days REAL NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending_manager' CHECK(status IN ('pending_manager','pending_hr','approved','rejected')),
    managerApprovedBy INTEGER REFERENCES employees(id),
    managerRemarks TEXT,
    managerActionDate TEXT,
    hrApprovedBy INTEGER REFERENCES employees(id),
    hrRemarks TEXT,
    hrActionDate TEXT,
    appliedOn TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL REFERENCES employees(id),
    date TEXT NOT NULL,
    checkIn TEXT,
    checkOut TEXT,
    status TEXT DEFAULT 'present' CHECK(status IN ('present','absent','halfday','late','weekend','holiday')),
    workHours REAL,
    UNIQUE(employeeId, date)
  );

  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT DEFAULT 'national' CHECK(type IN ('national','optional','restricted'))
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
    createdBy INTEGER REFERENCES employees(id),
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER REFERENCES employees(id),
    action TEXT NOT NULL,
    target TEXT,
    details TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  -- Notifications
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES employees(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK(type IN ('info','success','warning','error','leave','attendance','expense','performance','ticket')),
    isRead INTEGER DEFAULT 0,
    link TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  -- Documents
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER REFERENCES employees(id),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    filePath TEXT NOT NULL,
    fileSize INTEGER,
    uploadedBy INTEGER REFERENCES employees(id),
    isCompanyDoc INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  -- Expense categories
  CREATE TABLE IF NOT EXISTS expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    maxLimit REAL,
    description TEXT
  );

  -- Expenses
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL REFERENCES employees(id),
    categoryId INTEGER NOT NULL REFERENCES expense_categories(id),
    amount REAL NOT NULL,
    description TEXT,
    receiptPath TEXT,
    expenseDate TEXT NOT NULL,
    status TEXT DEFAULT 'pending_manager' CHECK(status IN ('pending_manager','pending_finance','approved','rejected')),
    managerApprovedBy INTEGER REFERENCES employees(id),
    managerRemarks TEXT,
    financeApprovedBy INTEGER REFERENCES employees(id),
    financeRemarks TEXT,
    submittedOn TEXT DEFAULT (datetime('now'))
  );

  -- Salary structures
  CREATE TABLE IF NOT EXISTS salary_structures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL REFERENCES employees(id),
    basicSalary REAL NOT NULL,
    hra REAL DEFAULT 0,
    transportAllowance REAL DEFAULT 0,
    medicalAllowance REAL DEFAULT 0,
    specialAllowance REAL DEFAULT 0,
    providentFund REAL DEFAULT 0,
    professionalTax REAL DEFAULT 0,
    incomeTax REAL DEFAULT 0,
    effectiveFrom TEXT NOT NULL,
    UNIQUE(employeeId)
  );

  -- Payslips
  CREATE TABLE IF NOT EXISTS payslips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL REFERENCES employees(id),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    basicSalary REAL,
    hra REAL,
    transportAllowance REAL,
    medicalAllowance REAL,
    specialAllowance REAL,
    grossSalary REAL,
    providentFund REAL,
    professionalTax REAL,
    incomeTax REAL,
    totalDeductions REAL,
    netSalary REAL,
    workingDays INTEGER,
    presentDays INTEGER,
    leaveDays INTEGER,
    pdfPath TEXT,
    status TEXT DEFAULT 'generated' CHECK(status IN ('generated','paid')),
    generatedOn TEXT DEFAULT (datetime('now')),
    UNIQUE(employeeId, month, year)
  );

  -- Performance reviews
  CREATE TABLE IF NOT EXISTS performance_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL REFERENCES employees(id),
    reviewerId INTEGER NOT NULL REFERENCES employees(id),
    reviewPeriod TEXT NOT NULL,
    rating REAL CHECK(rating >= 1 AND rating <= 5),
    strengths TEXT,
    improvements TEXT,
    goals TEXT,
    comments TEXT,
    selfRating REAL CHECK(selfRating >= 1 AND selfRating <= 5),
    selfComments TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','self_review','manager_review','completed')),
    createdAt TEXT DEFAULT (datetime('now'))
  );

  -- Goals / OKRs
  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL REFERENCES employees(id),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'performance',
    targetDate TEXT,
    progress INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
    status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','cancelled')),
    createdAt TEXT DEFAULT (datetime('now'))
  );

  -- Training programs
  CREATE TABLE IF NOT EXISTS training_programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    instructor TEXT,
    startDate TEXT,
    endDate TEXT,
    maxParticipants INTEGER,
    category TEXT,
    mode TEXT DEFAULT 'online' CHECK(mode IN ('online','offline','hybrid')),
    status TEXT DEFAULT 'upcoming' CHECK(status IN ('upcoming','ongoing','completed','cancelled')),
    createdBy INTEGER REFERENCES employees(id),
    createdAt TEXT DEFAULT (datetime('now'))
  );

  -- Training enrollments
  CREATE TABLE IF NOT EXISTS training_enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    programId INTEGER NOT NULL REFERENCES training_programs(id),
    employeeId INTEGER NOT NULL REFERENCES employees(id),
    status TEXT DEFAULT 'enrolled' CHECK(status IN ('enrolled','completed','dropped')),
    completionDate TEXT,
    certificate TEXT,
    feedback TEXT,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    enrolledAt TEXT DEFAULT (datetime('now')),
    UNIQUE(programId, employeeId)
  );

  -- Employee skills
  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL REFERENCES employees(id),
    name TEXT NOT NULL,
    level TEXT DEFAULT 'beginner' CHECK(level IN ('beginner','intermediate','advanced','expert')),
    UNIQUE(employeeId, name)
  );

  -- Shifts
  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    graceMinutes INTEGER DEFAULT 15,
    description TEXT
  );

  -- Employee shift assignments
  CREATE TABLE IF NOT EXISTS employee_shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL REFERENCES employees(id),
    shiftId INTEGER NOT NULL REFERENCES shifts(id),
    fromDate TEXT NOT NULL,
    toDate TEXT,
    UNIQUE(employeeId, fromDate)
  );

  -- Overtime requests
  CREATE TABLE IF NOT EXISTS overtime_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL REFERENCES employees(id),
    date TEXT NOT NULL,
    hours REAL NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    approvedBy INTEGER REFERENCES employees(id),
    createdAt TEXT DEFAULT (datetime('now'))
  );

  -- Onboarding templates
  CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    assignTo TEXT DEFAULT 'employee' CHECK(assignTo IN ('employee','hr','it','manager')),
    daysToComplete INTEGER DEFAULT 7,
    sortOrder INTEGER DEFAULT 0
  );

  -- Onboarding progress per employee
  CREATE TABLE IF NOT EXISTS onboarding_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL REFERENCES employees(id),
    taskId INTEGER NOT NULL REFERENCES onboarding_tasks(id),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed')),
    completedAt TEXT,
    notes TEXT,
    UNIQUE(employeeId, taskId)
  );

  -- Exit/Resignation requests
  CREATE TABLE IF NOT EXISTS exit_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL REFERENCES employees(id),
    resignationDate TEXT NOT NULL,
    lastWorkingDate TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','completed')),
    approvedBy INTEGER REFERENCES employees(id),
    exitInterviewDone INTEGER DEFAULT 0,
    exitInterviewNotes TEXT,
    assetsReturned INTEGER DEFAULT 0,
    assetsNotes TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  -- Messages / Chat
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senderId INTEGER NOT NULL REFERENCES employees(id),
    receiverId INTEGER REFERENCES employees(id),
    channel TEXT,
    content TEXT NOT NULL,
    isRead INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  -- Company settings
  CREATE TABLE IF NOT EXISTS company_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    category TEXT DEFAULT 'general'
  );

  -- Company Policies
  CREATE TABLE IF NOT EXISTS company_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'General',
    filePath TEXT NOT NULL,
    fileName TEXT NOT NULL,
    fileSize INTEGER,
    uploadedBy INTEGER REFERENCES employees(id),
    updatedBy INTEGER REFERENCES employees(id),
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  -- NDA / Employment Agreements
  CREATE TABLE IF NOT EXISTS nda_agreements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    templatePath TEXT NOT NULL,
    templateName TEXT NOT NULL,
    templateSize INTEGER,
    uploadedBy INTEGER REFERENCES employees(id),
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  -- Employee signed/uploaded agreements
  CREATE TABLE IF NOT EXISTS employee_agreements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agreementId INTEGER NOT NULL REFERENCES nda_agreements(id),
    employeeId INTEGER NOT NULL REFERENCES employees(id),
    filePath TEXT NOT NULL,
    fileName TEXT NOT NULL,
    fileSize INTEGER,
    uploadedAt TEXT DEFAULT (datetime('now')),
    UNIQUE(agreementId, employeeId)
  );

  -- Asset Management
  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assetId TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Hardware',
    serialNumber TEXT,
    purchaseDate TEXT,
    purchaseCost REAL,
    condition TEXT DEFAULT 'good' CHECK(condition IN ('new','good','fair','poor','damaged')),
    assignedTo INTEGER REFERENCES employees(id),
    assignedDate TEXT,
    returnDate TEXT,
    status TEXT DEFAULT 'available' CHECK(status IN ('available','assigned','maintenance','retired')),
    notes TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  -- Loan/Advance Management
  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL REFERENCES employees(id),
    type TEXT DEFAULT 'salary_advance' CHECK(type IN ('salary_advance','personal_loan','emergency_loan')),
    amount REAL NOT NULL,
    reason TEXT,
    emiMonths INTEGER DEFAULT 1,
    emiAmount REAL,
    totalRepaid REAL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','active','completed')),
    approvedBy INTEGER REFERENCES employees(id),
    approvedDate TEXT,
    remarks TEXT,
    appliedOn TEXT DEFAULT (datetime('now'))
  );

  -- Loan repayments
  CREATE TABLE IF NOT EXISTS loan_repayments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loanId INTEGER NOT NULL REFERENCES loans(id),
    amount REAL NOT NULL,
    month INTEGER,
    year INTEGER,
    paidOn TEXT DEFAULT (datetime('now'))
  );

  -- Helpdesk / Support Tickets
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticketId TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT DEFAULT 'general' CHECK(category IN ('it','hr','finance','admin','general')),
    priority TEXT DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
    status TEXT DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed','reopened')),
    createdBy INTEGER NOT NULL REFERENCES employees(id),
    assignedTo INTEGER REFERENCES employees(id),
    resolvedBy INTEGER REFERENCES employees(id),
    resolvedAt TEXT,
    closedAt TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  -- Ticket comments / replies
  CREATE TABLE IF NOT EXISTS ticket_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticketId INTEGER NOT NULL REFERENCES tickets(id),
    userId INTEGER NOT NULL REFERENCES employees(id),
    comment TEXT NOT NULL,
    isInternal INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId, isRead);
  CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(employeeId, date);
  CREATE INDEX IF NOT EXISTS idx_leave_apps_emp ON leave_applications(employeeId);
  CREATE INDEX IF NOT EXISTS idx_leave_apps_status ON leave_applications(status);
  CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiverId, isRead);
  CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);
  CREATE INDEX IF NOT EXISTS idx_expenses_emp ON expenses(employeeId);
  CREATE INDEX IF NOT EXISTS idx_payslips_emp ON payslips(employeeId, year, month);
  CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(userId);
  CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(createdBy);
  CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assignedTo);
  CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
  CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticketId);
`);

// Seed data
function seed() {
  const empCount = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
  if (empCount > 0) return;

  const hash = bcrypt.hashSync('admin123', 10);
  const empHash = bcrypt.hashSync('emp123', 10);

  // Insert admin
  db.prepare(`INSERT INTO employees (employeeId, name, email, password, phone, department, designation, joiningDate, role, dateOfBirth, bloodGroup, gender, address, emergencyContactName, emergencyContactPhone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'EMP001', 'Rajesh Kumar', 'admin@company.com', hash, '9876543210', 'Management', 'CEO', '2020-01-15', 'admin',
    '1980-05-15', 'B+', 'Male', '123 MG Road, Bangalore', 'Sunita Kumar', '9876543200'
  );

  // Insert managers
  const managers = [
    ['EMP002', 'Priya Sharma', 'priya@company.com', empHash, '9876543211', 'Engineering', 'Engineering Manager', '2020-03-01', 'manager', 1, '1988-07-22', 'A+', 'Female'],
    ['EMP003', 'Amit Patel', 'amit@company.com', empHash, '9876543212', 'HR', 'HR Manager', '2020-04-15', 'manager', 1, '1985-11-10', 'O+', 'Male'],
    ['EMP004', 'Sneha Reddy', 'sneha@company.com', empHash, '9876543213', 'Finance', 'Finance Manager', '2020-06-01', 'manager', 1, '1987-03-18', 'AB+', 'Female'],
    ['EMP005', 'Vikram Singh', 'vikram@company.com', empHash, '9876543214', 'Marketing', 'Marketing Manager', '2021-01-10', 'manager', 1, '1990-09-05', 'B-', 'Male'],
  ];

  const insertMgr = db.prepare(`INSERT INTO employees (employeeId, name, email, password, phone, department, designation, joiningDate, role, managerId, dateOfBirth, bloodGroup, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  managers.forEach(m => insertMgr.run(...m));

  // Insert employees
  const employees = [
    ['EMP006', 'Rahul Verma', 'rahul@company.com', empHash, '9876543215', 'Engineering', 'Senior Developer', '2021-02-01', 'employee', 2, '1993-01-20', 'A-', 'Male'],
    ['EMP007', 'Ananya Gupta', 'ananya@company.com', empHash, '9876543216', 'Engineering', 'Developer', '2021-06-15', 'employee', 2, '1995-04-12', 'O+', 'Female'],
    ['EMP008', 'Karthik Nair', 'karthik@company.com', empHash, '9876543217', 'Engineering', 'Junior Developer', '2022-01-10', 'employee', 2, '1998-08-30', 'B+', 'Male'],
    ['EMP009', 'Meera Joshi', 'meera@company.com', empHash, '9876543218', 'HR', 'HR Executive', '2021-08-01', 'employee', 3, '1994-12-05', 'A+', 'Female'],
    ['EMP010', 'Suresh Iyer', 'suresh@company.com', empHash, '9876543219', 'Finance', 'Accountant', '2021-09-15', 'employee', 4, '1992-06-25', 'O-', 'Male'],
    ['EMP011', 'Divya Menon', 'divya@company.com', empHash, '9876543220', 'Marketing', 'Marketing Executive', '2022-03-01', 'employee', 5, '1996-02-14', 'AB+', 'Female'],
    ['EMP012', 'Arjun Das', 'arjun@company.com', empHash, '9876543221', 'Engineering', 'QA Engineer', '2022-05-15', 'employee', 2, '1997-10-08', 'B+', 'Male'],
    ['EMP013', 'Pooja Kulkarni', 'pooja@company.com', empHash, '9876543222', 'HR', 'Recruiter', '2022-07-01', 'employee', 3, '1995-07-19', 'A+', 'Female'],
    ['EMP014', 'Nikhil Rao', 'nikhil@company.com', empHash, '9876543223', 'Finance', 'Financial Analyst', '2022-09-01', 'employee', 4, '1994-03-28', 'O+', 'Male'],
    ['EMP015', 'Sanya Chopra', 'sanya@company.com', empHash, '9876543224', 'Marketing', 'Content Writer', '2023-01-15', 'employee', 5, '1999-11-11', 'B-', 'Female'],
  ];

  const insertEmp = db.prepare(`INSERT INTO employees (employeeId, name, email, password, phone, department, designation, joiningDate, role, managerId, dateOfBirth, bloodGroup, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  employees.forEach(e => insertEmp.run(...e));

  // Leave types
  const leaveTypes = [
    ['Casual Leave', 12, 'For personal/casual reasons'],
    ['Sick Leave', 10, 'For medical reasons'],
    ['Earned Leave', 15, 'Earned/privilege leave'],
    ['Maternity Leave', 180, 'Maternity leave for female employees'],
    ['Paternity Leave', 15, 'Paternity leave for male employees'],
    ['Comp Off', 5, 'Compensatory off'],
  ];

  const insertLT = db.prepare('INSERT INTO leave_types (name, defaultBalance, description) VALUES (?, ?, ?)');
  leaveTypes.forEach(lt => insertLT.run(...lt));

  // Assign leave balances to all employees
  const allEmps = db.prepare('SELECT id FROM employees').all();
  const allLT = db.prepare('SELECT id, defaultBalance FROM leave_types').all();
  const insertLB = db.prepare('INSERT INTO leave_balances (employeeId, leaveTypeId, total, used) VALUES (?, ?, ?, ?)');

  allEmps.forEach(emp => {
    allLT.forEach(lt => {
      const used = Math.floor(Math.random() * Math.min(4, lt.defaultBalance));
      insertLB.run(emp.id, lt.id, lt.defaultBalance, used);
    });
  });

  // Holidays 2026
  const holidays = [
    ['Republic Day', '2026-01-26', 'national'],
    ['Holi', '2026-03-14', 'national'],
    ['Good Friday', '2026-04-03', 'national'],
    ['Eid ul-Fitr', '2026-03-21', 'national'],
    ['May Day', '2026-05-01', 'national'],
    ['Independence Day', '2026-08-15', 'national'],
    ['Ganesh Chaturthi', '2026-08-27', 'optional'],
    ['Mahatma Gandhi Jayanti', '2026-10-02', 'national'],
    ['Dussehra', '2026-10-12', 'national'],
    ['Diwali', '2026-10-31', 'national'],
    ['Guru Nanak Jayanti', '2026-11-08', 'optional'],
    ['Christmas', '2026-12-25', 'national'],
  ];

  const insertH = db.prepare('INSERT INTO holidays (name, date, type) VALUES (?, ?, ?)');
  holidays.forEach(h => insertH.run(...h));

  // Some sample attendance for current month
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  allEmps.forEach(emp => {
    for (let d = 1; d <= Math.min(today.getDate(), 28); d++) {
      const date = new Date(year, month, d);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dateStr = date.toISOString().split('T')[0];
      const rand = Math.random();
      let status = 'present';
      let checkIn = '09:' + String(Math.floor(Math.random() * 30)).padStart(2, '0');
      let checkOut = '18:' + String(Math.floor(Math.random() * 30)).padStart(2, '0');

      if (rand > 0.92) { status = 'absent'; checkIn = null; checkOut = null; }
      else if (rand > 0.85) { status = 'late'; checkIn = '10:' + String(Math.floor(Math.random() * 30) + 15).padStart(2, '0'); }
      else if (rand > 0.80) { status = 'halfday'; checkOut = '13:' + String(Math.floor(Math.random() * 30)).padStart(2, '0'); }

      const workHours = (checkIn && checkOut) ? (parseFloat(checkOut.split(':')[0]) - parseFloat(checkIn.split(':')[0]) + (parseFloat(checkOut.split(':')[1]) - parseFloat(checkIn.split(':')[1])) / 60) : 0;

      try {
        db.prepare('INSERT INTO attendance (employeeId, date, checkIn, checkOut, status, workHours) VALUES (?, ?, ?, ?, ?, ?)').run(emp.id, dateStr, checkIn, checkOut, status, Math.round(workHours * 10) / 10);
      } catch(e) {}
    }
  });

  // Some sample leave applications (two-level approval: manager -> HR)
  const leaveApps = [
    [6, 1, '2026-04-01', '2026-04-03', 3, 'Family function', 'approved', 2, 'Approved', 1, 'All good'],
    [7, 2, '2026-03-25', '2026-03-26', 2, 'Not feeling well', 'approved', 2, 'Take care', 1, 'Approved'],
    [8, 1, '2026-04-10', '2026-04-11', 2, 'Personal work', 'pending_manager', null, null, null, null],
    [9, 1, '2026-03-28', '2026-03-28', 1, 'Dentist appointment', 'pending_hr', 3, 'OK', null, null],
    [11, 3, '2026-04-15', '2026-04-20', 6, 'Vacation', 'pending_manager', null, null, null, null],
    [10, 2, '2026-03-20', '2026-03-20', 1, 'Fever', 'approved', 4, 'Get well soon', 1, 'Approved'],
  ];

  const insertLA = db.prepare('INSERT INTO leave_applications (employeeId, leaveTypeId, fromDate, toDate, days, reason, status, managerApprovedBy, managerRemarks, hrApprovedBy, hrRemarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  leaveApps.forEach(la => insertLA.run(...la));

  // Sample announcements
  const announcements = [
    ['Welcome to the new Employee Management System!', 'We are excited to launch our new EMS platform. Please explore all the features and let us know your feedback.', 'high', 1],
    ['Annual Performance Review Cycle', 'The annual performance review cycle for FY 2025-26 will begin from April 1st. Please ensure all self-assessments are completed by March 31st.', 'urgent', 1],
    ['Office Timings Update', 'Starting April 2026, office hours will be 9:30 AM to 6:30 PM. Flexible timing of 30 minutes is allowed.', 'normal', 1],
    ['Team Outing Planned', 'A team outing is being planned for the last week of April. Department heads will share the details soon.', 'low', 1],
  ];
  const insertAnn = db.prepare('INSERT INTO announcements (title, content, priority, createdBy) VALUES (?, ?, ?, ?)');
  announcements.forEach(a => insertAnn.run(...a));

  // Expense categories
  const expCategories = [
    ['Travel', 50000, 'Business travel expenses'],
    ['Food & Meals', 5000, 'Business meals and client entertainment'],
    ['Office Supplies', 3000, 'Stationery, equipment etc.'],
    ['Software & Tools', 10000, 'Software licenses and subscriptions'],
    ['Communication', 2000, 'Phone, internet bills'],
    ['Training', 20000, 'Courses, certifications, conferences'],
    ['Medical', 15000, 'Medical expenses not covered by insurance'],
    ['Other', 5000, 'Miscellaneous expenses'],
  ];
  const insertEC = db.prepare('INSERT INTO expense_categories (name, maxLimit, description) VALUES (?, ?, ?)');
  expCategories.forEach(c => insertEC.run(...c));

  // Sample expenses
  const sampleExpenses = [
    [6, 1, 2500, 'Travel to client office', '2026-03-15', 'approved', 2, 'OK', 4, 'Processed'],
    [7, 4, 999, 'IntelliJ license renewal', '2026-03-10', 'pending_finance', 2, 'Approved', null, null],
    [8, 2, 450, 'Team lunch', '2026-03-20', 'pending_manager', null, null, null, null],
    [11, 1, 3200, 'Client visit - Mumbai', '2026-03-18', 'approved', 5, 'Approved', 4, 'Reimbursed'],
  ];
  const insertExp = db.prepare('INSERT INTO expenses (employeeId, categoryId, amount, description, expenseDate, status, managerApprovedBy, managerRemarks, financeApprovedBy, financeRemarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  sampleExpenses.forEach(e => insertExp.run(...e));

  // Salary structures
  const salaryData = [
    [1, 150000, 60000, 5000, 5000, 30000, 18000, 2500, 15000, '2020-01-15'],
    [2, 120000, 48000, 5000, 5000, 20000, 14400, 2500, 10000, '2020-03-01'],
    [3, 100000, 40000, 5000, 5000, 15000, 12000, 2500, 8000, '2020-04-15'],
    [4, 110000, 44000, 5000, 5000, 18000, 13200, 2500, 9000, '2020-06-01'],
    [5, 105000, 42000, 5000, 5000, 16000, 12600, 2500, 8500, '2021-01-10'],
    [6, 80000, 32000, 3000, 3000, 12000, 9600, 2500, 5000, '2021-02-01'],
    [7, 60000, 24000, 3000, 3000, 8000, 7200, 2500, 3000, '2021-06-15'],
    [8, 45000, 18000, 3000, 3000, 5000, 5400, 2500, 1500, '2022-01-10'],
    [9, 55000, 22000, 3000, 3000, 7000, 6600, 2500, 2500, '2021-08-01'],
    [10, 65000, 26000, 3000, 3000, 9000, 7800, 2500, 3500, '2021-09-15'],
    [11, 50000, 20000, 3000, 3000, 6000, 6000, 2500, 2000, '2022-03-01'],
    [12, 55000, 22000, 3000, 3000, 7000, 6600, 2500, 2500, '2022-05-15'],
    [13, 48000, 19200, 3000, 3000, 5500, 5760, 2500, 1800, '2022-07-01'],
    [14, 62000, 24800, 3000, 3000, 8500, 7440, 2500, 3200, '2022-09-01'],
    [15, 42000, 16800, 3000, 3000, 4500, 5040, 2500, 1200, '2023-01-15'],
  ];
  const insertSal = db.prepare('INSERT INTO salary_structures (employeeId, basicSalary, hra, transportAllowance, medicalAllowance, specialAllowance, providentFund, professionalTax, incomeTax, effectiveFrom) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  salaryData.forEach(s => insertSal.run(...s));

  // Generate payslips for last 3 months
  const payMonth = today.getMonth() + 1;
  const payYear = today.getFullYear();
  for (let offset = 1; offset <= 3; offset++) {
    let pm = payMonth - offset;
    let py = payYear;
    if (pm <= 0) { pm += 12; py--; }
    allEmps.forEach(emp => {
      const sal = salaryData.find(s => s[0] === emp.id);
      if (!sal) return;
      const gross = sal[1] + sal[2] + sal[3] + sal[4] + sal[5];
      const deductions = sal[6] + sal[7] + sal[8];
      const net = gross - deductions;
      try {
        db.prepare('INSERT INTO payslips (employeeId, month, year, basicSalary, hra, transportAllowance, medicalAllowance, specialAllowance, grossSalary, providentFund, professionalTax, incomeTax, totalDeductions, netSalary, workingDays, presentDays, leaveDays, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
          emp.id, pm, py, sal[1], sal[2], sal[3], sal[4], sal[5], gross, sal[6], sal[7], sal[8], deductions, net, 22, 20 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 3), 'paid'
        );
      } catch(e) {}
    });
  }

  // Performance reviews
  const reviews = [
    [6, 2, 'Q4 2025', 4.2, 'Excellent coding skills, great team player', 'Could improve documentation', 'Lead a major project module', 'Rahul has been consistently performing well', 4.0, 'I enjoy working on challenging problems', 'completed'],
    [7, 2, 'Q4 2025', 3.8, 'Quick learner, good communication', 'Time management could be better', 'Complete AWS certification', 'Ananya shows great potential', 3.5, 'Working on improving my skills', 'completed'],
    [8, 2, 'Q4 2025', 3.5, 'Enthusiastic, eager to learn', 'Needs more hands-on experience', 'Contribute to 2 major features', 'Good progress for a junior developer', 3.0, 'I am learning a lot', 'completed'],
    [9, 3, 'Q4 2025', 4.0, 'Detail-oriented, reliable', 'Could be more proactive', 'Streamline onboarding process', 'Meera is a solid performer', 3.8, 'I want to take on more responsibilities', 'completed'],
    [6, 2, 'Q1 2026', null, null, null, null, null, null, null, 'pending'],
    [7, 2, 'Q1 2026', null, null, null, null, null, null, null, 'pending'],
  ];
  const insertPR = db.prepare('INSERT INTO performance_reviews (employeeId, reviewerId, reviewPeriod, rating, strengths, improvements, goals, comments, selfRating, selfComments, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  reviews.forEach(r => insertPR.run(...r));

  // Goals
  const goalData = [
    [6, 'Complete microservices migration', 'Migrate monolith to microservices architecture', 'technical', '2026-06-30', 45, 'active'],
    [6, 'AWS Solutions Architect certification', 'Pass the AWS SA Professional exam', 'learning', '2026-05-15', 70, 'active'],
    [7, 'Learn React Native', 'Build a mobile app prototype', 'learning', '2026-04-30', 30, 'active'],
    [7, 'Improve code review speed', 'Complete reviews within 24 hours', 'performance', '2026-03-31', 80, 'active'],
    [9, 'Automate onboarding checklist', 'Create digital onboarding flow', 'performance', '2026-04-15', 60, 'active'],
    [10, 'Q1 Financial Report', 'Complete and submit Q1 report', 'performance', '2026-04-10', 90, 'active'],
  ];
  const insertGoal = db.prepare('INSERT INTO goals (employeeId, title, description, category, targetDate, progress, status) VALUES (?,?,?,?,?,?,?)');
  goalData.forEach(g => insertGoal.run(...g));

  // Training programs
  const trainings = [
    ['Advanced React & TypeScript', 'Deep dive into React hooks, performance optimization, and TypeScript best practices', 'Priya Sharma', '2026-04-01', '2026-04-15', 20, 'Technical', 'online', 'upcoming', 2],
    ['Leadership Essentials', 'Management and leadership skills for aspiring leaders', 'External Trainer', '2026-04-10', '2026-04-12', 15, 'Soft Skills', 'offline', 'upcoming', 3],
    ['Data Analytics with Python', 'Learn data analysis, visualization, and machine learning basics', 'External Trainer', '2026-03-01', '2026-03-20', 25, 'Technical', 'online', 'completed', 1],
    ['Communication Skills Workshop', 'Effective business communication and presentation skills', 'HR Team', '2026-05-01', '2026-05-02', 30, 'Soft Skills', 'hybrid', 'upcoming', 3],
  ];
  const insertTr = db.prepare('INSERT INTO training_programs (title, description, instructor, startDate, endDate, maxParticipants, category, mode, status, createdBy) VALUES (?,?,?,?,?,?,?,?,?,?)');
  trainings.forEach(t => insertTr.run(...t));

  // Training enrollments
  const enrollments = [
    [1, 6, 'enrolled'], [1, 7, 'enrolled'], [1, 8, 'enrolled'],
    [2, 2, 'enrolled'], [2, 5, 'enrolled'],
    [3, 6, 'completed'], [3, 7, 'completed'], [3, 10, 'completed'],
  ];
  const insertTE = db.prepare('INSERT INTO training_enrollments (programId, employeeId, status) VALUES (?,?,?)');
  enrollments.forEach(e => insertTE.run(...e));

  // Skills
  const skillData = [
    [6, 'JavaScript', 'expert'], [6, 'React', 'advanced'], [6, 'Node.js', 'advanced'], [6, 'Python', 'intermediate'], [6, 'AWS', 'intermediate'],
    [7, 'JavaScript', 'advanced'], [7, 'React', 'intermediate'], [7, 'CSS', 'advanced'], [7, 'Git', 'advanced'],
    [8, 'JavaScript', 'intermediate'], [8, 'React', 'beginner'], [8, 'HTML/CSS', 'intermediate'],
    [9, 'HR Management', 'advanced'], [9, 'Recruitment', 'advanced'], [9, 'Excel', 'expert'],
    [10, 'Accounting', 'expert'], [10, 'Excel', 'expert'], [10, 'Tally', 'advanced'],
    [11, 'Content Writing', 'advanced'], [11, 'SEO', 'intermediate'], [11, 'Social Media', 'advanced'],
  ];
  const insertSkill = db.prepare('INSERT INTO skills (employeeId, name, level) VALUES (?,?,?)');
  skillData.forEach(s => insertSkill.run(...s));

  // Shifts
  const shiftData = [
    ['General', '09:00', '18:00', 15, 'Standard 9 AM to 6 PM shift'],
    ['Morning', '06:00', '14:00', 10, 'Early morning shift'],
    ['Evening', '14:00', '22:00', 10, 'Afternoon to night shift'],
    ['Flexible', '10:00', '19:00', 30, 'Flexible timing shift'],
  ];
  const insertShift = db.prepare('INSERT INTO shifts (name, startTime, endTime, graceMinutes, description) VALUES (?,?,?,?,?)');
  shiftData.forEach(s => insertShift.run(...s));

  // Assign default shift to all
  const insertES = db.prepare('INSERT INTO employee_shifts (employeeId, shiftId, fromDate) VALUES (?,?,?)');
  allEmps.forEach(emp => insertES.run(emp.id, 1, '2026-01-01'));

  // Onboarding tasks
  const onboardingTasks = [
    ['Submit identity documents', 'Aadhar, PAN, passport copy', 'documentation', 'employee', 3, 1],
    ['Complete bank details form', 'Provide bank account details for salary', 'documentation', 'employee', 3, 2],
    ['Setup workstation', 'Laptop, monitor, keyboard, mouse', 'it', 'it', 2, 3],
    ['Create email account', 'Setup company email and Slack', 'it', 'it', 1, 4],
    ['Assign mentor/buddy', 'Pair with a senior team member', 'team', 'manager', 2, 5],
    ['Complete HR orientation', 'Company policies, benefits overview', 'hr', 'hr', 5, 6],
    ['Access to project repositories', 'GitHub, Jira, Confluence access', 'it', 'it', 2, 7],
    ['First week check-in', 'Meeting with manager to discuss expectations', 'team', 'manager', 7, 8],
    ['Complete compliance training', 'Security, harassment prevention, data privacy', 'training', 'employee', 14, 9],
    ['Sign employment agreement', 'Review and sign employment contract', 'documentation', 'hr', 3, 10],
  ];
  const insertOT = db.prepare('INSERT INTO onboarding_tasks (title, description, category, assignTo, daysToComplete, sortOrder) VALUES (?,?,?,?,?,?)');
  onboardingTasks.forEach(t => insertOT.run(...t));

  // Sample notifications
  const notifs = [
    [2, 'New Leave Request', 'Karthik Nair has applied for 2 days Casual Leave', 'leave', '/leaves'],
    [3, 'Leave Pending HR Approval', 'Meera Joshi leave approved by manager, needs HR approval', 'leave', '/leaves'],
    [1, 'Expense Awaiting Approval', 'New expense claim of ₹450 from Karthik Nair', 'expense', '/expenses'],
    [6, 'Performance Review Due', 'Your Q1 2026 self-assessment is pending', 'performance', '/performance'],
    [7, 'Training Enrollment', 'You have been enrolled in Advanced React & TypeScript', 'info', '/training'],
    [1, 'New Announcement Posted', 'Annual Performance Review Cycle announcement', 'info', '/announcements'],
  ];
  const insertNotif = db.prepare('INSERT INTO notifications (userId, title, message, type, link) VALUES (?,?,?,?,?)');
  notifs.forEach(n => insertNotif.run(...n));

  // Company settings
  const settings = [
    ['company_name', 'TechCorp Solutions', 'general'],
    ['company_address', '456 Innovation Park, Bangalore 560001', 'general'],
    ['company_phone', '+91-80-12345678', 'general'],
    ['company_email', 'hr@techcorp.com', 'general'],
    ['financial_year_start', 'April', 'general'],
    ['work_start_time', '09:00', 'attendance'],
    ['work_end_time', '18:00', 'attendance'],
    ['late_threshold_minutes', '15', 'attendance'],
    ['halfday_hours', '5', 'attendance'],
    ['leave_carryforward', 'true', 'leave'],
    ['max_carryforward_days', '5', 'leave'],
    ['leave_encashment', 'false', 'leave'],
    ['notice_period_days', '60', 'exit'],
    ['probation_months', '6', 'general'],
  ];
  const insertSetting = db.prepare('INSERT INTO company_settings (key, value, category) VALUES (?,?,?)');
  settings.forEach(s => insertSetting.run(...s));

  // Sample messages
  const msgs = [
    [6, 2, null, 'Hi Priya, I have a question about the new project architecture.', 0],
    [2, 6, null, 'Sure Rahul, lets discuss it in our 1:1 tomorrow.', 1],
    [7, 2, null, 'Priya, I submitted my code review. Can you take a look?', 0],
    [1, null, 'general', 'Reminder: Please submit your timesheets by Friday EOD.', 1],
    [3, null, 'hr', 'HR Team: Please update the employee handbook by next week.', 1],
  ];
  const insertMsg = db.prepare('INSERT INTO messages (senderId, receiverId, channel, content, isRead) VALUES (?,?,?,?,?)');
  msgs.forEach(m => insertMsg.run(...m));

  // Activity log entries
  const activities = [
    [1, 'Created employee', 'EMP015', 'Added Sanya Chopra to Marketing'],
    [6, 'Applied leave', 'Leave #1', 'Casual Leave - 3 days for Family function'],
    [2, 'Approved leave', 'Leave #1', 'Manager approved Rahul Verma leave'],
    [1, 'Approved leave', 'Leave #1', 'HR approved Rahul Verma leave'],
    [1, 'Posted announcement', 'Announcement', 'Annual Performance Review Cycle'],
    [8, 'Submitted expense', 'Expense #3', 'Team lunch - ₹450'],
  ];
  const insertActivity = db.prepare('INSERT INTO activity_log (userId, action, target, details) VALUES (?,?,?,?)');
  activities.forEach(a => insertActivity.run(...a));

  // Helpdesk tickets
  const ticketData = [
    ['TKT-001', 'Laptop not booting', 'My laptop shows a blue screen on startup and won\'t boot properly', 'it', 'high', 'in_progress', 8, 2, null, null, null],
    ['TKT-002', 'Leave balance incorrect', 'My casual leave balance shows 8 but it should be 10', 'hr', 'normal', 'open', 7, null, null, null, null],
    ['TKT-003', 'Expense reimbursement delayed', 'My expense from last month is still pending reimbursement', 'finance', 'normal', 'resolved', 6, 4, 4, "datetime('now')", null],
    ['TKT-004', 'Access to GitHub repo', 'Need access to the new microservices repository', 'it', 'high', 'open', 8, null, null, null, null],
    ['TKT-005', 'AC not working in 3rd floor', 'The air conditioning in the 3rd floor conference room is not working', 'admin', 'low', 'open', 11, null, null, null, null],
    ['TKT-006', 'Request for ergonomic chair', 'I need an ergonomic chair due to back problems. Have doctor prescription.', 'admin', 'normal', 'in_progress', 9, 3, null, null, null],
  ];
  const insertTicket = db.prepare('INSERT INTO tickets (ticketId, title, description, category, priority, status, createdBy, assignedTo, resolvedBy, resolvedAt, closedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  ticketData.forEach(t => insertTicket.run(...t));

  // Ticket comments
  const ticketComments = [
    [1, 2, 'I am looking into this. Can you tell me the laptop model?', 0],
    [1, 8, 'It is a Dell Latitude 5520. The error code is 0x0000007E', 0],
    [1, 2, 'Scheduling a hardware check tomorrow morning.', 0],
    [3, 4, 'Reimbursement has been processed. Please check your bank account.', 0],
    [3, 6, 'Received, thank you!', 0],
    [6, 3, 'I have forwarded your request to admin. Will update soon.', 0],
  ];
  const insertTC = db.prepare('INSERT INTO ticket_comments (ticketId, userId, comment, isInternal) VALUES (?,?,?,?)');
  ticketComments.forEach(c => insertTC.run(...c));

  console.log('Database seeded successfully!');
}

seed();

// Migration: update notifications CHECK constraint to include 'ticket' type
try {
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='notifications'").get();
  if (tableInfo && tableInfo.sql && !tableInfo.sql.includes("'ticket'")) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL REFERENCES employees(id),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info' CHECK(type IN ('info','success','warning','error','leave','attendance','expense','performance','ticket')),
        isRead INTEGER DEFAULT 0,
        link TEXT,
        createdAt TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO notifications_new SELECT * FROM notifications;
      DROP TABLE notifications;
      ALTER TABLE notifications_new RENAME TO notifications;
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId, isRead);
    `);
  }
} catch(e) { /* migration already applied or not needed */ }

module.exports = db;
