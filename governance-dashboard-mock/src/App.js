/**
 * Main Application Component
 * 
 * This is the root React component of the application.
 * Displays the EDGE Governance & Reporting Dashboard with CSV data
 * and filtering capabilities by Account, Market, Service Level, Practice, and Project Manager.
 */

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse'; // Library for parsing CSV files
import './App.css';

function App() {
  // State to store the complete dataset from CSV
  const [data, setData] = useState([]);
  
  // State to store the filtered dataset based on user selections
  const [filteredData, setFilteredData] = useState([]);
  
  // State to track the current filter selections for each dropdown
  const [filters, setFilters] = useState({
    account: '',
    market: '',
    serviceLevel: '',
    practice: '',
    projectManager: ''
  });
  
  // State to store unique values for each filter dropdown
  const [filterOptions, setFilterOptions] = useState({
    accounts: [],
    markets: [],
    serviceLevels: [],
    practices: [],
    projectManagers: []
  });

  // useEffect hook runs once when component mounts to load CSV data
  useEffect(() => {
    // Fetch the CSV file from the public folder
    fetch('/EDGE Governance & Reporting Mock Dashboard Mock Data.csv')
      .then(response => response.text()) // Convert response to text
      .then(csvText => {
        // Parse CSV text into JavaScript objects using PapaParse
        Papa.parse(csvText, {
          header: true, // Use first row as column headers
          skipEmptyLines: true, // Ignore empty rows
          complete: (results) => {
            // Store the parsed data in state
            setData(results.data);
            setFilteredData(results.data);
            
            // Extract unique values for each filter dropdown
            // [...new Set()] creates an array of unique values, filter(Boolean) removes empty values
            const accounts = [...new Set(results.data.map(row => row.Account).filter(Boolean))].sort();
            const markets = [...new Set(results.data.map(row => row.Market).filter(Boolean))].sort();
            const serviceLevels = [...new Set(results.data.map(row => row['Service Level']).filter(Boolean))].sort();
            const practices = [...new Set(results.data.map(row => row.Practice).filter(Boolean))].sort();
            const projectManagers = [...new Set(results.data.map(row => row['Project Manager']).filter(Boolean))].sort();
            
            // Store the unique values in state for dropdown options
            setFilterOptions({
              accounts,
              markets,
              serviceLevels,
              practices,
              projectManagers
            });
          }
        });
      })
      .catch(error => console.error('Error loading CSV:', error));
  }, []); // Empty dependency array means this runs only once on mount

  // useEffect hook runs whenever filters or data changes to update filtered results
  useEffect(() => {
    // Start with the complete dataset
    let filtered = data;

    // Apply each filter if it has a value selected
    // Each filter narrows down the results further
    if (filters.account) {
      filtered = filtered.filter(row => row.Account === filters.account);
    }
    if (filters.market) {
      filtered = filtered.filter(row => row.Market === filters.market);
    }
    if (filters.serviceLevel) {
      filtered = filtered.filter(row => row['Service Level'] === filters.serviceLevel);
    }
    if (filters.practice) {
      filtered = filtered.filter(row => row.Practice === filters.practice);
    }
    if (filters.projectManager) {
      filtered = filtered.filter(row => row['Project Manager'] === filters.projectManager);
    }

    // Update the filtered data state with the results
    setFilteredData(filtered);
  }, [filters, data]); // Re-run when filters or data changes

  // Function to update a specific filter when user selects a value
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev, // Keep all existing filter values
      [filterName]: value // Update only the changed filter
    }));
  };

  // Function to reset all filters back to empty (show all data)
  const clearFilters = () => {
    setFilters({
      account: '',
      market: '',
      serviceLevel: '',
      practice: '',
      projectManager: ''
    });
  };

  // Render the dashboard UI
  return (
    <div className="App">
      {/* Header section with dashboard title */}
      <header className="App-header">
        <h1>EDGE Governance & Reporting Dashboard</h1>
      </header>

      {/* Filter controls section */}
      <div className="filters-container">
        <h2>Filters</h2>
        {/* Grid layout for filter dropdowns */}
        <div className="filters-grid">
          {/* Account filter dropdown */}
          <div className="filter-item">
            <label>Account:</label>
            <select 
              value={filters.account} // Controlled component - value from state
              onChange={(e) => handleFilterChange('account', e.target.value)} // Update state on change
            >
              <option value="">All</option>
              {/* Map through unique account values to create options */}
              {filterOptions.accounts.map(account => (
                <option key={account} value={account}>{account}</option>
              ))}
            </select>
          </div>

          {/* Market filter dropdown */}
          <div className="filter-item">
            <label>Market:</label>
            <select 
              value={filters.market}
              onChange={(e) => handleFilterChange('market', e.target.value)}
            >
              <option value="">All</option>
              {filterOptions.markets.map(market => (
                <option key={market} value={market}>{market}</option>
              ))}
            </select>
          </div>

          {/* Service Level filter dropdown */}
          <div className="filter-item">
            <label>Service Level:</label>
            <select 
              value={filters.serviceLevel}
              onChange={(e) => handleFilterChange('serviceLevel', e.target.value)}
            >
              <option value="">All</option>
              {filterOptions.serviceLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          {/* Practice filter dropdown */}
          <div className="filter-item">
            <label>Practice:</label>
            <select 
              value={filters.practice}
              onChange={(e) => handleFilterChange('practice', e.target.value)}
            >
              <option value="">All</option>
              {filterOptions.practices.map(practice => (
                <option key={practice} value={practice}>{practice}</option>
              ))}
            </select>
          </div>

          {/* Project Manager filter dropdown */}
          <div className="filter-item">
            <label>Project Manager:</label>
            <select 
              value={filters.projectManager}
              onChange={(e) => handleFilterChange('projectManager', e.target.value)}
            >
              <option value="">All</option>
              {filterOptions.projectManagers.map(pm => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>
          </div>

          {/* Clear filters button */}
          <div className="filter-item">
            <button onClick={clearFilters} className="clear-button">Clear All Filters</button>
          </div>
        </div>
        {/* Display count of filtered vs total records */}
        <p className="results-count">Showing {filteredData.length} of {data.length} projects</p>
      </div>

      {/* Table container with horizontal and vertical scrolling */}
      <div className="table-container">
        <table className="data-table">
          {/* Table header - stays visible when scrolling vertically */}
          <thead>
            <tr>
              {/* All 34 column headers from the CSV file */}
              <th>Account</th>
              <th>Market</th>
              <th>Service Level</th>
              <th>Practice</th>
              <th>Project ID</th>
              <th>Project Name</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Project Manager</th>
              <th>Stage</th>
              <th>Region</th>
              <th>Project WBS</th>
              <th>Opportunity ID</th>
              <th>Opportunity Name</th>
              <th>Client ID</th>
              <th>Billing Type</th>
              <th>Project Created Date</th>
              <th>Planned Project Hours Baseline</th>
              <th>Planned Hours</th>
              <th>Schedule Remaining Hours</th>
              <th>Project Currency</th>
              <th>Planned Revenue Baseline</th>
              <th>Billable</th>
              <th>Project GTG Date</th>
              <th>Calculated Overall RAG</th>
              <th>Reported Overall RAG</th>
              <th>Calculated Financial RAG</th>
              <th>Reported Financial RAG</th>
              <th>Calculated Schedule RAG</th>
              <th>Reported Schedule RAG</th>
              <th>Active Issue</th>
              <th>Project Status Report Submission Date</th>
              <th>Milestone Criteria Met</th>
              <th>Open Milestone Date</th>
            </tr>
          </thead>
          {/* Table body - displays filtered data rows */}
          <tbody>
            {/* Map through filtered data to create a table row for each project */}
            {filteredData.map((row, index) => (
              <tr key={index}>
                {/* Display each column value from the CSV data */}
                <td>{row.Account}</td>
                <td>{row.Market}</td>
                <td>{row['Service Level']}</td>
                <td>{row.Practice}</td>
                <td>{row['Project ID']}</td>
                <td>{row['Project Name']}</td>
                <td>{row['Start Date']}</td>
                <td>{row['End Date']}</td>
                <td>{row['Project Manager']}</td>
                <td>{row.Stage}</td>
                <td>{row.Region}</td>
                <td>{row['Project WBS']}</td>
                <td>{row['Opportunity ID']}</td>
                <td>{row['Opportunity Name']}</td>
                <td>{row['Client ID']}</td>
                <td>{row['Billing Type']}</td>
                <td>{row['Project Created Date']}</td>
                <td>{row['Planned Project Hours Baseline']}</td>
                <td>{row['Planned Hours']}</td>
                <td>{row['Schedule Remaining Hours']}</td>
                <td>{row['Project Currency']}</td>
                <td>{row['Planned Revenue Baseline']}</td>
                <td>{row.Billable}</td>
                <td>{row['Project GTG Date']}</td>
                {/* RAG status columns with color-coded styling based on value (green/amber/red) */}
                <td className={`rag-${row['Calculated Overall RAG']?.toLowerCase()}`}>
                  {row['Calculated Overall RAG']}
                </td>
                <td className={`rag-${row['Reported Overall RAG']?.toLowerCase()}`}>
                  {row['Reported Overall RAG']}
                </td>
                <td className={`rag-${row['Calculated Financial RAG']?.toLowerCase()}`}>
                  {row['Calculated Financial RAG']}
                </td>
                <td className={`rag-${row['Reported Financial RAG']?.toLowerCase()}`}>
                  {row['Reported Financial RAG']}
                </td>
                <td className={`rag-${row['Calculated Schedule RAG']?.toLowerCase()}`}>
                  {row['Calculated Schedule RAG']}
                </td>
                <td className={`rag-${row['Reported Schedule RAG']?.toLowerCase()}`}>
                  {row['Reported Schedule RAG']}
                </td>
                {/* Governance tracking fields */}
                <td>{row['Active Issue']}</td>
                <td>{row['Project Status Report Submission Date']}</td>
                <td>{row['Milestone Criteria Met']}</td>
                <td>{row['Open Milestone Date']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
