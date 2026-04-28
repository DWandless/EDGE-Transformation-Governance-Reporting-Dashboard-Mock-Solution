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

  // State to track which compliance attribute filters are active (toggle buttons)
  const [complianceFilters, setComplianceFilters] = useState({
    updateWbsCode: false,
    reviewScheduleStatus: false,
    reviewFinancialStatus: false,
    reviewOverallStatus: false,
    addActiveIssue: false,
    updateProjectStatus: false,
    updateOpenMilestones: false,
    updateProjectStage: false,
    updateProjectManager: false,
    updateMilestones: false,
    updateFinancials: false,
    updateProjectStatusReport: false
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

    // Apply main dropdown filters if they have a value selected
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

    // Apply compliance attribute filters - only show records that match ALL active compliance filters
    const activeComplianceFilters = Object.keys(complianceFilters).filter(key => complianceFilters[key]);
    
    if (activeComplianceFilters.length > 0) {
      filtered = filtered.filter(row => {
        // Check if row matches ALL active compliance filters
        return activeComplianceFilters.every(filterKey => {
          switch(filterKey) {
            case 'updateWbsCode':
              // Records with empty Project WBS field
              return !row['Project WBS'] || row['Project WBS'].trim() === '';
            
            case 'reviewScheduleStatus':
              // Reported Schedule RAG is healthier than calculated
              const schedRagOrder = { 'Green': 3, 'Amber': 2, 'Red': 1 };
              const calcSched = schedRagOrder[row['Calculated Schedule RAG']] || 0;
              const repSched = schedRagOrder[row['Reported Schedule RAG']] || 0;
              return repSched > calcSched;
            
            case 'reviewFinancialStatus':
              // Reported Financial RAG is healthier than calculated
              const finRagOrder = { 'Green': 3, 'Amber': 2, 'Red': 1 };
              const calcFin = finRagOrder[row['Calculated Financial RAG']] || 0;
              const repFin = finRagOrder[row['Reported Financial RAG']] || 0;
              return repFin > calcFin;
            
            case 'reviewOverallStatus':
              // Reported Overall RAG is healthier than calculated
              const overallRagOrder = { 'Green': 3, 'Amber': 2, 'Red': 1 };
              const calcOverall = overallRagOrder[row['Calculated Overall RAG']] || 0;
              const repOverall = overallRagOrder[row['Reported Overall RAG']] || 0;
              return repOverall > calcOverall;
            
            case 'addActiveIssue':
              // Active Issue field is empty AND Reported Overall is Red
              return (!row['Active Issue'] || row['Active Issue'].trim() === '') && 
                     row['Reported Overall RAG'] === 'Red';
            
            case 'updateProjectStatus':
              // Reported Overall is non-green AND Go-to-Green Date is past or empty
              const isNonGreen = row['Reported Overall RAG'] !== 'Green';
              const gtgEmpty = !row['Project GTG Date'] || row['Project GTG Date'].trim() === '';
              return isNonGreen && gtgEmpty;
            
            case 'updateOpenMilestones':
              // Open Milestone Date field is empty
              return !row['Open Milestone Date'] || row['Open Milestone Date'].trim() === '';
            
            case 'updateProjectStage':
              // Stage is "In Planning" (simplified - not checking 30 days)
              return row['Stage'] === 'In Planning';
            
            case 'updateProjectManager':
              // Project Manager field is empty
              return !row['Project Manager'] || row['Project Manager'].trim() === '';
            
            case 'updateMilestones':
              // Milestone Criteria Met is empty or FALSE
              return !row['Milestone Criteria Met'] || 
                     row['Milestone Criteria Met'].trim() === '' || 
                     row['Milestone Criteria Met'] === 'FALSE';
            
            case 'updateFinancials':
              // Any key financial field is missing
              const financialFields = ['Billing Type', 'Opportunity ID', 'Client ID', 
                                      'Planned Project Hours Baseline', 'Planned Hours', 
                                      'Schedule Remaining Hours', 'Project Currency', 
                                      'Planned Revenue Baseline', 'Billable'];
              return financialFields.some(field => !row[field] || row[field].toString().trim() === '');
            
            case 'updateProjectStatusReport':
              // Project Status Report Submission Date is empty
              return !row['Project Status Report Submission Date'] || 
                     row['Project Status Report Submission Date'].trim() === '';
            
            default:
              return true;
          }
        });
      });
    }

    // Update the filtered data state with the results
    setFilteredData(filtered);
  }, [filters, complianceFilters, data]); // Re-run when filters, compliance filters, or data changes

  // Function to update a specific filter when user selects a value
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev, // Keep all existing filter values
      [filterName]: value // Update only the changed filter
    }));
  };

  // Function to reset all main filters back to empty (show all data)
  const clearFilters = () => {
    setFilters({
      account: '',
      market: '',
      serviceLevel: '',
      practice: '',
      projectManager: ''
    });
  };

  // Function to toggle a compliance attribute filter on/off
  const toggleComplianceFilter = (filterKey) => {
    setComplianceFilters(prev => ({
      ...prev,
      [filterKey]: !prev[filterKey] // Toggle the boolean value
    }));
  };

  // Function to clear all compliance filters
  const clearComplianceFilters = () => {
    setComplianceFilters({
      updateWbsCode: false,
      reviewScheduleStatus: false,
      reviewFinancialStatus: false,
      reviewOverallStatus: false,
      addActiveIssue: false,
      updateProjectStatus: false,
      updateOpenMilestones: false,
      updateProjectStage: false,
      updateProjectManager: false,
      updateMilestones: false,
      updateFinancials: false,
      updateProjectStatusReport: false
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

      {/* Compliance Attribute Filters - Toggle buttons */}
      <div className="compliance-filters-container">
        <div className="compliance-filters-header">
          <h3>Compliance Attribute Filters</h3>
          <button onClick={clearComplianceFilters} className="clear-compliance-button">
            Clear All
          </button>
        </div>
        <div className="compliance-filters-grid">
          {/* Toggle button for each compliance attribute with hover tooltip */}
          <button 
            className={`compliance-toggle ${complianceFilters.updateWbsCode ? 'active' : ''}`}
            onClick={() => toggleComplianceFilter('updateWbsCode')}
            data-tooltip="Shows projects where the Project WBS field is empty"
          >
            Update WBS Code
          </button>
          <button 
            className={`compliance-toggle ${complianceFilters.reviewScheduleStatus ? 'active' : ''}`}
            onClick={() => toggleComplianceFilter('reviewScheduleStatus')}
            data-tooltip="Shows projects where the Reported Schedule RAG is healthier than the Calculated Schedule RAG"
          >
            Review Schedule Status
          </button>
          <button 
            className={`compliance-toggle ${complianceFilters.reviewFinancialStatus ? 'active' : ''}`}
            onClick={() => toggleComplianceFilter('reviewFinancialStatus')}
            data-tooltip="Shows projects where the Reported Financial RAG is healthier than the Calculated Financial RAG"
          >
            Review Financial Status
          </button>
          <button 
            className={`compliance-toggle ${complianceFilters.reviewOverallStatus ? 'active' : ''}`}
            onClick={() => toggleComplianceFilter('reviewOverallStatus')}
            data-tooltip="Shows projects where the Reported Overall RAG is healthier than the Calculated Overall RAG"
          >
            Review Overall Status
          </button>
          <button 
            className={`compliance-toggle ${complianceFilters.addActiveIssue ? 'active' : ''}`}
            onClick={() => toggleComplianceFilter('addActiveIssue')}
            data-tooltip="Shows projects where the Active Issue field is empty AND the Reported Overall RAG is Red"
          >
            Add Active Issue
          </button>
          <button 
            className={`compliance-toggle ${complianceFilters.updateProjectStatus ? 'active' : ''}`}
            onClick={() => toggleComplianceFilter('updateProjectStatus')}
            data-tooltip="Shows projects where the Reported Overall RAG is non-green AND the Go-to-Green Date is empty"
          >
            Update Project Status
          </button>
          <button 
            className={`compliance-toggle ${complianceFilters.updateOpenMilestones ? 'active' : ''}`}
            onClick={() => toggleComplianceFilter('updateOpenMilestones')}
            data-tooltip="Shows projects where the Open Milestone Date field is empty"
          >
            Update Open Milestones
          </button>
          <button 
            className={`compliance-toggle ${complianceFilters.updateProjectStage ? 'active' : ''}`}
            onClick={() => toggleComplianceFilter('updateProjectStage')}
            data-tooltip="Shows projects where the Stage is 'In Planning'"
          >
            Update Project Stage
          </button>
          <button 
            className={`compliance-toggle ${complianceFilters.updateProjectManager ? 'active' : ''}`}
            onClick={() => toggleComplianceFilter('updateProjectManager')}
            data-tooltip="Shows projects where the Project Manager field is empty"
          >
            Update Project Manager
          </button>
          <button 
            className={`compliance-toggle ${complianceFilters.updateMilestones ? 'active' : ''}`}
            onClick={() => toggleComplianceFilter('updateMilestones')}
            data-tooltip="Shows projects where the Milestone Criteria Met field is empty or FALSE"
          >
            Update Milestones
          </button>
          <button 
            className={`compliance-toggle ${complianceFilters.updateFinancials ? 'active' : ''}`}
            onClick={() => toggleComplianceFilter('updateFinancials')}
            data-tooltip="Shows projects where any key financial field is missing (Billing Type, Opportunity ID, Client ID, Planned Hours, etc.)"
          >
            Update Financials
          </button>
          <button 
            className={`compliance-toggle ${complianceFilters.updateProjectStatusReport ? 'active' : ''}`}
            onClick={() => toggleComplianceFilter('updateProjectStatusReport')}
            data-tooltip="Shows projects where the Project Status Report Submission Date is empty"
          >
            Update Status Report
          </button>
        </div>
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
