import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { Printer, Download, AlertCircle, Terminal } from 'lucide-react';
import { Alert, AlertDescription } from './components/ui/alert';

const AuditLogger = () => {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [outputPath, setOutputPath] = useState(null);

  const auditSections = [
    { id: 1, title: 'Linux Kernel Information', command: 'uname -a' },
    // ... rest of the sections remain the same ...
  ];
  
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

  const handleRunAudit = async () => {
    setLoading(true);
    setError(null);
    setOutputPath(null);
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
  
      setAuditData({
        results: data.results,
        metadata: data.metadata
      });
      setOutputPath(data.outputPath);
    } catch (err) {
      setError(`Failed to run audit: ${err.message}`);
    } finally {
      setLoading(false);
    }
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

      // Get the filename from the Content-Disposition header or use a default
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

          {!auditData && !loading && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Click "Run Audit" to start system security analysis. The results will be automatically saved.
              </AlertDescription>
            </Alert>
          )}

          {/* Rest of the component remains the same */}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogger;