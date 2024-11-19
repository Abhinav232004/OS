const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const fsPromises = require('fs').promises;
const os = require('os');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
const { spawn } = require('child_process');

// Define paths
const SCRIPTS_DIR = path.join(__dirname, 'scripts');
const OUTPUTS_DIR = path.join(__dirname, 'outputs');
const SCRIPT_PATH = path.join(SCRIPTS_DIR, 'LinuxAudit.sh');

// Test file writing capabilities
async function testFileWriteAccess() {
  const testPath = path.join(OUTPUTS_DIR, 'test.txt');
  try {
    await fsPromises.writeFile(testPath, 'Test write access');
    await fsPromises.unlink(testPath);
    console.log('Write access test successful');
    return true;
  } catch (error) {
    console.error('Write access test failed:', error);
    return false;
  }
}

// Initialize required directories and script
async function initializeEnvironment() {
  try {
    // Create directories if they don't exist
    await fsPromises.mkdir(SCRIPTS_DIR, { recursive: true });
    await fsPromises.mkdir(OUTPUTS_DIR, { recursive: true });
    
    const writeTest = await testFileWriteAccess();
    if (!writeTest) {
      throw new Error('Failed to verify write access to outputs directory');
    }
    
    console.log('Environment initialized successfully');
  } catch (error) {
    console.error('Failed to initialize environment:', error);
    process.exit(1);
  }
}

// Helper function to verify sudo access
async function verifySudoAccess(password) {
  return new Promise((resolve, reject) => {
    const sudo = spawn('sudo', ['-S', '-v']);

    sudo.stdin.write(`${password}\n`);
    sudo.stdin.end();

    sudo.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error('Invalid sudo password'));
      }
    });
  });
}

// Route to verify sudo access
app.post('/api/verify-sudo', async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    await verifySudoAccess(password);
    res.json({ success: true });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Route to execute the audit
app.post('/api/audit', async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    await verifySudoAccess(password);
    
    // Generate unique output name for this audit
    const timestamp = Date.now();
    const outputName = `audit_${timestamp}`;
    
    const command = `echo "${OUTPUTS_DIR}/${outputName}" | sudo -S ${SCRIPT_PATH}`;
    const outputPath =`${OUTPUTS_DIR}/${outputName}.pdf`;

    exec(command, {
      timeout: 300000,
      windowsHide: true
    }, async (error, stdout, stderr) => {
      if (error) {
        console.error('Execution error:', error);
        return res.status(500).json({ 
          error: 'Failed to execute audit',
          details: error.message
        });
      }
      
      try {
        const auditResults = await fsPromises.readFile(outputPath, 'utf8');
        
        if (!auditResults || auditResults.trim() === '') {
          throw new Error('Audit output file is empty');
        }
                
        res.json({
          success: true,
          outputPath: outputPath,
          metadata: {
            timestamp: new Date().toISOString(),
            hostname: os.hostname(),
            duration: (Date.now() - timestamp) / 1000
          }
        });
      } catch (readError) {
        console.error('Failed to process results:', readError);
        res.status(500).json({ 
          error: 'Failed to process audit results',
          details: readError.message
        });
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(401).json({ 
      error: 'Sudo authentication failed',
      details: error.message
    });
  }
});

app.use('/outputs', express.static(path.join(__dirname, 'outputs')));

// Route to download PDF
app.get('/api/download-pdf', async (req, res) => {
  try {
    const { path: filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({ error: 'No file path provided' });
    }

    const normalizedPath = path.normalize(filePath);

    await fsPromises.access(normalizedPath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="LinuxAudit_${Date.now()}.pdf"`);

    const fileStream = fs.createReadStream(normalizedPath);
    fileStream.pipe(res);

    fileStream.on('end', async () => {
      try {
        await fsPromises.unlink(normalizedPath);
      } catch (error) {
        console.error('Error cleaning up files:', error);
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    details: err.message
  });
});

// Initialize server
const PORT = process.env.PORT || 3001;
initializeEnvironment().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Scripts directory: ${SCRIPTS_DIR}`);
    console.log(`Outputs directory: ${OUTPUTS_DIR}`);
    console.log(`Script path: ${SCRIPT_PATH}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;