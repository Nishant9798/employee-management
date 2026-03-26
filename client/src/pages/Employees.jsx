import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Edit2, Trash2, X, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

const DEPARTMENTS = ['Management', 'Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales'];
const ROLES = ['employee', 'manager', 'admin'];

export default function Employees() {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ employeeId: '', name: '', email: '', password: '', phone: '', department: '', designation: '', joiningDate: '', managerId: '', role: 'employee' });

  useEffect(() => { loadEmployees(); }, []);

  const loadEmployees = () => api.get('/employees').then(r => setEmployees(r.data));

  const filtered = employees.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.employeeId.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || e.department === deptFilter;
    return matchSearch && matchDept && e.status === 'active';
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ employeeId: '', name: '', email: '', password: '', phone: '', department: '', designation: '', joiningDate: '', managerId: '', role: 'employee' });
    setShowModal(true);
  };

  const openEdit = (emp) => {
    setEditing(emp);
    setForm({ ...emp, password: '', managerId: emp.managerId || '' });
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
    await api.delete(`/employees/${id}`);
    toast.success('Employee deactivated');
    loadEmployees();
  };

  const managers = employees.filter(e => e.role === 'admin' || e.role === 'manager');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Employees</h1>
          <p className="text-sm text-gray-500">{filtered.length} employees</p>
        </div>
        {isAdmin && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <UserPlus size={16} /> Add Employee
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, ID, or email..." className="input pl-9" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="input w-auto">
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Department</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Designation</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Manager</th>
                {isAdmin && <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs shrink-0">
                        {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{emp.name}</p>
                        <p className="text-xs text-gray-400">{emp.employeeId} &middot; {emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{emp.department}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{emp.designation}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{emp.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${emp.role === 'admin' ? 'badge-danger' : emp.role === 'manager' ? 'badge-info' : 'badge-gray'}`}>
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{emp.managerName || '-'}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(emp)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Employee ID</label>
                  <input value={form.employeeId} onChange={e => setForm({...form, employeeId: e.target.value})} className="input mt-1" disabled={!!editing} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Full Name</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input mt-1" />
                </div>
                {!editing && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Password</label>
                    <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input mt-1" />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-600">Phone</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Department</label>
                  <select value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="input mt-1">
                    <option value="">Select</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Designation</label>
                  <input value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} className="input mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">Joining Date</label>
                  <input type="date" value={form.joiningDate} onChange={e => setForm({...form, joiningDate: e.target.value})} className="input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Role</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="input mt-1">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Reporting Manager</label>
                <select value={form.managerId} onChange={e => setForm({...form, managerId: e.target.value})} className="input mt-1">
                  <option value="">None</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.designation})</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary">{editing ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
