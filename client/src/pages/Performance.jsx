import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Star, Target, TrendingUp, Plus, X as XIcon, Edit3, ChevronRight, Award, BarChart3, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const GOAL_CATEGORIES = [
  { id: 'performance', label: 'Performance', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: 'learning', label: 'Learning', color: 'from-purple-500 to-pink-500', bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { id: 'technical', label: 'Technical', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
];

export default function Performance() {
  const { user, isAdmin, isManager } = useAuth();
  const [tab, setTab] = useState('reviews');
  const [myReviews, setMyReviews] = useState([]);
  const [myGoals, setMyGoals] = useState([]);
  const [teamReviews, setTeamReviews] = useState([]);
  const [teamGoals, setTeamGoals] = useState([]);
  const [selfReviewModal, setSelfReviewModal] = useState(null);
  const [selfForm, setSelfForm] = useState({ selfRating: 3, selfComments: '' });
  const [managerReviewModal, setManagerReviewModal] = useState(null);
  const [managerForm, setManagerForm] = useState({ rating: 3, strengths: '', improvements: '', goals: '', comments: '' });
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalForm, setGoalForm] = useState({ title: '', description: '', category: 'performance', targetDate: '', progress: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    api.get('/performance/my-reviews').then(r => setMyReviews(r.data)).catch(() => {});
    api.get('/performance/my-goals').then(r => setMyGoals(r.data)).catch(() => {});
    if (isManager) {
      api.get('/performance/team-reviews').then(r => setTeamReviews(r.data)).catch(() => {});
      api.get('/performance/team-goals').then(r => setTeamGoals(r.data)).catch(() => {});
    }
  };

  const handleSelfReview = async () => {
    try {
      await api.put(`/performance/self-review/${selfReviewModal.id}`, selfForm);
      toast.success('Self-review submitted successfully!');
      setSelfReviewModal(null);
      setSelfForm({ selfRating: 3, selfComments: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit self-review');
    }
  };

  const handleManagerReview = async () => {
    try {
      await api.put(`/performance/complete-review/${managerReviewModal.id}`, managerForm);
      toast.success('Review submitted successfully!');
      setManagerReviewModal(null);
      setManagerForm({ rating: 3, strengths: '', improvements: '', goals: '', comments: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit review');
    }
  };

  const handleSaveGoal = async () => {
    try {
      if (editingGoal) {
        await api.put(`/performance/goals/${editingGoal.id}`, goalForm);
        toast.success('Goal updated!');
      } else {
        await api.post('/performance/goals', goalForm);
        toast.success('Goal created!');
      }
      setShowGoalModal(false);
      setEditingGoal(null);
      setGoalForm({ title: '', description: '', category: 'performance', targetDate: '', progress: 0 });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save goal');
    }
  };

  const openEditGoal = (goal) => {
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title || '',
      description: goal.description || '',
      category: goal.category || 'performance',
      targetDate: goal.targetDate || '',
      progress: goal.progress || 0,
    });
    setShowGoalModal(true);
  };

  const renderStars = (rating, size = 16) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} size={size} className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'} />
        ))}
      </div>
    );
  };

  const getGoalStatusBadge = (status) => {
    switch (status) {
      case 'not_started': return <span className="badge badge-gray">Not Started</span>;
      case 'in_progress': return <span className="badge badge-info">In Progress</span>;
      case 'completed': return <span className="badge badge-success">Completed</span>;
      case 'overdue': return <span className="badge badge-danger">Overdue</span>;
      default: return <span className="badge badge-gray">{status || 'Pending'}</span>;
    }
  };

  const getGoalCategory = (cat) => GOAL_CATEGORIES.find(c => c.id === cat) || GOAL_CATEGORIES[0];

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'from-emerald-500 to-teal-500';
    if (progress >= 50) return 'from-blue-500 to-cyan-500';
    if (progress >= 25) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const tabs = [
    { id: 'reviews', label: 'My Reviews' },
    { id: 'goals', label: 'My Goals' },
    ...(isManager ? [
      { id: 'teamReviews', label: 'Team Reviews' },
      { id: 'teamGoals', label: 'Team Goals' },
    ] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>Performance Management</h1>
            <p>Track reviews, goals and growth</p>
          </div>
          {(tab === 'goals' || tab === 'teamGoals') && (
            <button onClick={() => { setEditingGoal(null); setGoalForm({ title: '', description: '', category: 'performance', targetDate: '', progress: 0 }); setShowGoalModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-lg text-sm font-medium hover:bg-white/90 transition shadow-lg">
              <Plus size={16} /> Add Goal
            </button>
          )}
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <Award size={100} className="text-white" />
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

      {/* My Reviews */}
      {tab === 'reviews' && (
        <div className="space-y-4">
          {myReviews.length === 0 && (
            <div className="empty-state">
              <BarChart3 size={64} />
              <p className="text-lg font-medium mt-2">No reviews yet</p>
              <p className="text-sm">Your performance reviews will appear here</p>
            </div>
          )}
          {myReviews.map((r, i) => (
            <div key={r.id} className="card hover:shadow-md transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                    <Star size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">{r.period || r.reviewPeriod || 'Performance Review'}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Reviewed by: {r.reviewerName || 'Pending'}</p>
                    {r.rating ? (
                      <div className="flex items-center gap-2 mt-2">
                        {renderStars(r.rating)}
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{r.rating}/5</span>
                      </div>
                    ) : (
                      <span className="badge badge-warning mt-2">Pending Review</span>
                    )}
                  </div>
                </div>
                {r.status === 'pending' && (
                  <button onClick={() => { setSelfReviewModal(r); setSelfForm({ selfRating: r.selfRating || 3, selfComments: r.selfComments || '' }); }}
                    className="btn-primary flex items-center gap-2 text-sm">
                    <Edit3 size={14} /> Self Review
                  </button>
                )}
              </div>

              {(r.strengths || r.improvements || r.comments) && (
                <div className="mt-4 pt-4 border-t dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {r.strengths && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg">
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Strengths</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{r.strengths}</p>
                    </div>
                  )}
                  {r.improvements && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Areas for Improvement</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{r.improvements}</p>
                    </div>
                  )}
                  {r.comments && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg md:col-span-2">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Comments</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{r.comments}</p>
                    </div>
                  )}
                </div>
              )}

              {r.selfRating && (
                <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Self Rating:</p>
                    {renderStars(r.selfRating, 14)}
                    <span className="text-xs text-gray-500">({r.selfRating}/5)</span>
                  </div>
                  {r.selfComments && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{r.selfComments}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* My Goals */}
      {tab === 'goals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myGoals.length === 0 && (
            <div className="md:col-span-2 empty-state">
              <Target size={64} />
              <p className="text-lg font-medium mt-2">No goals set</p>
              <p className="text-sm">Add your first goal to start tracking progress</p>
            </div>
          )}
          {myGoals.map((g, i) => {
            const cat = getGoalCategory(g.category);
            return (
              <div key={g.id} className="card hover:shadow-md transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-sm`}>
                      <Target size={18} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">{g.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.bg}`}>{cat.label}</span>
                        {getGoalStatusBadge(g.status)}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => openEditGoal(g)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition">
                    <Edit3 size={14} />
                  </button>
                </div>
                {g.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{g.description}</p>}
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{g.progress || 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${getProgressColor(g.progress || 0)} rounded-full transition-all duration-500`} style={{ width: `${g.progress || 0}%` }} />
                  </div>
                </div>
                {g.targetDate && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-2">
                    <Target size={12} /> Target: {g.targetDate}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Team Reviews - Manager */}
      {tab === 'teamReviews' && isManager && (
        <div className="space-y-4">
          {teamReviews.length === 0 && (
            <div className="empty-state">
              <BarChart3 size={64} />
              <p className="text-lg font-medium mt-2">No team reviews</p>
              <p className="text-sm">Team member reviews will appear here</p>
            </div>
          )}
          {teamReviews.map((r, i) => (
            <div key={r.id} className="card hover:shadow-md transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm text-white font-semibold">
                    {(r.employeeName || '?')[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">{r.employeeName}</h3>
                    <p className="text-xs text-gray-400">{r.department} - {r.period || r.reviewPeriod || 'Review'}</p>
                    {r.rating ? (
                      <div className="flex items-center gap-2 mt-2">
                        {renderStars(r.rating)}
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{r.rating}/5</span>
                      </div>
                    ) : (
                      <span className="badge badge-warning mt-2">Needs Review</span>
                    )}
                  </div>
                </div>
                {(!r.rating && (r.status === 'manager_review' || r.status === 'self_review' || r.status === 'pending')) && (
                  <button onClick={() => {
                    setManagerReviewModal(r);
                    setManagerForm({ rating: r.rating || 3, strengths: r.strengths || '', improvements: r.improvements || '', goals: r.goals || '', comments: r.comments || '' });
                  }} className="btn-primary flex items-center gap-2 text-sm">
                    <Edit3 size={14} /> Review
                  </button>
                )}
              </div>

              {r.selfRating && (
                <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Self Rating:</p>
                    {renderStars(r.selfRating, 14)}
                    <span className="text-xs text-gray-500">({r.selfRating}/5)</span>
                  </div>
                  {r.selfComments && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{r.selfComments}</p>}
                </div>
              )}

              {(r.strengths || r.improvements) && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {r.strengths && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg">
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Strengths</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{r.strengths}</p>
                    </div>
                  )}
                  {r.improvements && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Improvements</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{r.improvements}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Team Goals - Manager */}
      {tab === 'teamGoals' && isManager && (
        <div className="space-y-4">
          {teamGoals.length === 0 && (
            <div className="empty-state">
              <Target size={64} />
              <p className="text-lg font-medium mt-2">No team goals</p>
              <p className="text-sm">Team member goals will appear here</p>
            </div>
          )}
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Employee</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Goal</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Progress</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:table-cell">Target</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {teamGoals.map(g => {
                  const cat = getGoalCategory(g.category);
                  return (
                    <tr key={g.id}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium dark:text-white">{g.employeeName}</p>
                        <p className="text-xs text-gray-400">{g.department}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium dark:text-white">{g.title}</p>
                        {g.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{g.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.bg}`}>{cat.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${getProgressColor(g.progress || 0)} rounded-full`} style={{ width: `${g.progress || 0}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{g.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden sm:table-cell">{g.targetDate || '-'}</td>
                      <td className="px-4 py-3">{getGoalStatusBadge(g.status)}</td>
                    </tr>
                  );
                })}
                {teamGoals.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No team goals found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Self-Review Modal */}
      {selfReviewModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setSelfReviewModal(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold dark:text-white mb-1">Self Review</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{selfReviewModal.period || selfReviewModal.reviewPeriod || 'Performance Review'}</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">Self Rating</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="1" max="5" step="1" value={selfForm.selfRating} onChange={e => setSelfForm({ ...selfForm, selfRating: Number(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-amber-500" />
                  <div className="flex items-center gap-1">
                    {renderStars(selfForm.selfRating, 18)}
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">{selfForm.selfRating}/5</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Comments</label>
                <textarea value={selfForm.selfComments} onChange={e => setSelfForm({ ...selfForm, selfComments: e.target.value })} rows={4} className="input mt-1" placeholder="Share your thoughts on your performance..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setSelfReviewModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleSelfReview} className="btn-primary">Submit Self Review</button>
            </div>
          </div>
        </>
      )}

      {/* Manager Review Modal */}
      {managerReviewModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setManagerReviewModal(null)} />
          <div className="slide-panel slide-panel-active bg-white dark:bg-gray-800 shadow-2xl z-50">
            <div className="flex justify-between items-center p-5 border-b dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold dark:text-white">Review: {managerReviewModal.employeeName}</h2>
                <p className="text-sm text-gray-400">{managerReviewModal.period || managerReviewModal.reviewPeriod || 'Performance Review'}</p>
              </div>
              <button onClick={() => setManagerReviewModal(null)}><XIcon size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)]">
              {managerReviewModal.selfRating && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Employee Self Rating: {managerReviewModal.selfRating}/5</p>
                  {managerReviewModal.selfComments && <p className="text-sm text-gray-600 dark:text-gray-400">{managerReviewModal.selfComments}</p>}
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">Rating</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="1" max="5" step="1" value={managerForm.rating} onChange={e => setManagerForm({ ...managerForm, rating: Number(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-amber-500" />
                  <div className="flex items-center gap-1">
                    {renderStars(managerForm.rating, 18)}
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">{managerForm.rating}/5</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Strengths</label>
                <textarea value={managerForm.strengths} onChange={e => setManagerForm({ ...managerForm, strengths: e.target.value })} rows={3} className="input mt-1" placeholder="Key strengths observed..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Areas for Improvement</label>
                <textarea value={managerForm.improvements} onChange={e => setManagerForm({ ...managerForm, improvements: e.target.value })} rows={3} className="input mt-1" placeholder="Areas to work on..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Goals for Next Period</label>
                <textarea value={managerForm.goals} onChange={e => setManagerForm({ ...managerForm, goals: e.target.value })} rows={2} className="input mt-1" placeholder="Goals and expectations..." />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Additional Comments</label>
                <textarea value={managerForm.comments} onChange={e => setManagerForm({ ...managerForm, comments: e.target.value })} rows={2} className="input mt-1" placeholder="Any other feedback..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t dark:border-gray-700">
              <button onClick={() => setManagerReviewModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleManagerReview} className="btn-primary">Submit Review</button>
            </div>
          </div>
        </>
      )}

      {/* Goal Modal */}
      {showGoalModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => { setShowGoalModal(false); setEditingGoal(null); }} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold dark:text-white mb-4">{editingGoal ? 'Edit Goal' : 'Add New Goal'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Title</label>
                <input value={goalForm.title} onChange={e => setGoalForm({ ...goalForm, title: e.target.value })} className="input mt-1" placeholder="Goal title" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
                <textarea value={goalForm.description} onChange={e => setGoalForm({ ...goalForm, description: e.target.value })} rows={2} className="input mt-1" placeholder="Describe your goal..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Category</label>
                  <select value={goalForm.category} onChange={e => setGoalForm({ ...goalForm, category: e.target.value })} className="input mt-1">
                    {GOAL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Target Date</label>
                  <input type="date" value={goalForm.targetDate} onChange={e => setGoalForm({ ...goalForm, targetDate: e.target.value })} className="input mt-1" />
                </div>
              </div>
              {editingGoal && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">Progress: {goalForm.progress}%</label>
                  <input type="range" min="0" max="100" step="5" value={goalForm.progress} onChange={e => setGoalForm({ ...goalForm, progress: Number(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-500" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setShowGoalModal(false); setEditingGoal(null); }} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveGoal} className="btn-primary" disabled={!goalForm.title}>{editingGoal ? 'Update' : 'Create'} Goal</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
