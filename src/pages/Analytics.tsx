import React, { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import {
  AreaChart, Area, BarChart, Bar,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell
} from 'recharts';
import { TrendingUp, Target, Zap, Award, Activity, Calendar, BookOpen, ChevronRight, Filter } from 'lucide-react';
import { QuizLevel } from '../types';

const Analytics: React.FC = () => {
  const { quizHistory, materials } = useContext(AppContext);
  const navigate = useNavigate();
  const [showRecommendations, setShowRecommendations] = useState(false);

  // --- Data Derivation Logic ---

  // 1. Score History (Area Chart)
  const performanceData = useMemo(() => {
    return quizHistory
      .slice()
      .reverse()
      .map((h, index) => ({
        name: `Quiz ${index + 1}`,
        score: (h.score !== null && h.totalQuestions > 0) ? Math.round((h.score / h.totalQuestions) * 100) : 0,
        date: new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      }));
  }, [quizHistory]);

  const averageScore = useMemo(() => {
    if (performanceData.length === 0) return 0;
    return Math.round(performanceData.reduce((acc, curr) => acc + curr.score, 0) / performanceData.length);
  }, [performanceData]);

  // 2. Performance by Difficulty (Bar Chart)
  const difficultyData = useMemo(() => {
    const levels = {
      [QuizLevel.SIMPLE]: { total: 0, score: 0, label: 'Simple' },
      [QuizLevel.MODERATE]: { total: 0, score: 0, label: 'Moderate' },
      [QuizLevel.ADVANCED]: { total: 0, score: 0, label: 'Advanced' },
    };

    quizHistory.forEach(q => {
      const score = q.score !== null ? (q.score / q.totalQuestions) * 100 : 0;
      if (q.score !== null) {
        if (levels[q.level]) {
          levels[q.level].total += 1;
          levels[q.level].score += score;
        }
      }
    });

    return Object.values(levels).map(l => ({
      name: l.label,
      score: l.total > 0 ? Math.round(l.score / l.total) : 0,
      count: l.total
    }));
  }, [quizHistory]);

  // 3. Study Streak
  const streak = useMemo(() => {
    if (quizHistory.length === 0) return 0;
    const sortedDates = [...new Set(quizHistory.map(q => new Date(q.date).toDateString()))]
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActivity = sortedDates[0];
    const diffDays = (today.getTime() - lastActivity.getTime()) / (1000 * 3600 * 24);

    if (diffDays > 1) return 0;

    currentStreak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const curr = sortedDates[i];
      const next = sortedDates[i + 1];
      const diff = (curr.getTime() - next.getTime()) / (1000 * 3600 * 24);
      if (diff === 1) currentStreak++;
      else break;
    }
    return currentStreak;
  }, [quizHistory]);

  // Helper to get material title
  const getMaterialTitle = (id: string) => materials.find(m => m.id === id)?.title || 'Unknown Topic';

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600">
            Analytics Dashboard
          </h2>
          <p className="text-gray-500 mt-2 font-medium">Track your cognitive growth and mastery.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRecommendations(true)}
            className="group flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5"
          >
            <Zap size={18} className="group-hover:text-yellow-300 transition-colors" />
            View Insights
          </button>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard
          title="Avg. Score"
          value={`${averageScore}%`}
          icon={<TrendingUp size={24} className="text-white" />}
          trend={performanceData.length > 1 ? performanceData[performanceData.length - 1].score - performanceData[performanceData.length - 2].score : 0}
          color="emerald"
          gradient="from-emerald-400 to-teal-500"
        />
        <KpiCard
          title="Assessments"
          value={quizHistory.length}
          icon={<Target size={24} className="text-white" />}
          color="blue"
          gradient="from-blue-400 to-indigo-500"
        />
        <KpiCard
          title="Study Streak"
          value={`${streak} Days`}
          icon={<Zap size={24} className="text-white" />}
          color="amber"
          gradient="from-amber-400 to-orange-500"
        />
        <KpiCard
          title="Rank"
          value={averageScore >= 90 ? 'Master' : averageScore >= 75 ? 'Scholar' : 'Student'}
          icon={<Award size={24} className="text-white" />}
          color="purple"
          gradient="from-purple-400 to-fuchsia-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Chart: Score History */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-xl shadow-indigo-100/50 hover:shadow-2xl hover:shadow-indigo-200/50 transition-all duration-500 group">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-bold text-gray-900 text-xl flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300"><Activity size={20} /></div>
                Score Trajectory
              </h3>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    padding: '16px',
                    fontWeight: 600,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(4px)'
                  }}
                  cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '4 4' }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={4}
                  fill="url(#colorScore)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Chart: Difficulty Breakdown */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-xl shadow-orange-100/50 hover:shadow-2xl hover:shadow-orange-200/50 transition-all duration-500 group">
          <h3 className="font-bold text-gray-900 text-xl mb-8 flex items-center gap-2">
            <div className="p-2 bg-orange-50 rounded-xl text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300"><Filter size={20} /></div>
            Mastery by Level
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={difficultyData} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  width={80}
                  tick={{ fill: '#4b5563', fontSize: 13, fontWeight: 600 }}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="score" radius={[0, 100, 100, 0]} barSize={32} animationDuration={1500}>
                  {difficultyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <h3 className="font-bold text-gray-900 text-lg">Recent Assessments</h3>
          <button
            onClick={() => navigate('/evaluation')}
            className="text-sm text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-1 transition-colors"
          >
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Topic</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Date</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Level</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Type</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {quizHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <BookOpen size={32} className="text-gray-300" />
                      <p>No assessments taken yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                quizHistory.slice(0, 5).map((quiz) => (
                  <tr key={quiz.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-6 py-5 font-semibold text-gray-900 flex items-center gap-3">
                      <div className="p-2 bg-white border border-gray-100 rounded-lg shadow-sm group-hover:shadow-md transition-shadow text-indigo-600">
                        <BookOpen size={16} />
                      </div>
                      {getMaterialTitle(quiz.materialId)}
                    </td>
                    <td className="px-6 py-5 text-gray-500 font-medium">
                      {new Date(quiz.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border
                                        ${quiz.level === QuizLevel.SIMPLE ? 'bg-green-50 text-green-700 border-green-100' :
                          quiz.level === QuizLevel.MODERATE ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                            'bg-red-50 text-red-700 border-red-100'}`}>
                        {quiz.level}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-gray-500 font-medium capitalize">
                      {quiz.type.replace('-', ' ')}
                    </td>
                    <td className="px-6 py-5 text-right font-black text-gray-900">
                      {quiz.score !== null ? (
                        <span className={quiz.score / quiz.totalQuestions >= 0.8 ? 'text-emerald-600' : 'text-gray-900'}>
                          {Math.round((quiz.score / quiz.totalQuestions) * 100)}%
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations Modal */}
      {showRecommendations && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 relative animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 p-4 bg-white rounded-full shadow-xl">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full text-white">
                <Zap size={32} />
              </div>
            </div>

            <h3 className="text-2xl font-black text-center text-gray-900 mt-6 mb-2">
              Personalized Insights
            </h3>
            <p className="text-center text-gray-500 mb-8">Based on your recent learning patterns</p>

            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <h4 className="font-bold text-indigo-900 mb-1 flex items-center gap-2">
                  <Target size={16} /> Recommended Focus
                </h4>
                <p className="text-indigo-700 text-sm leading-relaxed">
                  Your performance on <strong>Simple</strong> quizzes is strong. Challenge yourself with <strong>Moderate</strong> difficulty to improve your Logic skills.
                </p>
              </div>

              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <h4 className="font-bold text-orange-900 mb-1 flex items-center gap-2">
                  <BookOpen size={16} /> Review Needed
                </h4>
                <p className="text-orange-700 text-sm leading-relaxed">
                  Check your Smart Notes for <strong>{getMaterialTitle(quizHistory[0]?.materialId || '')}</strong> before your next attempt.
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setShowRecommendations(false)}
                className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Beautified KPI Card Component
const KpiCard = ({ title, value, icon, trend, color, gradient }: any) => (
  <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-40 group relative overflow-hidden">
    <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full bg-${color}-500/5 blur-3xl group-hover:bg-${color}-500/10 transition-colors duration-500`}></div>

    <div className="flex justify-between items-start relative z-10">
      <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg shadow-${color}-200 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
        {icon}
      </div>
      {trend !== undefined && trend !== 0 && (
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border backdrop-blur-sm ${trend > 0 ? 'bg-emerald-50/80 text-emerald-700 border-emerald-100' : 'bg-red-50/80 text-red-700 border-red-100'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>

    <div className="relative z-10">
      <h3 className="text-4xl font-black text-gray-900 tracking-tight">{value}</h3>
      <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mt-1">{title}</p>
    </div>
  </div>
);

export default Analytics;
