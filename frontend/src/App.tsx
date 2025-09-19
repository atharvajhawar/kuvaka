import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = 'http://localhost:3000/api';

interface Offer {
  name: string;
  value_props: string[];
  ideal_use_cases: string[];
}

interface Lead {
  name: string;
  role: string;
  company: string;
  industry: string;
  location: string;
  linkedin_bio: string;
  score?: number;
  intent?: string;
  reasoning?: string;
}

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [file, setFile] = useState<File | null>(null);
  const [offer, setOffer] = useState<Offer>({
    name: '',
    value_props: [''],
    ideal_use_cases: ['']
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [scoredLeads, setScoredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const response = await axios.get(`${API_BASE}/health`);
      console.log('API Health:', response.data);
    } catch (error) {
      setMessage('Backend API is not running. Please start the server.');
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      setMessage('Please select a file');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE}/leads/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setLeads(response.data.data.sample || []);
      setMessage(`Successfully uploaded ${response.data.data.count} leads`);
      setActiveTab('offer');
    } catch (error: any) {
      setMessage(error.response?.data?.error?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOfferSubmit = async () => {
    if (!offer.name || offer.value_props.filter(v => v).length === 0) {
      setMessage('Please fill in all offer fields');
      return;
    }

    setLoading(true);
    try {
      const cleanedOffer = {
        ...offer,
        value_props: offer.value_props.filter(v => v.trim()),
        ideal_use_cases: offer.ideal_use_cases.filter(u => u.trim())
      };

      await axios.post(`${API_BASE}/offer`, cleanedOffer);
      setMessage('Offer created successfully');
      setActiveTab('score');
    } catch (error: any) {
      setMessage(error.response?.data?.error?.message || 'Failed to create offer');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreLeads = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/score`);
      setStats(response.data.data.stats);
      setScoredLeads(response.data.data.topLeads || []);
      setMessage('Leads scored successfully');
      setActiveTab('results');

      // Fetch full results
      const resultsResponse = await axios.get(`${API_BASE}/results`);
      setScoredLeads(resultsResponse.data.data || []);
    } catch (error: any) {
      setMessage(error.response?.data?.error?.message || 'Scoring failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API_BASE}/export/csv`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'scored_leads.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage('CSV exported successfully');
    } catch (error: any) {
      setMessage('Export failed');
    }
  };

  const addValueProp = () => {
    setOffer({ ...offer, value_props: [...offer.value_props, ''] });
  };

  const addUseCase = () => {
    setOffer({ ...offer, ideal_use_cases: [...offer.ideal_use_cases, ''] });
  };

  const updateValueProp = (index: number, value: string) => {
    const newProps = [...offer.value_props];
    newProps[index] = value;
    setOffer({ ...offer, value_props: newProps });
  };

  const updateUseCase = (index: number, value: string) => {
    const newCases = [...offer.ideal_use_cases];
    newCases[index] = value;
    setOffer({ ...offer, ideal_use_cases: newCases });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Lead Qualification Dashboard</h1>
        <p>AI-Powered Lead Scoring System</p>
      </header>

      {message && (
        <div className={`message ${message.includes('failed') || message.includes('Please') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="tabs">
        <button
          className={activeTab === 'upload' ? 'active' : ''}
          onClick={() => setActiveTab('upload')}
        >
          1. Upload Leads
        </button>
        <button
          className={activeTab === 'offer' ? 'active' : ''}
          onClick={() => setActiveTab('offer')}
          disabled={leads.length === 0}
        >
          2. Define Offer
        </button>
        <button
          className={activeTab === 'score' ? 'active' : ''}
          onClick={() => setActiveTab('score')}
          disabled={!offer.name}
        >
          3. Score Leads
        </button>
        <button
          className={activeTab === 'results' ? 'active' : ''}
          onClick={() => setActiveTab('results')}
          disabled={scoredLeads.length === 0}
        >
          4. View Results
        </button>
      </div>

      <div className="content">
        {activeTab === 'upload' && (
          <div className="upload-section">
            <h2>Upload CSV File</h2>
            <p>Upload a CSV file containing lead information (name, role, company, industry, location, linkedin_bio)</p>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button onClick={handleFileUpload} disabled={loading || !file}>
              {loading ? 'Uploading...' : 'Upload Leads'}
            </button>

            {leads.length > 0 && (
              <div className="preview">
                <h3>Sample Leads Preview</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Company</th>
                      <th>Industry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.slice(0, 3).map((lead, idx) => (
                      <tr key={idx}>
                        <td>{lead.name}</td>
                        <td>{lead.role}</td>
                        <td>{lead.company}</td>
                        <td>{lead.industry}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'offer' && (
          <div className="offer-section">
            <h2>Define Your Offer</h2>

            <div className="form-group">
              <label>Product/Service Name</label>
              <input
                type="text"
                value={offer.name}
                onChange={(e) => setOffer({ ...offer, name: e.target.value })}
                placeholder="e.g., AI-Powered Sales Automation Platform"
              />
            </div>

            <div className="form-group">
              <label>Value Propositions</label>
              {offer.value_props.map((prop, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={prop}
                  onChange={(e) => updateValueProp(idx, e.target.value)}
                  placeholder="e.g., Increase conversion rates by 3x"
                />
              ))}
              <button className="add-btn" onClick={addValueProp}>+ Add Value Prop</button>
            </div>

            <div className="form-group">
              <label>Ideal Use Cases</label>
              {offer.ideal_use_cases.map((useCase, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={useCase}
                  onChange={(e) => updateUseCase(idx, e.target.value)}
                  placeholder="e.g., B2B SaaS companies"
                />
              ))}
              <button className="add-btn" onClick={addUseCase}>+ Add Use Case</button>
            </div>

            <button onClick={handleOfferSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Offer'}
            </button>
          </div>
        )}

        {activeTab === 'score' && (
          <div className="score-section">
            <h2>Score Your Leads</h2>
            <p>Click the button below to score all uploaded leads based on your offer</p>

            <div className="offer-summary">
              <h3>Current Offer: {offer.name}</h3>
              <div>
                <strong>Value Props:</strong>
                <ul>
                  {offer.value_props.filter(v => v).map((prop, idx) => (
                    <li key={idx}>{prop}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Use Cases:</strong>
                <ul>
                  {offer.ideal_use_cases.filter(u => u).map((useCase, idx) => (
                    <li key={idx}>{useCase}</li>
                  ))}
                </ul>
              </div>
            </div>

            <button onClick={handleScoreLeads} disabled={loading}>
              {loading ? 'Scoring...' : 'Score All Leads'}
            </button>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="results-section">
            <h2>Lead Scoring Results</h2>

            {stats && (
              <div className="stats">
                <div className="stat-card">
                  <h3>{stats.total}</h3>
                  <p>Total Leads</p>
                </div>
                <div className="stat-card high">
                  <h3>{stats.high}</h3>
                  <p>High Intent</p>
                </div>
                <div className="stat-card medium">
                  <h3>{stats.medium}</h3>
                  <p>Medium Intent</p>
                </div>
                <div className="stat-card low">
                  <h3>{stats.low}</h3>
                  <p>Low Intent</p>
                </div>
                <div className="stat-card">
                  <h3>{stats.averageScore}</h3>
                  <p>Average Score</p>
                </div>
              </div>
            )}

            <button className="export-btn" onClick={handleExport}>
              Export to CSV
            </button>

            <div className="leads-grid">
              {scoredLeads.map((lead, idx) => (
                <div key={idx} className="lead-card">
                  <div className="score-badge" style={{ backgroundColor: getScoreColor(lead.score || 0) }}>
                    {lead.score}
                  </div>
                  <h4>{lead.name}</h4>
                  <p className="role">{lead.role} at {lead.company}</p>
                  <p className="industry">{lead.industry} • {lead.location}</p>
                  <p className="bio">{lead.linkedin_bio}</p>
                  <div className={`intent-badge ${(lead.intent || '').toLowerCase()}`}>
                    {lead.intent} Intent
                  </div>
                  <p className="reasoning">{lead.reasoning}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
