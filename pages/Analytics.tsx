import React, { useContext } from 'react';
import { AppContext } from '../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Target, Clock } from 'lucide-react';

const Analytics: React.FC = () => {
  const { quizHistory } = useContext(AppContext);

  // Prepare Data
  const data = quizHistory.map((h, index) => ({
    name: `Quiz ${index + 1}`,
    score: (h.score / h.totalQuestions) * 100,
    date: new Date(h.date).toLocaleDateString()
  }));

  const averageScore = data.length > 0 
    ? Math.round(data.reduce((a, b) => a + b.score, 0) / data.length) 
    : 0;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-gray-800">Performance Analytics</h2>
        <p className="text-gray-500">Track your mastery and progress over time.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
           <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
             <Target size={24} />
           </div>
           <div>
             <p className="text-sm text-gray-500">Assessments Taken</p>
             <h3 className="text-2xl font-bold text-gray-900">{quizHistory.length}</h3>
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
           <div className="p-3 bg-green-100 text-green-600 rounded-lg">
             <TrendingUp size={24} />
           </div>
           <div>
             <p className="text-sm text-gray-500">Average Score</p>
             <h3 className="text-2xl font-bold text-gray-900">{averageScore}%</h3>
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
           <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
             <Clock size={24} />
           </div>
           <div>
             <p className="text-sm text-gray-500">Study Streak</p>
             <h3 className="text-2xl font-bold text-gray-900">{quizHistory.length > 0 ? 'Active' : 'Inactive'}</h3>
           </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Progress Line Chart */}
        <div className="bg-white p-6 rounded-xl border shadow-sm h-80">
          <h3 className="font-semibold text-gray-800 mb-6">Performance Trend</h3>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              No data available yet
            </div>
          )}
        </div>

        {/* Weakness Analysis (Mock) */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
           <h3 className="font-semibold text-gray-800 mb-4">Concept Mastery</h3>
           <div className="space-y-4">
             <div>
               <div className="flex justify-between text-sm mb-1">
                 <span className="text-gray-600">Theoretical Concepts</span>
                 <span className="font-medium text-green-600">High</span>
               </div>
               <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                 <div className="h-full bg-green-500 w-[85%]"></div>
               </div>
             </div>
             <div>
               <div className="flex justify-between text-sm mb-1">
                 <span className="text-gray-600">Problem Solving</span>
                 <span className="font-medium text-yellow-600">Medium</span>
               </div>
               <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                 <div className="h-full bg-yellow-500 w-[60%]"></div>
               </div>
             </div>
             <div>
               <div className="flex justify-between text-sm mb-1">
                 <span className="text-gray-600">Application</span>
                 <span className="font-medium text-blue-600">Good</span>
               </div>
               <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 w-[72%]"></div>
               </div>
             </div>
           </div>
           
           <div className="mt-8 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
             <strong>Recommendation:</strong> Focus on "Problem Solving" for your next study session. Try taking a Level 2 Quiz on recent topics.
           </div>
        </div>

      </div>
    </div>
  );
};

export default Analytics;
