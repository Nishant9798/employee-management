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
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
    approvedBy INTEGER REFERENCES employees(id),
    remarks TEXT,
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
`);

// Seed data
function seed() {
  const empCount = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
  if (empCount > 0) return;

  const hash = bcrypt.hashSync('admin123', 10);
  const empHash = bcrypt.hashSync('emp123', 10);

  // Insert admin
  db.prepare(`INSERT INTO employees (employeeId, name, email, password, phone, department, designation, joiningDate, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'EMP001', 'Rajesh Kumar', 'admin@company.com', hash, '9876543210', 'Management', 'CEO', '2020-01-15', 'admin'
  );

  // Insert managers
  const managers = [
    ['EMP002', 'Priya Sharma', 'priya@company.com', empHash, '9876543211', 'Engineering', 'Engineering Manager', '2020-03-01', 'manager', 1],
    ['EMP003', 'Amit Patel', 'amit@company.com', empHash, '9876543212', 'HR', 'HR Manager', '2020-04-15', 'manager', 1],
    ['EMP004', 'Sneha Reddy', 'sneha@company.com', empHash, '9876543213', 'Finance', 'Finance Manager', '2020-06-01', 'manager', 1],
    ['EMP005', 'Vikram Singh', 'vikram@company.com', empHash, '9876543214', 'Marketing', 'Marketing Manager', '2021-01-10', 'manager', 1],
  ];

  const insertMgr = db.prepare(`INSERT INTO employees (employeeId, name, email, password, phone, department, designation, joiningDate, role, managerId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  managers.forEach(m => insertMgr.run(...m));

  // Insert employees
  const employees = [
    ['EMP006', 'Rahul Verma', 'rahul@company.com', empHash, '9876543215', 'Engineering', 'Senior Developer', '2021-02-01', 'employee', 2],
    ['EMP007', 'Ananya Gupta', 'ananya@company.com', empHash, '9876543216', 'Engineering', 'Developer', '2021-06-15', 'employee', 2],
    ['EMP008', 'Karthik Nair', 'karthik@company.com', empHash, '9876543217', 'Engineering', 'Junior Developer', '2022-01-10', 'employee', 2],
    ['EMP009', 'Meera Joshi', 'meera@company.com', empHash, '9876543218', 'HR', 'HR Executive', '2021-08-01', 'employee', 3],
    ['EMP010', 'Suresh Iyer', 'suresh@company.com', empHash, '9876543219', 'Finance', 'Accountant', '2021-09-15', 'employee', 4],
    ['EMP011', 'Divya Menon', 'divya@company.com', empHash, '9876543220', 'Marketing', 'Marketing Executive', '2022-03-01', 'employee', 5],
    ['EMP012', 'Arjun Das', 'arjun@company.com', empHash, '9876543221', 'Engineering', 'QA Engineer', '2022-05-15', 'employee', 2],
    ['EMP013', 'Pooja Kulkarni', 'pooja@company.com', empHash, '9876543222', 'HR', 'Recruiter', '2022-07-01', 'employee', 3],
    ['EMP014', 'Nikhil Rao', 'nikhil@company.com', empHash, '9876543223', 'Finance', 'Financial Analyst', '2022-09-01', 'employee', 4],
    ['EMP015', 'Sanya Chopra', 'sanya@company.com', empHash, '9876543224', 'Marketing', 'Content Writer', '2023-01-15', 'employee', 5],
  ];

  const insertEmp = db.prepare(`INSERT INTO employees (employeeId, name, email, password, phone, department, designation, joiningDate, role, managerId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
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

  // Some sample leave applications
  const leaveApps = [
    [6, 1, '2026-04-01', '2026-04-03', 3, 'Family function', 'approved', 2],
    [7, 2, '2026-03-25', '2026-03-26', 2, 'Not feeling well', 'approved', 2],
    [8, 1, '2026-04-10', '2026-04-11', 2, 'Personal work', 'pending', null],
    [9, 1, '2026-03-28', '2026-03-28', 1, 'Dentist appointment', 'approved', 3],
    [11, 3, '2026-04-15', '2026-04-20', 6, 'Vacation', 'pending', null],
    [10, 2, '2026-03-20', '2026-03-20', 1, 'Fever', 'approved', 4],
  ];

  const insertLA = db.prepare('INSERT INTO leave_applications (employeeId, leaveTypeId, fromDate, toDate, days, reason, status, approvedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
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

  console.log('Database seeded successfully!');
}

seed();

module.exports = db;
