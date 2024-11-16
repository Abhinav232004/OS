import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { Printer, Download, AlertCircle, Terminal } from 'lucide-react';
import { Alert, AlertDescription } from './components/ui/alert';

const AuditLogger = () => {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savePath, setSavePath] = useState('');
  const [error, setError] = useState(null);

  // Complete audit sections matching the bash script
  const auditSections = [
    { id: 1, title: 'Linux Kernel Information', command: 'uname -a' },
    { id: 2, title: 'Current User and ID Information', command: 'whoami && id' },
    { id: 3, title: 'Linux Distribution Information', command: 'lsb_release -a' },
    { id: 4, title: 'List Current Logged In Users', command: 'w' },
    { id: 5, title: 'Uptime Information', command: 'uptime' },
    { id: 6, title: 'Running Services', command: 'service --status-all | grep "+"' },
    { id: 7, title: 'Active Internet Connections and Open Ports', command: 'netstat -natp' },
    { id: 8, title: 'Available Disk Space', command: 'df -h' },
    { id: 9, title: 'Memory Usage', command: 'free -h' },
    { id: 10, title: 'Command History', command: 'history' },
    { id: 11, title: 'Network Interfaces', command: 'ifconfig -a' },
    { id: 12, title: 'IPtables Information', command: 'iptables -L -n -v' },
    { id: 13, title: 'Running Processes', command: 'ps -a' },
    { id: 14, title: 'SSH Configuration', command: 'cat /etc/ssh/sshd_config' },
    { id: 16, title: 'Network Parameters', command: 'cat /etc/sysctl.conf' },
    { id: 17, title: 'Password Policies', command: 'cat /etc/pam.d/common-password' },
    { id: 18, title: 'Source List File', command: 'cat /etc/apt/sources.list' },
    { id: 19, title: 'Check for Broken Dependencies', command: 'apt-get check' },
    { id: 20, title: 'MOTD Banner Message', command: 'cat /etc/motd' },
    { id: 21, title: 'List User Names', command: "cut -d: -f1 /etc/passwd" },
    { id: 22, title: 'Check for Null Passwords', command: "passwd -S" },
    { id: 23, title: 'IP Routing Table', command: 'route' },
    { id: 24, title: 'Kernel Messages', command: 'dmesg' },
    { id: 25, title: 'Check Upgradable Packages', command: 'apt list --upgradeable' },
    { id: 26, title: 'CPU/System Information', command: 'cat /proc/cpuinfo' },
    { id: 27, title: 'TCP Wrappers', command: 'cat /etc/hosts.allow && cat /etc/hosts.deny' },
    { id: 28, title: 'Failed Login Attempts', command: 'grep --color "failure" /var/log/auth.log' }
  ];
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

  const handleRunAudit = async () => {
    setLoading(true);
    setError(null);
    
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
    } catch (err) {
      setError(`Failed to run audit: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePathChange = (e) => {
    setSavePath(e.target.value);
  };

  const handleGeneratePDF = async () => {
    if (!savePath) {
      setError('Please specify a save path first');
      return;
    }
    
    try {
      // In a real implementation, this would generate a PDF
      // and save it to the specified path
      console.log(`Generating PDF report at: ${savePath}`);
      
      // Simulate PDF generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show success message
      alert('PDF report generated successfully!');
    } catch (err) {
      setError('Failed to generate PDF report: ' + err.message);
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
                onClick={handleGeneratePDF}
                disabled={!auditData || loading}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Save as PDF
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
          <div className="mb-6">
            <input
              type="text"
              placeholder="Enter path to save audit results (e.g., /path/to/save/LinuxAudit.pdf)"
              value={savePath}
              onChange={handleSavePathChange}
              className="w-full p-2 border rounded"
            />
          </div>

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
                Click "Run Audit" to start system security analysis. This will gather information about your system configuration and security settings.
              </AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="space-y-4">
              {auditSections.map((section) => (
                <div key={section.id} className="border rounded-lg p-4 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-16 bg-gray-100 rounded"></div>
                </div>
              ))}
            </div>
          )}

          {auditData && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Audit Metadata</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong>Timestamp:</strong> {new Date(auditData.metadata.timestamp).toLocaleString()}
                  </div>
                  <div>
                    <strong>Duration:</strong> {auditData.metadata.duration.toFixed(2)}s
                  </div>
                  <div>
                    <strong>Hostname:</strong> {auditData.metadata.hostname}
                  </div>
                </div>
              </div>

              {auditSections.map((section) => (
                <div key={section.id} className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <span className="text-gray-500">{section.id}.</span>
                    {section.title}
                  </h3>
                  <div className="text-xs text-gray-500 mb-2">Command: {section.command}</div>
                  <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                    {auditData.results[section.id]}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogger;