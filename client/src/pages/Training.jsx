import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Plus, X as XIcon, Users, Calendar, MapPin, BookOpen, Award, Sparkles, Monitor, Building, Layers, CheckCircle2, Clock, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

const SKILL_LEVELS = [
  { id: 'beginner', label: 'Beginner', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', dot: 'bg-slate-400' },
  { id: 'intermediate', label: 'Intermediate', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500' },
  { id: 'advanced', label: 'Advanced', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', dot: 'bg-purple-500' },
  { id: 'expert', label: 'Expert', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
];

const MODE_BADGES = {
  online: { icon: Monitor, label: 'Online', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  offline: { icon: Building, label: 'Offline', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  hybrid: { icon: Layers, label: 'Hybrid', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

export default function Training() {
  const { user, isAdmin } = useAuth();
  const [tab, setTab] = useState('programs');
  const [programs, setPrograms] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [skills, setSkills] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [programForm, setProgramForm] = useState({ title: '', description: '', instructor: '', startDate: '', endDate: '', mode: 'online', maxParticipants: '' });
  const [skillForm, setSkillForm] = useState({ name: '', level: 'beginner' });
  const [enrolling, setEnrolling] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    api.get('/training/programs').then(r => setPrograms(r.data)).catch(() => {});
    api.get('/training/my-enrollments').then(r => setEnrollments(r.data)).catch(() => {});
    api.get('/training/my-skills').then(r => setSkills(r.data)).catch(() => {});
  };

  const handleCreateProgram = async () => {
    try {
      await api.post('/training/programs', { ...programForm, maxParticipants: Number(programForm.maxParticipants) || undefined });
      toast.success('Training program created!');
      setShowCreate(false);
      setProgramForm({ title: '', description: '', instructor: '', startDate: '', endDate: '', mode: 'online', maxParticipants: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create program');
    }
  };

  const handleEnroll = async (programId) => {
    setEnrolling(programId);
    try {
      await api.post(`/training/enroll/${programId}`);
      toast.success('Successfully enrolled!');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to enroll');
    } finally {
      setEnrolling(null);
    }
  };

  const handleAddSkill = async () => {
    try {
      await api.post('/training/skills', skillForm);
      toast.success('Skill added!');
      setShowSkillForm(false);
      setSkillForm({ name: '', level: 'beginner' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add skill');
    }
  };

  const handleDeleteSkill = async (id) => {
    try {
      await api.delete(`/training/skills/${id}`);
      toast.success('Skill removed');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove skill');
    }
  };

  const isEnrolled = (programId) => enrollments.some(e => e.programId === programId || e.trainingProgramId === programId);

  const getModeBadge = (mode) => {
    const m = MODE_BADGES[mode] || MODE_BADGES.online;
    const Icon = m.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.class}`}>
        <Icon size={12} /> {m.label}
      </span>
    );
  };

  const getSkillLevel = (level) => SKILL_LEVELS.find(l => l.id === level) || SKILL_LEVELS[0];

  const getEnrollmentStatusBadge = (status) => {
    switch (status) {
      case 'enrolled': return <span className="badge badge-info">Enrolled</span>;
      case 'in_progress': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Clock size={12} /> In Progress</span>;
      case 'completed': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle2 size={12} /> Completed</span>;
      default: return <span className="badge badge-gray">{status || 'Enrolled'}</span>;
    }
  };

  const gradients = [
    'from-blue-500 to-cyan-500', 'from-emerald-500 to-teal-500',
    'from-purple-500 to-pink-500', 'from-amber-500 to-orange-500',
    'from-indigo-500 to-violet-500', 'from-rose-500 to-red-500',
  ];

  const skillColors = [
    'from-blue-400 to-blue-600', 'from-emerald-400 to-emerald-600',
    'from-purple-400 to-purple-600', 'from-amber-400 to-amber-600',
    'from-pink-400 to-pink-600', 'from-cyan-400 to-cyan-600',
    'from-indigo-400 to-indigo-600', 'from-rose-400 to-rose-600',
    'from-teal-400 to-teal-600', 'from-orange-400 to-orange-600',
  ];

  const tabs = [
    { id: 'programs', label: 'Available Programs' },
    { id: 'enrollments', label: 'My Enrollments' },
    { id: 'skills', label: 'My Skills' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>Training & Skills</h1>
            <p>Explore programs and manage your skills</p>
          </div>
          <div className="flex gap-2">
            {tab === 'skills' && (
              <button onClick={() => setShowSkillForm(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-xl text-sm font-medium hover:bg-white/90 transition shadow-lg">
                <Plus size={16} /> Add Skill
              </button>
            )}
            {isAdmin && tab === 'programs' && (
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-xl text-sm font-medium hover:bg-white/90 transition shadow-lg">
                <Plus size={16} /> Create Program
              </button>
            )}
          </div>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <GraduationCap size={100} className="text-white" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Available Programs */}
      {tab === 'programs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3 empty-state">
              <BookOpen size={64} />
              <p className="text-lg font-medium mt-2">No programs available</p>
              <p className="text-sm">Training programs will be listed here</p>
            </div>
          )}
          {programs.map((p, i) => (
            <div key={p.id} className="card hover:shadow-md transition-all duration-300 animate-slide-up flex flex-col" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center shadow-sm flex-shrink-0`}>
                  <GraduationCap size={20} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-800 dark:text-white truncate">{p.title}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Award size={12} /> {p.instructor || 'TBD'}
                  </p>
                </div>
              </div>

              {p.description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{p.description}</p>}

              <div className="space-y-2 mb-4 flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar size={12} />
                  <span>{p.startDate || 'TBD'} - {p.endDate || 'TBD'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getModeBadge(p.mode)}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                    <Users size={12} /> {p.enrolledCount || 0}{p.maxParticipants ? `/${p.maxParticipants}` : ''} enrolled
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t dark:border-slate-700">
                {isEnrolled(p.id) ? (
                  <button disabled className="w-full px-4 py-2 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} /> Enrolled
                  </button>
                ) : (
                  <button onClick={() => handleEnroll(p.id)} disabled={enrolling === p.id}
                    className="btn-primary w-full flex items-center justify-center gap-2">
                    {enrolling === p.id ? <Clock size={16} className="animate-spin" /> : <Plus size={16} />}
                    {enrolling === p.id ? 'Enrolling...' : 'Enroll Now'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My Enrollments */}
      {tab === 'enrollments' && (
        <div className="space-y-4">
          {enrollments.length === 0 && (
            <div className="empty-state">
              <BookOpen size={64} />
              <p className="text-lg font-medium mt-2">No enrollments yet</p>
              <p className="text-sm">Enroll in a program to get started</p>
            </div>
          )}
          {enrollments.map((e, i) => (
            <div key={e.id} className="card hover:shadow-md transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center shadow-sm`}>
                    <BookOpen size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">{e.programTitle || e.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-slate-400">{e.instructor || 'TBD'}</p>
                      {e.mode && getModeBadge(e.mode)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {e.startDate && (
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar size={12} /> {e.startDate} - {e.endDate || 'TBD'}
                    </p>
                  )}
                  {getEnrollmentStatusBadge(e.status)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My Skills */}
      {tab === 'skills' && (
        <div className="space-y-6">
          {skills.length === 0 && !showSkillForm && (
            <div className="empty-state">
              <Sparkles size={64} />
              <p className="text-lg font-medium mt-2">No skills added</p>
              <p className="text-sm">Add your skills to showcase your expertise</p>
            </div>
          )}
          {skills.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold dark:text-white mb-4 flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" /> Your Skills
              </h3>
              <div className="flex flex-wrap gap-3">
                {skills.map((s, i) => {
                  const level = getSkillLevel(s.level);
                  return (
                    <div key={s.id} className="group relative animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-gradient-to-r ${skillColors[i % skillColors.length]} bg-opacity-5 hover:shadow-md transition-all duration-300`}>
                        <div className={`w-2 h-2 rounded-full ${level.dot}`} />
                        <span className="text-sm font-medium text-slate-800 dark:text-white">{s.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${level.color}`}>{level.label}</span>
                        <button onClick={() => handleDeleteSkill(s.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all">
                          <XIcon size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Skills by Level Summary */}
              <div className="mt-6 pt-4 border-t dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SKILL_LEVELS.map(level => {
                  const count = skills.filter(s => s.level === level.id).length;
                  return (
                    <div key={level.id} className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                      <div className={`w-3 h-3 rounded-full ${level.dot} mx-auto mb-1`} />
                      <p className="text-lg font-bold text-slate-800 dark:text-white">{count}</p>
                      <p className="text-xs text-slate-400">{level.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slide Panel for Create Program */}
      {showCreate && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-slate-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-slate-700">
              <h2 className="text-lg font-semibold dark:text-white">Create Training Program</h2>
              <button onClick={() => setShowCreate(false)}><XIcon size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Program Title</label>
                <input value={programForm.title} onChange={e => setProgramForm({ ...programForm, title: e.target.value })} className="input mt-1" placeholder="e.g., Advanced React Workshop" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Description</label>
                <textarea value={programForm.description} onChange={e => setProgramForm({ ...programForm, description: e.target.value })} rows={3} className="input mt-1" placeholder="Program details..." />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Instructor</label>
                <input value={programForm.instructor} onChange={e => setProgramForm({ ...programForm, instructor: e.target.value })} className="input mt-1" placeholder="Instructor name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Start Date</label>
                  <input type="date" value={programForm.startDate} onChange={e => setProgramForm({ ...programForm, startDate: e.target.value })} className="input mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">End Date</label>
                  <input type="date" value={programForm.endDate} onChange={e => setProgramForm({ ...programForm, endDate: e.target.value })} className="input mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Mode</label>
                  <select value={programForm.mode} onChange={e => setProgramForm({ ...programForm, mode: e.target.value })} className="input mt-1">
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Max Participants</label>
                  <input type="number" value={programForm.maxParticipants} onChange={e => setProgramForm({ ...programForm, maxParticipants: e.target.value })} className="input mt-1" placeholder="Optional" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-slate-700">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateProgram} className="btn-primary" disabled={!programForm.title}>Create Program</button>
            </div>
          </div>
        </>
      )}

      {/* Add Skill Modal */}
      {showSkillForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowSkillForm(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold dark:text-white mb-4">Add Skill</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Skill Name</label>
                <input value={skillForm.name} onChange={e => setSkillForm({ ...skillForm, name: e.target.value })} className="input mt-1" placeholder="e.g., React, Python, Project Management" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 block">Proficiency Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {SKILL_LEVELS.map(level => (
                    <button key={level.id} onClick={() => setSkillForm({ ...skillForm, level: level.id })}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${skillForm.level === level.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'}`}>
                      <div className={`w-3 h-3 rounded-full ${level.dot}`} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{level.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowSkillForm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleAddSkill} className="btn-primary" disabled={!skillForm.name}>Add Skill</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
