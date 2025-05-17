'use client';

import { useState } from 'react';
import { EDClient } from '../../../shared/src/edclient';
import { threads } from '../../../shared/src/db/schema';

export default function EDTestPage() {
  const [apiKey, setApiKey] = useState('');
  const [token, setToken] = useState('');
  const [threadId, setThreadId] = useState('');
  const [threadData, setThreadData] = useState<typeof threads.$inferInsert | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGetToken = async () => {
    if (!apiKey) {
      setError('Please enter an API key');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const client = new EDClient(apiKey);
      const token = await client.getToken();
      setToken(token);
      console.log("Requête effectuée avec succès à l'API ED");
    } catch (error) {
      console.error('Error getting token:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGetMessage = async () => {
    if (!apiKey) {
      setError('Please enter an API key');
      return;
    }

    if (!threadId) {
      setError('Please enter a thread ID');
      return;
    }

    setLoading(true);
    setError('');
    setThreadData(null);
    
    try {
      const client = new EDClient(apiKey);
      const data = await client.getMessage(threadId);
      setThreadData(data);
      console.log("Thread data:", data);
    } catch (error) {
      console.error('Error getting message:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">ED Client Test</h1>
      
      <div className="mb-4">
        <label className="block mb-2">ED API Key:</label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Enter your ED API key"
        />
      </div>

      <button
        onClick={handleGetToken}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded disabled:opacity-50 mr-2"
      >
        {loading ? 'Loading...' : 'Get Token'}
      </button>

      {token && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Token:</h2>
          <div className="p-2 bg-gray-100 rounded border break-all text-black">
            {token}
          </div>
        </div>
      )}

      <div className="border-t border-gray-300 my-6"></div>
      
      <h2 className="text-xl font-bold mb-4">Get Thread Message</h2>
      
      <div className="mb-4">
        <label className="block mb-2">Thread ID:</label>
        <input
          type="text"
          value={threadId}
          onChange={(e) => setThreadId(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Enter the thread ID"
        />
      </div>

      <button
        onClick={handleGetMessage}
        disabled={loading}
        className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Get Message Content'}
      </button>

      {error && (
        <div className="mt-4 p-2 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}

      {threadData && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Thread Database Format</h2>
          
          <div className="p-4 bg-gray-100 rounded border overflow-auto max-h-screen text-black">
            <div className="font-bold text-lg mb-3 text-blue-700 border-b pb-2">
              {threadData.title}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="font-semibold">Basic Info:</div>
                <div className="text-sm">
                  <div><span className="font-medium">ID:</span> {threadData.id}</div>
                  <div><span className="font-medium">Course ID:</span> {threadData.courseId}</div>
                  <div><span className="font-medium">Category:</span> {threadData.category}</div>
                  <div><span className="font-medium">Subcategory:</span> {threadData.subcategory}</div>
                  <div><span className="font-medium">Subsubcategory:</span> {threadData.subsubcategory}</div>
                  <div><span className="font-medium">Created:</span> {threadData.createdAt?.toLocaleString()}</div>
                </div>
              </div>
              
              <div>
                <div className="font-semibold">Status:</div>
                <div className="text-sm">
                  <div><span className="font-medium">Answered:</span> {threadData.isAnswered ? 'Yes' : 'No'}</div>
                  <div><span className="font-medium">Staff Answered:</span> {threadData.isStaffAnswered ? 'Yes' : 'No'}</div>
                  <div><span className="font-medium">Student Answered:</span> {threadData.isStudentAnswered ? 'Yes' : 'No'}</div>
                </div>
              </div>
            </div>
            
            {/* Document section */}
            {threadData.document && (
              <div className="mb-6">
                <div className="font-semibold mb-2">Document:</div>
                <div className="border-l-4 border-gray-400 pl-2 whitespace-pre-wrap">
                  {threadData.document}
                </div>
              </div>
            )}
            
            {/* Images section */}
            {threadData.images && threadData.images.length > 0 && (
              <div className="mb-6">
                <div className="font-semibold mb-2">Images ({threadData.images.length}):</div>
                <div className="flex flex-wrap gap-2">
                  {threadData.images.map((url, index) => (
                    <a href={url} target="_blank" rel="noopener noreferrer" key={index} 
                      className="border rounded overflow-hidden hover:shadow-md transition-shadow">
                      <img src={url} alt={`Image ${index + 1}`} className="w-32 h-32 object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {/* Complete JSON representation */}
            <div className="mt-6">
              <details>
                <summary className="font-semibold cursor-pointer">Full Thread Data (JSON)</summary>
                <div className="mt-2 bg-gray-800 text-white p-3 rounded text-sm overflow-auto">
                  <pre>{JSON.stringify(threadData, null, 2)}</pre>
                </div>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 