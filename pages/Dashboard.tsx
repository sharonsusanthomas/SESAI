import React, { useContext } from 'react';
import FileUpload from '../components/FileUpload';
import { AppContext } from '../App';
import { FileText, Image, Clock, ArrowRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  // No props needed for navigation anymore
}

const Dashboard: React.FC<DashboardProps> = () => {
  const { materials, addMaterial, removeMaterial, setActiveMaterialId } = useContext(AppContext);
  const navigate = useNavigate();

  const handleStartStudying = (id: string) => {
    setActiveMaterialId(id);
    navigate('/study');
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to remove this material?")) {
      removeMaterial(id);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-gray-800">Learning Materials</h2>
        <p className="text-gray-500">Upload your class notes, textbooks, or diagrams to get started.</p>
      </header>

      <section>
        <FileUpload onUploadComplete={addMaterial} />
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-between">
          Your Library
          <span className="text-xs font-normal bg-gray-200 px-2 py-1 rounded-full">{materials.length} items</span>
        </h3>

        {materials.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-500">
            No materials uploaded yet. Upload a file above to begin learning.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map((item) => (
              <div key={item.id} className="bg-white border rounded-lg p-5 hover:shadow-md transition-shadow flex flex-col h-full relative group">

                <button
                  onClick={(e) => handleDelete(e, item.id)}
                  className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors p-1"
                  title="Remove Material"
                >
                  <Trash2 size={16} />
                </button>

                <div className="flex items-start justify-between mb-3 pr-8">
                  <div className={`p-2 rounded-lg ${item.type === 'image' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {item.type === 'image' ? <Image size={20} /> : <FileText size={20} />}
                  </div>
                </div>

                <h4 className="font-semibold text-gray-900 mb-2 truncate" title={item.title}>{item.title}</h4>
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                  <Clock size={12} />
                  {new Date(item.processedDate).toLocaleDateString()}
                </div>

                <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-1">
                  {item.summary ? item.summary : "No summary available yet."}
                </p>

                <button
                  onClick={() => handleStartStudying(item.id)}
                  className="w-full mt-auto text-sm text-blue-600 font-medium hover:bg-blue-50 py-2 rounded transition-colors flex items-center justify-center gap-1"
                >
                  Start Studying <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;