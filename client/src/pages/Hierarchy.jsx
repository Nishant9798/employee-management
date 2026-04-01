import { useState, useEffect } from 'react';
import api from '../api';
import { ChevronRight, ChevronDown, Users, TreePine, Network } from 'lucide-react';

export default function Hierarchy() {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    api.get('/employees/org/hierarchy').then(r => setEmployees(r.data)).catch(() => {});
  }, []);

  const buildTree = (list) => {
    const map = {};
    const roots = [];
    list.forEach(e => { map[e.id] = { ...e, children: [] }; });
    list.forEach(e => {
      if (e.managerId && map[e.managerId]) {
        map[e.managerId].children.push(map[e.id]);
      } else {
        roots.push(map[e.id]);
      }
    });
    return roots;
  };

  const tree = buildTree(employees);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10">
          <h1>Organization Hierarchy</h1>
          <p>Company reporting structure</p>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <Network size={100} className="text-white" />
        </div>
      </div>

      <div className="card">
        {tree.length === 0 ? (
          <div className="empty-state">
            <TreePine size={64} />
            <p className="text-lg font-medium mt-2">Loading hierarchy...</p>
          </div>
        ) : (
          <div className="space-y-1">
            {tree.map(node => <TreeNode key={node.id} node={node} level={0} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function TreeNode({ node, level }) {
  const [open, setOpen] = useState(level < 2);
  const hasChildren = node.children.length > 0;

  const avatarGradient = node.role === 'admin' ? 'from-red-500 to-pink-500' :
    node.role === 'manager' ? 'from-blue-500 to-cyan-500' :
    'from-indigo-500 to-purple-500';

  const roleColor = node.role === 'admin' ? 'badge-danger' :
    node.role === 'manager' ? 'badge-info' : 'badge-gray';

  return (
    <div style={{ marginLeft: level * 24 }} className="animate-fade-in">
      <div
        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${hasChildren ? '' : ''}`}
        onClick={() => hasChildren && setOpen(!open)}
      >
        <div className="w-5 flex items-center justify-center shrink-0">
          {hasChildren ? (
            <div className={`transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}>
              <ChevronDown size={16} className="text-gray-400" />
            </div>
          ) : (
            <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
          )}
        </div>

        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm`}>
          {node.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 dark:text-white text-sm">{node.name}</span>
            <span className={`badge ${roleColor}`}>
              {node.role}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{node.designation} &middot; {node.department}</p>
        </div>

        {hasChildren && (
          <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
            <Users size={12} />
            {node.children.length}
          </div>
        )}
      </div>

      {open && hasChildren && (
        <div className="border-l-2 border-indigo-100 dark:border-indigo-900/30 ml-5">
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
