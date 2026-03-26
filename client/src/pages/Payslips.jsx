import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { FileText, ChevronDown, ChevronUp, Download, Calendar, IndianRupee, Users, Briefcase, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Payslips() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState('my');
  const [payslips, setPayslips] = useState([]);
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    api.get('/salary/my-payslips').then(r => setPayslips(r.data)).catch(() => {});
    if (isAdmin) {
      api.get('/salary/all-structures').then(r => setSalaryStructures(r.data)).catch(() => {});
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/salary/generate-payslips', { month: genMonth, year: genYear });
      toast.success(res.data?.message || 'Payslips generated successfully!');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate payslips');
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const tabs = [
    { id: 'my', label: 'My Payslips' },
    ...(isAdmin ? [
      { id: 'generate', label: 'Generate Payslips' },
      { id: 'structures', label: 'Salary Structures' },
    ] : []),
  ];

  const gradients = [
    'from-blue-500 to-cyan-500', 'from-emerald-500 to-teal-500',
    'from-purple-500 to-pink-500', 'from-amber-500 to-orange-500',
    'from-indigo-500 to-violet-500', 'from-rose-500 to-red-500',
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>Payslips</h1>
            <p>View your salary details and payslips</p>
          </div>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <FileText size={100} className="text-white" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* My Payslips */}
      {tab === 'my' && (
        <div className="space-y-4">
          {payslips.length === 0 && (
            <div className="empty-state">
              <FileText size={64} />
              <p className="text-lg font-medium mt-2">No payslips available</p>
              <p className="text-sm">Your payslips will appear here once generated</p>
            </div>
          )}
          {payslips.map((p, i) => (
            <div key={p.id} className="card hover:shadow-md transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              {/* Payslip Summary Row */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center shadow-sm`}>
                    <Calendar size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">{monthNames[(p.month || 1) - 1]} {p.year}</h3>
                    <p className="text-xs text-gray-400">Payslip #{p.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Gross</p>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{formatCurrency(p.grossSalary)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Deductions</p>
                    <p className="text-sm font-medium text-red-500">{formatCurrency(p.totalDeductions)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Net Salary</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.netSalary)}</p>
                  </div>
                  <button className="p-1 text-gray-400 hover:text-gray-600 transition">
                    {expandedId === p.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === p.id && (
                <div className="mt-6 pt-6 border-t dark:border-gray-700">
                  {/* Working Days Info */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Working Days</p>
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{p.workingDays || '-'}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Present Days</p>
                      <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{p.presentDays || '-'}</p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Leave Days</p>
                      <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{p.leaveDays || 0}</p>
                    </div>
                  </div>

                  {/* Salary Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Earnings */}
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800">
                      <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-4 flex items-center gap-2">
                        <IndianRupee size={14} /> Earnings
                      </h4>
                      <div className="space-y-3">
                        {[
                          { label: 'Basic Salary', value: p.basicSalary },
                          { label: 'HRA', value: p.hra },
                          { label: 'Transport Allowance', value: p.transportAllowance },
                          { label: 'Medical Allowance', value: p.medicalAllowance },
                          { label: 'Special Allowance', value: p.specialAllowance },
                        ].map((item) => (
                          <div key={item.label} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{formatCurrency(item.value)}</span>
                          </div>
                        ))}
                        <div className="pt-3 mt-3 border-t border-emerald-200 dark:border-emerald-700 flex justify-between items-center">
                          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Gross Salary</span>
                          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(p.grossSalary)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-800">
                      <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
                        <IndianRupee size={14} /> Deductions
                      </h4>
                      <div className="space-y-3">
                        {[
                          { label: 'Provident Fund (PF)', value: p.providentFund },
                          { label: 'Professional Tax (PT)', value: p.professionalTax },
                          { label: 'Income Tax (IT)', value: p.incomeTax },
                        ].map((item) => (
                          <div key={item.label} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">-{formatCurrency(item.value)}</span>
                          </div>
                        ))}
                        <div className="pt-3 mt-3 border-t border-red-200 dark:border-red-700 flex justify-between items-center">
                          <span className="text-sm font-semibold text-red-700 dark:text-red-400">Total Deductions</span>
                          <span className="text-sm font-bold text-red-700 dark:text-red-400">-{formatCurrency(p.totalDeductions)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Net Salary */}
                  <div className="mt-4 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-indigo-200">Net Salary (Take Home)</p>
                        <p className="text-2xl font-bold">{formatCurrency(p.netSalary)}</p>
                      </div>
                      <IndianRupee size={32} className="opacity-30" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Generate Payslips - Admin */}
      {tab === 'generate' && isAdmin && (
        <div className="max-w-lg mx-auto">
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
                <Briefcase size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">Generate Payslips</h3>
                <p className="text-xs text-gray-400">Generate payslips for all employees</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Month</label>
                  <select value={genMonth} onChange={e => setGenMonth(Number(e.target.value))} className="input mt-1">
                    {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Year</label>
                  <select value={genYear} onChange={e => setGenYear(Number(e.target.value))} className="input mt-1">
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-400">This will generate payslips for <span className="font-semibold">{monthNames[genMonth - 1]} {genYear}</span> for all active employees based on their salary structures and attendance records.</p>
              </div>
              <button onClick={handleGenerate} disabled={generating} className="btn-primary w-full flex items-center justify-center gap-2">
                {generating ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Plus size={16} /> Generate Payslips</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Salary Structures - Admin */}
      {tab === 'structures' && isAdmin && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold dark:text-white">Employee Salary Structures</h3>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Employee</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Basic</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">HRA</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">Transport</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">Medical</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden md:table-cell">Special</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Gross</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden md:table-cell">PF</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden md:table-cell">PT</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden lg:table-cell">IT</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {salaryStructures.map(s => {
                    const gross = (s.basicSalary || 0) + (s.hra || 0) + (s.transportAllowance || 0) + (s.medicalAllowance || 0) + (s.specialAllowance || 0);
                    const deductions = (s.providentFund || 0) + (s.professionalTax || 0) + (s.incomeTax || 0);
                    return (
                      <tr key={s.id}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium dark:text-white">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.department}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatCurrency(s.basicSalary)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatCurrency(s.hra)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden sm:table-cell">{formatCurrency(s.transportAllowance)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden sm:table-cell">{formatCurrency(s.medicalAllowance)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell">{formatCurrency(s.specialAllowance)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(gross)}</td>
                        <td className="px-4 py-3 text-sm text-red-500 hidden md:table-cell">{formatCurrency(s.providentFund)}</td>
                        <td className="px-4 py-3 text-sm text-red-500 hidden md:table-cell">{formatCurrency(s.professionalTax)}</td>
                        <td className="px-4 py-3 text-sm text-red-500 hidden lg:table-cell">{formatCurrency(s.incomeTax)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(gross - deductions)}</td>
                      </tr>
                    );
                  })}
                  {salaryStructures.length === 0 && <tr><td colSpan={11} className="text-center py-8 text-gray-400 text-sm">No salary structures found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
