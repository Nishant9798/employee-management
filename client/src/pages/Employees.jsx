import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Search, Edit2, Trash2, X, UserPlus, Download, Users, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const DEPARTMENTS = ['Management', 'Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales'];
const ROLES = ['employee', 'manager', 'admin'];
const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

export default function Employees() {
  const { isAdmin, user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ employeeId: '', name: '', email: '', password: '', phone: '', department: '', designation: '', joiningDate: '', managerId: '', role: 'employee', dateOfBirth: '', bloodGroup: '', gender: '', address: '', emergencyContactName: '', emergencyContactPhone: '' });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => { loadEmployees(); }, []);

  const loadEmployees = () => api.get('/employees').then(r => setEmployees(r.data));

  const filtered = employees.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.employeeId.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || e.department === deptFilter;
    const matchRole = !roleFilter || e.role === roleFilter;
    return matchSearch && matchDept && matchRole && e.status === 'active';
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openAdd = () => {
    setEditing(null);
    setForm({ employeeId: '', name: '', email: '', password: '', phone: '', department: '', designation: '', joiningDate: '', managerId: '', role: 'employee', dateOfBirth: '', bloodGroup: '', gender: '', address: '', emergencyContactName: '', emergencyContactPhone: '' });
    setShowModal(true);
  };

  const openEdit = (emp) => {
    setEditing(emp);
    setForm({ ...emp, password: '', managerId: emp.managerId || '', dateOfBirth: emp.dateOfBirth || '', bloodGroup: emp.bloodGroup || '', gender: emp.gender || '', address: emp.address || '', emergencyContactName: emp.emergencyContactName || '', emergencyContactPhone: emp.emergencyContactPhone || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/employees/${editing.id}`, form);
        toast.success('Employee updated');
      } else {
        await api.post('/employees', form);
        toast.success('Employee created');
      }
      setShowModal(false);
      loadEmployees();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this employee?')) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success('Employee deactivated');
      loadEmployees();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to deactivate');
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/employees/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'employees.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  const managers = employees.filter(e => e.role === 'admin' || e.role === 'manager');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>Employees</h1>
            <p>{filtered.length} active employees</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition backdrop-blur-sm">
                  <Download size={16} /> Export CSV
                </button>
                <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-xl text-sm font-medium hover:bg-white/90 transition shadow-lg">
                  <UserPlus size={16} /> Add Employee
                </button>
              </>
            )}
          </div>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <Users size={100} className="text-white" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, ID, or email..." className="input pl-9" />
        </div>
        <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }} className="input w-auto">
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className="input w-auto">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Users size={64} />
            <p className="text-lg font-medium mt-2">No employees found</p>
            <p className="text-sm">Try adjusting your search or filter</p>
          </div>
        </div>
      ) : (
        <>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Employee</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Department</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Designation</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden sm:table-cell">Phone</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Role</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase hidden md:table-cell">Manager</th>
                    {isAdmin && <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {paginated.map((emp, i) => (
                    <tr key={emp.id} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xs shrink-0 shadow-sm">
                            {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-white">{emp.name}</p>
                            <p className="text-xs text-slate-400">{emp.employeeId} &middot; {emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{emp.department}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{emp.designation}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                        {isAdmin || emp.id === user?.id ? (emp.phone || '-') : '••••••••••'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${emp.role === 'admin' ? 'badge-danger' : emp.role === 'manager' ? 'badge-info' : 'badge-gray'}`}>
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 hidden md:table-cell">{emp.managerName || '-'}</td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(emp)} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition">
                              <Edit2 size={15} />
                            </button>
                            <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 rounded-xl text-sm font-semibold transition-all ${page === i + 1 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Slide Panel Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-slate-800 shadow-2xl z-50 border-l border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center p-5 border-b dark:border-slate-700">
              <h2 className="text-lg font-semibold dark:text-white">{editing ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(100vh-130px)]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Employee ID</label>
                  <input value={form.employeeId} onChange={e => setForm({...form, employeeId: e.target.value})} className="input mt-1" disabled={!!editing} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Full Name</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input mt-1" />
                </div>
                {!editing && (
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Password</label>
                    <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input mt-1" />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Phone</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Department</label>
                  <select value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="input mt-1">
                    <option value="">Select</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Designation</label>
                  <input value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} className="input mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Joining Date</label>
                  <input type="date" value={form.joiningDate} onChange={e => setForm({...form, joiningDate: e.target.value})} className="input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Role</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="input mt-1">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Reporting Manager</label>
                <select value={form.managerId} onChange={e => setForm({...form, managerId: e.target.value})} className="input mt-1">
                  <option value="">None</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.designation})</option>)}
                </select>
              </div>

              {/* Additional fields */}
              <div className="pt-2 border-t dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Personal Details</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Gender</label>
                  <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="input mt-1">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Date of Birth</label>
                  <input type="date" value={form.dateOfBirth} onChange={e => setForm({...form, dateOfBirth: e.target.value})} className="input mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Blood Group</label>
                  <select value={form.bloodGroup} onChange={e => setForm({...form, bloodGroup: e.target.value})} className="input mt-1">
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Address</label>
                <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={2} className="input mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Emergency Contact Name</label>
                  <input value={form.emergencyContactName} onChange={e => setForm({...form, emergencyContactName: e.target.value})} className="input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Emergency Contact Phone</label>
                  <input value={form.emergencyContactPhone} onChange={e => setForm({...form, emergencyContactPhone: e.target.value})} className="input mt-1" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-slate-700">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary">{editing ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
