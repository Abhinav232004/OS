const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const cors = require('cors');
const fs = require('fs'); // Regular fs for streams
const fsPromises = require('fs').promises; // Promise-based fs operations
const PDFDocument = require('pdfkit');
const os = require('os');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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

// Helper function to format audit results for PDF
function formatAuditResultsForPDF(sections) {
  let formattedContent = '';
  
  // Add header
  formattedContent += 'LINUX SECURITY AUDIT REPORT\n';
  formattedContent += `Generated on: ${new Date().toLocaleString()}\n`;
  formattedContent += `Hostname: ${os.hostname()}\n\n`;
  
  // Add each section
  Object.entries(sections).forEach(([id, content]) => {
    formattedContent += `Section ${id}: ${content}\n\n`;
  });
  
  return formattedContent;
}

// Helper function to generate PDF
async function generatePDF(textContent, pdfPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4'
    });

    // Create write stream using regular fs
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    // Add title
    doc.fontSize(20)
       .text('Linux Security Audit Report', { align: 'center' })
       .moveDown(2);

    // Add metadata
    doc.fontSize(12)
       .text(`Generated on: ${new Date().toLocaleString()}`)
       .text(`Hostname: ${os.hostname()}`)
       .moveDown(2);

    // Add content with proper formatting
    doc.fontSize(10);
    const sections = textContent.split('\n\n');
    sections.forEach(section => {
      doc.text(section).moveDown();
    });

    // Finalize PDF
    doc.end();

    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}

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
  
  if (currentSection !== null) {
    sections[currentSection.id] = currentContent.join('\n');
  }
  
  return sections;
}

// Route to execute the audit
app.post('/api/audit', async (req, res) => {
  try {
    // Generate unique output path for this audit
    const outputName = `audit_${Date.now()}`;
    const outputPath = path.join(OUTPUTS_DIR, `${outputName}.txt`);
    
    // Create empty output file to verify write access
    await fsPromises.writeFile(outputPath, '');
    
    console.log('Executing script:', `${SCRIPT_PATH} ${outputPath}`);
    
    exec(`${SCRIPT_PATH} ${outputPath}`, {
      timeout: 300000, // 5 minute timeout
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
        
        const sections = parseAuditResults(auditResults);
        
        res.json({
          success: true,
          results: sections,
          outputPath: outputPath,
          metadata: {
            timestamp: new Date().toISOString(),
            hostname: os.hostname(),
            duration: (Date.now() - parseInt(outputName.split('_')[1])) / 1000
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
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Route to download PDF
app.get('/api/download-pdf', async (req, res) => {
  try {
    const { path: filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({ error: 'No file path provided' });
    }

    // Verify file exists and is within OUTPUTS_DIR
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(OUTPUTS_DIR)) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    // Check if file exists
    await fsPromises.access(normalizedPath);

    // Read the text file
    const textContent = await fsPromises.readFile(normalizedPath, 'utf8');
    const sections = parseAuditResults(textContent);
    
    // Format content for PDF
    const formattedContent = formatAuditResultsForPDF(sections);

    // Generate PDF
    const pdfPath = normalizedPath.replace('.txt', '.pdf');
    await generatePDF(formattedContent, pdfPath);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="LinuxAudit_${Date.now()}.pdf"`);

    // Stream the PDF file to the client using regular fs
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);

    // Clean up files after sending
    fileStream.on('end', async () => {
      try {
        await fsPromises.unlink(normalizedPath); // Delete text file
        await fsPromises.unlink(pdfPath); // Delete PDF file
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