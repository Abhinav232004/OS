const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const cors = require('cors');
const fs = require('fs').promises;
const app = express();

app.use(cors());
app.use(express.json());

// Define paths
const SCRIPTS_DIR = path.join(__dirname, 'scripts');
const OUTPUTS_DIR = path.join(__dirname, 'outputs');
const SCRIPT_PATH = path.join(SCRIPTS_DIR, 'Linux.sh');

// Test file writing capabilities
async function testFileWriteAccess() {
  const testPath = path.join(OUTPUTS_DIR, 'test.txt');
  try {
    await fs.writeFile(testPath, 'Test write access');
    await fs.unlink(testPath);
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
    await fs.mkdir(SCRIPTS_DIR, { recursive: true });
    await fs.mkdir(OUTPUTS_DIR, { recursive: true });
    
    // Verify script exists
    const sourceScriptPath = path.join(__dirname, 'scripts', 'LinuxAudit.sh');
    
    try {
      await fs.access(sourceScriptPath);
    } catch (error) {
      throw new Error(`Source script not found at ${sourceScriptPath}`);
    }
    
    // Copy script to secure location
    await fs.copyFile(sourceScriptPath, SCRIPT_PATH);
    
    // Make script executable
    await fs.chmod(SCRIPT_PATH, '755');
    
    // Test file writing capabilities
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

// Route to execute the audit
app.post('/api/audit', async (req, res) => {
  try {
    // Ensure outputs directory exists
    await fs.mkdir(OUTPUTS_DIR, { recursive: true });
    
    // Generate unique output path for this audit
    const outputPath = path.join(OUTPUTS_DIR, `audit_${Date.now()}.txt`);
    
    // Create empty output file to verify write access
    await fs.writeFile(outputPath, '');
    
    console.log('Executing script:', `${SCRIPT_PATH} Y ${outputPath}`);
    
    // Execute script with output path
    exec(`${SCRIPT_PATH} Y ${outputPath}`, {
      timeout: 300000, // 5 minute timeout
      windowsHide: true // Prevent command window from showing on Windows
    }, async (error, stdout, stderr) => {
      if (error) {
        console.error('Execution error:', error);
        console.error('Script stdout:', stdout);
        console.error('Script stderr:', stderr);
        return res.status(500).json({ 
          error: 'Failed to execute audit',
          details: error.message,
          stdout,
          stderr
        });
      }
      
      try {
        // Verify file exists after script execution
        try {
          await fs.access(outputPath);
        } catch (accessError) {
          throw new Error(`Output file not created by script: ${outputPath}`);
        }
        
        // Read the output file
        const auditResults = await fs.readFile(outputPath, 'utf8');
        
        if (!auditResults || auditResults.trim() === '') {
          throw new Error('Audit output file is empty');
        }
        
        // Parse the results into sections
        const sections = parseAuditResults(auditResults);
        
        // Clean up the output file
        await fs.unlink(outputPath).catch(err => {
          console.warn('Failed to delete output file:', err);
        });
        
        res.json({
          success: true,
          results: sections,
          metadata: {
            timestamp: new Date().toISOString(),
            hostname: require('os').hostname(),
            scriptPath: SCRIPT_PATH,
            outputPath: outputPath
          }
        });
      } catch (readError) {
        console.error('Failed to process results:', readError);
        // Try to read stdout/stderr if file processing failed
        res.status(500).json({ 
          error: 'Failed to process audit results',
          details: readError.message,
          scriptOutput: { stdout, stderr }
        });
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Helper function to parse audit results
function parseAuditResults(rawOutput) {
  const sections = {};
  let currentSection = null;
  let currentContent = [];
  const lines = rawOutput.split('\n');
  
  for (const line of lines) {
    if (line.includes('###############################################')) {
      if (currentSection !== null) {
        sections[currentSection.id] = currentContent.join('\n');
        currentContent = [];
      }
      continue;
    }
    // Check for section headers
    const sectionMatch = line.match(/(\d+)\.\s+(.*)/);
    if (sectionMatch) {
      currentSection = {
        id: parseInt(sectionMatch[1]),
        title: sectionMatch[2].trim()
      };
      continue;
    }
    if (currentSection !== null) {
      currentContent.push(line);
    }
  }
  
  // Don't forget to add the last section
  if (currentSection !== null) {
    sections[currentSection.id] = currentContent.join('\n');
  }
  
  return sections;
}

// Initialize server
const PORT = process.env.PORT || 3001;
initializeEnvironment().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Scripts directory: ${SCRIPTS_DIR}`);
    console.log(`Outputs directory: ${OUTPUTS_DIR}`);
    console.log(`Script path: ${SCRIPT_PATH}`);
  });
});