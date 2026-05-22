import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import './ComplianceAssistant.css';

const ComplianceAssistant = ({ data, filteredData, filters, complianceFilters, onFilterChange, onComplianceFilterToggle }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I'm your Compliance Assistant. I'm here to help you find and fix compliance issues in your projects.

What I can help you with:

📊 See what's happening
- Find projects with missing information or compliance issues
- Check project health status (Red, Amber, Green ratings)
- Get summaries and statistics about your projects

🔍 Filter your data
- Show projects from specific accounts, markets, or teams
- Highlight projects with particular compliance problems
- Clear filters to see everything again

📋 Fix compliance issues
- Explain what each compliance issue means
- Share guides and policies to help fix problems
- Suggest actions to improve your compliance scores

I can also apply filters to your dashboard based on our conversation.

What would you like to know?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const [policyLinks, setPolicyLinks] = useState({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load policy links CSV on component mount
  useEffect(() => {
    fetch('/policy-links.csv')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const linksMap = {};
            results.data.forEach(row => {
              const attribute = row['Compliance Attribute']?.trim();
              const link = row['Link']?.trim();
              if (attribute && link) {
                linksMap[attribute] = link;
              }
            });
            console.log('Loaded policy links:', linksMap);
            setPolicyLinks(linksMap);
          }
        });
      })
      .catch(error => {
        console.error('Error loading policy links:', error);
        console.error('Make sure policy-links.csv is in the public folder');
      });
  }, []);

  // Get available filter options from data
  const getFilterOptions = () => {
    const accounts = [...new Set(data.map(row => row.Account).filter(Boolean))];
    const markets = [...new Set(data.map(row => row.Market).filter(Boolean))];
    const serviceLevels = [...new Set(data.map(row => row['Service Level']).filter(Boolean))];
    const practices = [...new Set(data.map(row => row.Practice).filter(Boolean))];
    const projectManagers = [...new Set(data.map(row => row['Project Manager']).filter(Boolean))];
    
    return { accounts, markets, serviceLevels, practices, projectManagers };
  };

  // Build context from current data state
  const buildContext = () => {
    const activeComplianceFilters = Object.keys(complianceFilters)
      .filter(key => complianceFilters[key])
      .map(key => key.replace(/([A-Z])/g, ' $1').trim());

    const activeMainFilters = Object.entries(filters)
      .filter(([_, value]) => value !== '')
      .map(([key, value]) => `${key}: ${value}`);

    const options = getFilterOptions();

    // Format policy links for context
    const policyLinksText = Object.keys(policyLinks).length > 0 
      ? `\n\nAvailable Policy & Guidance Links:\n${Object.entries(policyLinks).map(([key, link]) => 
          `- ${key}: ${link}`
        ).join('\n')}`
      : '';
    
    console.log('Policy links in context:', Object.keys(policyLinks).length, 'links');

    return `
Current Dashboard State:
- Total Projects: ${data.length}
- Filtered Projects: ${filteredData.length}
- Active Main Filters: ${activeMainFilters.length > 0 ? activeMainFilters.join(', ') : 'None'}
- Active Compliance Filters: ${activeComplianceFilters.length > 0 ? activeComplianceFilters.join(', ') : 'None'}

Available Filter Values:
- Accounts: ${options.accounts.join(', ')}
- Markets: ${options.markets.join(', ')}
- Service Levels: ${options.serviceLevels.join(', ')}
- Practices: ${options.practices.join(', ')}

Sample Data (first 3 projects):
${filteredData.slice(0, 3).map((row, idx) => `
Project ${idx + 1}:
- Account: ${row.Account}
- Project Name: ${row['Project Name']}
- Stage: ${row.Stage}
- Project Manager: ${row['Project Manager'] || 'Not assigned'}
- Overall RAG: ${row['Reported Overall RAG']}
- WBS: ${row['Project WBS'] || 'Missing'}
`).join('\n')}
${policyLinksText}

You are a compliance assistant helping users understand their project governance data.
You can apply filters to the dashboard when users request it.
When users ask about how to fix compliance issues or need guidance, share the relevant policy links.
Always format links as clickable markdown links like [Link Text](URL).
`;
  };

  // Function definitions for the LLM to call
  const functionDefinitions = [
    {
      name: 'apply_main_filter',
      description: 'Apply a main filter to the dashboard (Account, Market, Service Level, Practice, or Project Manager)',
      parameters: {
        type: 'object',
        properties: {
          filterType: {
            type: 'string',
            enum: ['account', 'market', 'serviceLevel', 'practice', 'projectManager'],
            description: 'The type of filter to apply'
          },
          value: {
            type: 'string',
            description: 'The value to filter by. Use empty string to clear the filter.'
          }
        },
        required: ['filterType', 'value']
      }
    },
    {
      name: 'toggle_compliance_filter',
      description: 'Toggle a compliance attribute filter on or off',
      parameters: {
        type: 'object',
        properties: {
          filterKey: {
            type: 'string',
            enum: [
              'updateWbsCode',
              'reviewScheduleStatus',
              'reviewFinancialStatus',
              'reviewOverallStatus',
              'addActiveIssue',
              'updateProjectStatus',
              'updateOpenMilestones',
              'updateProjectStage',
              'updateProjectManager',
              'updateMilestones',
              'updateFinancials',
              'updateProjectStatusReport'
            ],
            description: 'The compliance filter to toggle'
          },
          enable: {
            type: 'boolean',
            description: 'Whether to enable (true) or disable (false) the filter'
          }
        },
        required: ['filterKey', 'enable']
      }
    }
  ];

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    if (!apiKey) {
      alert('Please enter your Groq API key first');
      return;
    }

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: buildContext() + '\n\nProvide helpful, concise answers about the governance data. Be specific and reference the data when possible. When users ask to filter or show specific data, use the available functions to apply filters.\n\nIMPORTANT: When a user requests multiple filter conditions (e.g., "show me Account 1 projects with missing WBS codes"), you MUST call BOTH the apply_filter function AND the toggle_compliance_filter function in the same response. Always apply all requested filters together, not just one.\n\nCRITICAL: When users ask about compliance issues, missing data, or how to fix specific compliance problems (e.g., "how do I fix missing WBS codes"), you MUST provide the FULL URL from the "Available Policy & Guidance Links" section. Do NOT just list the name - include the complete URL (e.g., "https://dxcportal.sharepoint.com/sites/..."). The policy links listed in that section are REAL links, not placeholders. If a specific compliance attribute has a link in that section, provide that exact full URL. If no link is available for that attribute, say "No policy link is available for this item."'
            },
            ...messages.slice(-5), // Include last 5 messages for context
            userMessage
          ],
          tools: functionDefinitions.map(func => ({
            type: 'function',
            function: func
          })),
          tool_choice: 'auto',
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const choice = data.choices[0];
      const message = choice.message;

      // Check if the assistant wants to call functions
      if (message.tool_calls && message.tool_calls.length > 0) {
        const functionResults = [];
        
        // Process all tool calls in the response
        for (const toolCall of message.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          let functionResult = '';

          // Execute the requested function
          if (functionName === 'apply_main_filter') {
            onFilterChange(functionArgs.filterType, functionArgs.value);
            functionResult = `Applied ${functionArgs.filterType} filter: ${functionArgs.value || 'cleared'}`;
          } else if (functionName === 'toggle_compliance_filter') {
            onComplianceFilterToggle(functionArgs.filterKey);
            functionResult = `${functionArgs.enable ? 'Enabled' : 'Disabled'} compliance filter: ${functionArgs.filterKey}`;
          }
          
          functionResults.push(functionResult);
        }

        // Add a message showing all actions taken
        const actionMessage = {
          role: 'assistant',
          content: `✓ ${functionResults.join('\n✓ ')}\n\nThe dashboard has been updated. ${message.content || 'Let me know if you need anything else!'}`
        };
        setMessages(prev => [...prev, actionMessage]);
      } else {
        // Regular text response
        const assistantMessage = {
          role: 'assistant',
          content: message.content
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error calling Groq API:', error);
      let errorMessage = 'Sorry, I encountered an error. ';
      
      if (error.message.includes('401')) {
        errorMessage += 'Invalid API key. Please check your Groq API key.';
      } else if (error.message.includes('429')) {
        errorMessage += 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage += 'Network error. Please check your internet connection.';
      } else {
        errorMessage += error.message;
      }
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const saveApiKey = () => {
    if (apiKey.trim()) {
      setShowApiKeyInput(false);
    }
  };

  // Render message content with markdown links
  const renderMessageContent = (content) => {
    // Simple markdown link parser: [text](url)
    const parts = [];
    let lastIndex = 0;
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      // Add the link
      parts.push(
        <a 
          key={match.index} 
          href={match[2]} 
          target="_blank" 
          rel="noopener noreferrer"
          className="chat-link"
        >
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <>
      {/* Floating chat button */}
      <button 
        className="chat-toggle-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Open Compliance Assistant"
      >
        💬
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>Compliance Assistant</h3>
            <button onClick={() => setIsOpen(false)} className="chat-close-button">✕</button>
          </div>

          {showApiKeyInput && (
            <div className="api-key-input-container">
              <p>Enter your Groq API Key:</p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="gsk_..."
                className="api-key-input"
              />
              <button onClick={saveApiKey} className="api-key-save-button">
                Save Key
              </button>
            </div>
          )}

          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                <div className="message-content">
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chat-message assistant">
                <div className="message-content typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about compliance issues, project status, or data insights..."
              className="chat-input"
              rows="2"
              disabled={isLoading || showApiKeyInput}
            />
            <button 
              onClick={sendMessage} 
              disabled={isLoading || !input.trim() || showApiKeyInput}
              className="chat-send-button"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ComplianceAssistant;
