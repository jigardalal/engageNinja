import React, { useState } from 'react';
import Papa from 'papaparse';
import { toast, Select } from './ui';

/**
 * CSV Import Modal Component
 * Handles CSV file upload, preview, and import
 */
export const CSVImportModal = ({ isOpen, onClose, onImportComplete }) => {
  const [step, setStep] = useState(1); // 1=upload, 2=preview, 3=mapping, 4=importing
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [csvColumns, setCsvColumns] = useState([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const expectedFields = ['name', 'phone', 'email', 'tags'];

  // Handle file selection
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      const errorMsg = 'Please select a CSV file';
      setError(errorMsg);
      toast({
        title: 'Invalid file type',
        description: errorMsg,
        variant: 'error'
      });
      return;
    }

    setFile(selectedFile);
    setError('');

    // Parse CSV
    Papa.parse(selectedFile, {
      header: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          const errorMsg = 'Error parsing CSV file';
          setError(errorMsg);
          toast({
            title: 'CSV parsing failed',
            description: errorMsg,
            variant: 'error'
          });
          return;
        }

        setCsvData(results.data.filter(row => Object.values(row).some(v => v))); // Filter empty rows
        setCsvColumns(results.meta.fields || []);

        // Initialize mapping
        const mapping = {};
        results.meta.fields?.forEach(col => {
          const lowerCol = col.toLowerCase().trim();
          if (expectedFields.includes(lowerCol)) {
            mapping[col] = lowerCol;
          }
        });
        setColumnMapping(mapping);
        setStep(2);
      },
      error: (error) => {
        const errorMsg = `CSV parsing error: ${error.message}`;
        setError(errorMsg);
        toast({
          title: 'CSV parsing error',
          description: error.message,
          variant: 'error'
        });
      }
    });
  };

  // Update column mapping
  const updateMapping = (csvColumn, dbField) => {
    const newMapping = { ...columnMapping };
    if (dbField === '') {
      delete newMapping[csvColumn];
    } else {
      newMapping[csvColumn] = dbField;
    }
    setColumnMapping(newMapping);
  };

  // Validate mapping
  const validateMapping = () => {
    const hasMandatory = Object.values(columnMapping).includes('name') &&
                         Object.values(columnMapping).includes('phone');

    if (!hasMandatory) {
      setError('Name and Phone fields are required');
      return false;
    }
    return true;
  };

  // Transform CSV data based on mapping
  const transformData = () => {
    return csvData.map(row => {
      const transformed = {};
      Object.entries(columnMapping).forEach(([csvCol, dbField]) => {
        if (dbField && row[csvCol]) {
          transformed[dbField] = row[csvCol];
        }
      });
      return transformed;
    }).filter(row => row.name && row.phone);
  };

  // Handle import
  const handleImport = async () => {
    if (!validateMapping()) {
      toast({
        title: 'Mapping validation failed',
        description: 'Name and Phone fields are required',
        variant: 'error'
      });
      return;
    }

    setImporting(true);
    setError('');

    try {
      const transformedData = transformData();

      if (transformedData.length === 0) {
        const errorMsg = 'No valid contacts to import';
        setError(errorMsg);
        toast({
          title: 'No valid contacts',
          description: errorMsg,
          variant: 'error'
        });
        setImporting(false);
        return;
      }

      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ data: transformedData })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Import failed');
      }

      setResults(data.data);
      setStep(4);

      // Show success toast
      toast({
        title: 'Import complete',
        description: `${data.data.imported} contacts imported successfully`,
        variant: 'success'
      });

      // Notify parent after delay
      setTimeout(() => {
        onImportComplete?.();
      }, 2000);

    } catch (err) {
      const errorMsg = err.message || 'Import failed';
      setError(errorMsg);
      toast({
        title: 'Import failed',
        description: errorMsg,
        variant: 'error'
      });
    } finally {
      setImporting(false);
    }
  };

  // Reset modal
  const reset = () => {
    setStep(1);
    setFile(null);
    setCsvData([]);
    setColumnMapping({});
    setCsvColumns([]);
    setError('');
    setResults(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Import Contacts from CSV</h2>
          <button
            onClick={reset}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Step 1: File Upload */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <label className="cursor-pointer">
                  <span className="text-primary font-medium hover:underline">Upload CSV file</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-sm text-gray-600">
                Expected columns: Name, Phone, Email (optional), Tags (optional)
              </p>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 && csvData.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {csvData.length} contacts found. Preview of first 5 rows:
              </p>
              <div className="overflow-x-auto bg-gray-50 rounded p-4">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      {csvColumns.map(col => (
                        <th key={col} className="px-3 py-2 text-left font-medium">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {csvColumns.map(col => (
                          <td key={col} className="px-3 py-2">{row[col]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => setStep(3)}
                className="btn-primary w-full"
              >
                Continue to Mapping
              </button>
            </div>
          )}

          {/* Step 3: Column Mapping */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Map CSV columns to contact fields:
              </p>
              {csvColumns.map(csvCol => (
                <div key={csvCol} className="grid grid-cols-2 gap-4 items-center">
                  <div className="bg-gray-100 px-3 py-2 rounded">{csvCol}</div>
                  <Select
                    value={columnMapping[csvCol] || ''}
                    onChange={(e) => updateMapping(csvCol, e.target.value)}
                  >
                    <option value="">-- Skip --</option>
                    {expectedFields.map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </Select>
                </div>
              ))}
              <button
                onClick={handleImport}
                disabled={importing}
                className="btn-primary w-full disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && results && (
            <div className="space-y-4 text-center">
              <div className="text-4xl font-bold text-green-600">✓</div>
              <h3 className="text-lg font-medium text-gray-900">Import Complete!</h3>
              <div className="bg-gray-50 rounded p-4 space-y-2">
                <p><span className="font-medium">{results.imported}</span> contacts imported</p>
                {results.failed > 0 && (
                  <p className="text-red-600"><span className="font-medium">{results.failed}</span> contacts failed</p>
                )}
              </div>
              {results.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3 max-h-40 overflow-y-auto text-left">
                  <p className="font-medium text-red-800 mb-2">Errors:</p>
                  {results.errors.slice(0, 10).map((err, idx) => (
                    <p key={idx} className="text-xs text-red-700">
                      Row {err.row}: {err.message}
                    </p>
                  ))}
                  {results.errors.length > 10 && (
                    <p className="text-xs text-red-700">... and {results.errors.length - 10} more</p>
                  )}
                </div>
              )}
              <button
                onClick={reset}
                className="btn-primary w-full"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVImportModal;
