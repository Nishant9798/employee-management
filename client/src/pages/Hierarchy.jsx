import { useState, useEffect } from 'react';
import api from '../api';
import { ChevronRight, ChevronDown, User, Users } from 'lucide-react';

export default function Hierarchy() {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    api.get('/employees/org/hierarchy').then(r => setEmployees(r.data));
  }, []);

  // Build tree structure
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
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Organization Hierarchy</h1>
        <p className="text-sm text-gray-500">Company reporting structure</p>
      </div>

      <div className="card">
        {tree.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Loading...</p>
        ) : (
          <div className="space-y-2">
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

  const roleColor = node.role === 'admin' ? 'bg-red-100 text-red-700 border-red-200' :
    node.role === 'manager' ? 'bg-blue-100 text-blue-700 border-blue-200' :
    'bg-gray-100 text-gray-700 border-gray-200';

  const avatarColor = node.role === 'admin' ? 'bg-red-100 text-red-700' :
    node.role === 'manager' ? 'bg-blue-100 text-blue-700' :
    'bg-indigo-100 text-indigo-700';

  return (
    <div style={{ marginLeft: level * 24 }}>
      <div
        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition hover:bg-gray-50 ${hasChildren ? '' : ''}`}
        onClick={() => hasChildren && setOpen(!open)}
      >
        {/* Expand/collapse icon */}
        <div className="w-5 flex items-center justify-center shrink-0">
          {hasChildren ? (
            open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          )}
        </div>

        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${avatarColor}`}>
          {node.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm">{node.name}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${roleColor}`}>
              {node.role.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-gray-500">{node.designation} &middot; {node.department}</p>
        </div>

        {/* Team count */}
        {hasChildren && (
          <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
            <Users size={14} />
            {node.children.length}
          </div>
        )}
      </div>

      {/* Children */}
      {open && hasChildren && (
        <div className="border-l-2 border-gray-100 ml-5">
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
