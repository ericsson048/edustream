import { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { CheckCircle, Lock, Star, Trophy, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { skillService } from '../../services/skillService';
import type { SkillTreeData, SkillTreeNode, SkillTreeEdge } from '../../services/skillService';
import { useToast } from '../../contexts/ToastContext';

type NodeMap = Record<string, SkillTreeNode>;

export default function SkillTree() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [tree, setTree] = useState<SkillTreeData | null>(null);
  const [nodeMap, setNodeMap] = useState<NodeMap>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedNode, setSelectedNode] = useState<SkillTreeNode | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const trees = await skillService.listSkillTrees();
      const active = trees.find((t) => t.is_active);
      if (active) {
        setTree(active);
        const map: NodeMap = {};
        active.nodes.forEach((n) => { map[n.id] = n; });
        setNodeMap(map);
        setCompletedCount(active.nodes.filter((n) => n.status === 'COMPLETED').length);
      } else {
        setTree(null);
        setNodeMap({});
        setCompletedCount(0);
      }
    } catch {
      showToast('Unable to load skill tree.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadTree(); }, [loadTree]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const newTree = await skillService.generateSkillTree();
      setTree(newTree);
      const map: NodeMap = {};
      newTree.nodes.forEach((n) => { map[n.id] = n; });
      setNodeMap(map);
      setCompletedCount(0);
      showToast('Skill tree generated!', 'success');
    } catch {
      showToast('Unable to generate skill tree. Enroll in courses first.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleUnlock = async (nodeId: string) => {
    if (!tree) return;
    try {
      const updated = await skillService.unlockNextNode(tree.id, nodeId);
      setNodeMap((prev) => ({ ...prev, [nodeId]: updated }));
      setTree((prev) => prev ? {
        ...prev,
        nodes: prev.nodes.map((n) => n.id === nodeId ? updated : n),
      } : prev);
      setSelectedNode(updated);
    } catch {
      showToast('Complete prerequisite nodes first.', 'error');
    }
  };

  const totalNodes = Object.keys(nodeMap).length;
  const level = Math.floor(completedCount / 3) + 1;

  const getEdgeStatus = (edge: SkillTreeEdge): 'LOCKED' | 'UNLOCKED' | 'COMPLETED' => {
    const parent = nodeMap[edge.parent];
    const child = nodeMap[edge.child];
    if (parent?.status === 'COMPLETED' && child?.status === 'COMPLETED') return 'COMPLETED';
    if (parent?.status === 'COMPLETED' || parent?.status === 'UNLOCKED') return 'UNLOCKED';
    return 'LOCKED';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar />
        <main className="flex-1 ml-64">
          <Header />
          <div className="p-8 w-full mx-auto h-200 grid place-items-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 w-full mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('skillTree.title')}</h1>
              <p className="text-slate-500 mt-1">{tree?.description || t('skillTree.subtitle')}</p>
            </div>
            <div className="flex items-center gap-3">
              {tree && (
                <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg border border-amber-200 font-bold text-sm">
                  <Trophy className="w-4 h-4" /> {t('skillTree.level')} {level} {t('skillTree.learner')}
                </div>
              )}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>
          </div>

          {!tree ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-16 text-center">
              <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-600 mb-2">No skill tree yet</h2>
              <p className="text-slate-400 mb-6">Enroll in courses, then generate your personalized skill tree with AI.</p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                Generate My Skill Tree
              </button>
            </div>
          ) : (
            <>
              <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden relative h-[700px] border border-slate-800">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {tree.edges.map((edge) => {
                    const parent = nodeMap[edge.parent];
                    const child = nodeMap[edge.child];
                    if (!parent || !child) return null;
                    const status = getEdgeStatus(edge);
                    const strokeColor = status === 'COMPLETED' ? '#3b82f6' : status === 'UNLOCKED' ? '#2563eb' : '#475569';
                    return (
                      <path
                        key={edge.id}
                        d={`M ${parent.position_x} ${parent.position_y} L ${child.position_x} ${child.position_y}`}
                        stroke={strokeColor}
                        strokeWidth="0.8"
                        fill="none"
                        strokeDasharray={status === 'LOCKED' ? '1 1' : ''}
                        strokeLinecap="round"
                        opacity={status === 'LOCKED' ? 0.35 : 0.65}
                      />
                    );
                  })}
                </svg>

                {tree.nodes.map((node) => {
                  const status = nodeMap[node.id]?.status || node.status;
                  return (
                    <button
                      key={node.id}
                      onClick={() => setSelectedNode(nodeMap[node.id] || node)}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-20"
                      style={{ left: `${node.position_x}%`, top: `${node.position_y}%` }}
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 relative z-10 ${
                        status === 'COMPLETED' ? 'bg-blue-600 text-white shadow-blue-600/50' :
                        status === 'UNLOCKED' ? 'bg-amber-500 text-white shadow-amber-500/50 ring-4 ring-amber-500/30' :
                        'bg-slate-800 text-slate-500 border-2 border-slate-700'
                      }`}>
                        {status === 'COMPLETED' && <CheckCircle className="w-7 h-7" />}
                        {status === 'UNLOCKED' && <Star className="w-7 h-7 fill-current" />}
                        {status === 'LOCKED' && <Lock className="w-7 h-7" />}
                      </div>
                      <div className="mt-2 bg-slate-800/90 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-700 text-center whitespace-nowrap">
                        <p className={`text-xs font-bold ${status === 'LOCKED' ? 'text-slate-400' : 'text-white'}`}>{node.title}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedNode && (
                <div className="mt-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-900">{selectedNode.title}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          selectedNode.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                          selectedNode.status === 'UNLOCKED' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {selectedNode.status === 'COMPLETED' ? t('skillTree.completed') :
                           selectedNode.status === 'UNLOCKED' ? t('skillTree.inProgress') :
                           t('skillTree.locked')}
                        </span>
                      </div>
                      {selectedNode.description && (
                        <p className="text-sm text-slate-600 mb-4">{selectedNode.description}</p>
                      )}
                      <div className="flex items-center gap-3">
                        {selectedNode.status === 'LOCKED' && (
                          <button
                            onClick={() => handleUnlock(selectedNode.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" /> Unlock Node
                          </button>
                        )}
                        {selectedNode.status === 'UNLOCKED' && (
                          <p className="text-sm text-amber-600 font-medium">Complete the linked course to finish this node.</p>
                        )}
                        {selectedNode.status === 'COMPLETED' && (
                          <p className="text-sm text-blue-600 font-medium flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> Completed!
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                      <span className="text-slate-400 text-lg">&times;</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>{totalNodes} nodes &bull; {tree.edges.length} connections</span>
                <span>{completedCount} / {totalNodes} completed</span>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
