import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { Printer, Download, AlertCircle, Terminal } from 'lucide-react';
import { Alert, AlertDescription } from './components/ui/alert';

const AuditLogger = () => {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState(null);
  const [outputPath, setOutputPath] = useState(null);
  const [showSudoPrompt, setShowSudoPrompt] = useState(false);
  const [sudoPassword, setSudoPassword] = useState('');
  const [confirmingAuth, setConfirmingAuth] = useState(false);
  
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

  const handleRunAudit = () => {
    setShowSudoPrompt(true);
  };

  const handleDownloadPDF = async () => {
    if (!outputPath) {
      setError('No audit file available to download');
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/download-pdf?path=${outputPath}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'audit-report.pdf';

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download PDF: ' + err.message);
    }
  };

  const handleSudoSubmit = async (e) => {
    e.preventDefault();
    setConfirmingAuth(true);
    setError(null);
    
    try {
      // First verify sudo access
      const authResponse = await fetch(`${BACKEND_URL}/api/verify-sudo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: sudoPassword }),
      });

      if (!authResponse.ok) {
        throw new Error('Invalid sudo password');
      }

      // If sudo verification successful, proceed with audit
      setShowSudoPrompt(false);
      setLoading(true);
      
      const response = await fetch(`${BACKEND_URL}/api/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: sudoPassword }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      const file = data.outputPath.split('/').pop();
      setFileName(file);
  
      setOutputPath(data.outputPath);
      console.log(outputPath);
    } catch (err) {
      setError(`Failed to run audit: ${err.message}`);
    } finally {
      setSudoPassword(''); // Clear password
      setLoading(false);
      setConfirmingAuth(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-6 h-6" />
              <span>Linux Security Audit Logger</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={!outputPath || loading}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
              <Button
                onClick={handleRunAudit}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {loading ? 'Running Audit...' : 'Run Audit'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && !showSudoPrompt && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Click "Run Audit" to start system security analysis. Sudo access will be required.
              </AlertDescription>
            </Alert>
          )}

          {showSudoPrompt && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h3 className="text-lg font-semibold mb-4">Sudo Authentication Required</h3>
                <p className="text-gray-600 mb-4">
                  Please enter your sudo password to proceed with the security audit.
                </p>
                <form onSubmit={handleSudoSubmit}>
                  <input
                    type="password"
                    className="w-full p-2 border rounded mb-4"
                    placeholder="Enter sudo password"
                    value={sudoPassword}
                    onChange={(e) => setSudoPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                      onClick={() => {
                        setShowSudoPrompt(false);
                        setSudoPassword('');
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      disabled={!sudoPassword || confirmingAuth}
                    >
                      {confirmingAuth ? 'Verifying...' : 'Confirm'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {outputPath && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">PDF Preview</h3>
              <iframe
                src={`${BACKEND_URL}/outputs/${fileName}`}
                className="w-full h-[500px] border rounded"
                title="PDF Preview"
              ></iframe>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogger;