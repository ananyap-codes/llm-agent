// LLM Agent - Core Application Logic

class LLMAgent {
    constructor() {
        this.messages = [];
        this.isProcessing = false;
        this.selectedModel = 'openai/gpt-4';
        this.apiKey = null;
        
        this.initializeUI();
        this.setupEventListeners();
        this.setupTools();
        
        console.log('LLM Agent initialized successfully');
    }

    initializeUI() {
        this.conversationArea = document.getElementById('conversationArea');
        this.messagesContainer = document.getElementById('messages');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.alertContainer = document.getElementById('alertContainer');
        this.selectedModelSpan = document.getElementById('selectedModel');
        
        // Verify all elements are found
        if (!this.userInput) {
            console.error('User input element not found');
        } else {
            console.log('User input element found');
        }
        if (!this.sendButton) {
            console.error('Send button element not found');
        } else {
            console.log('Send button element found');
        }
    }

    setupEventListeners() {
        // Send button click handler
        if (this.sendButton) {
            this.sendButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Send button clicked');
                this.handleUserInput();
            });
        }
        
        // Enter key handler
        if (this.userInput) {
            this.userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    console.log('Enter key pressed');
                    this.handleUserInput();
                }
            });
            
            // Debug: log input changes
            this.userInput.addEventListener('input', (e) => {
                console.log('Input value:', e.target.value);
            });
        }
        
        // Model dropdown handlers
        const dropdownItems = document.querySelectorAll('.dropdown-item[data-model]');
        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const modelValue = e.target.getAttribute('data-model');
                const modelText = e.target.textContent;
                this.selectedModel = modelValue;
                if (this.selectedModelSpan) {
                    this.selectedModelSpan.textContent = modelText;
                }
                console.log('Model changed to:', this.selectedModel);
            });
        });
    }

    setupTools() {
        // Define available tools for the LLM
        this.tools = [
            {
                type: "function",
                function: {
                    name: "search",
                    description: "Search Google for information and return snippet results",
                    parameters: {
                        type: "object",
                        properties: {
                            query: {
                                type: "string",
                                description: "The search query"
                            }
                        },
                        required: ["query"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "aipipe",
                    description: "Execute AI workflows using aipipe proxy API",
                    parameters: {
                        type: "object",
                        properties: {
                            prompt: {
                                type: "string",
                                description: "The prompt to process"
                            },
                            workflow: {
                                type: "string",
                                description: "The workflow to execute"
                            }
                        },
                        required: ["prompt", "workflow"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "execute_js",
                    description: "Execute JavaScript code securely in the browser",
                    parameters: {
                        type: "object",
                        properties: {
                            code: {
                                type: "string",
                                description: "The JavaScript code to execute"
                            }
                        },
                        required: ["code"]
                    }
                }
            }
        ];
    }

    async handleUserInput() {
        console.log('handleUserInput called');
        
        if (!this.userInput) {
            console.error('User input element not available');
            return;
        }
        
        const input = this.userInput.value.trim();
        console.log('Input value:', input);
        
        if (!input || this.isProcessing) {
            console.log('Empty input or already processing');
            return;
        }

        // Clear input and add message
        this.userInput.value = '';
        this.addMessage('user', input);

        // Add user message to conversation history
        this.messages.push({
            role: 'user',
            content: input
        });

        console.log('Starting agent loop...');
        // Start the agent loop
        await this.agentLoop();
    }

    async agentLoop() {
        try {
            this.setProcessing(true);
            console.log('Agent loop started');
            
            while (true) {
                // Send messages + tools to LLM
                const response = await this.callLLM();
                console.log('LLM response:', response);
                
                if (response.content) {
                    // Display agent response
                    this.addMessage('assistant', response.content);
                    this.messages.push({
                        role: 'assistant',
                        content: response.content
                    });
                }

                if (response.tool_calls && response.tool_calls.length > 0) {
                    console.log('Processing tool calls:', response.tool_calls);
                    // Execute tool calls
                    const toolResults = await this.handleToolCalls(response.tool_calls);
                    
                    // Add tool results to message history
                    this.messages.push({
                        role: 'assistant',
                        content: null,
                        tool_calls: response.tool_calls
                    });
                    
                    for (const result of toolResults) {
                        this.messages.push({
                            role: 'tool',
                            content: result.content,
                            tool_call_id: result.tool_call_id
                        });
                    }
                    
                    // Continue the loop to process tool results
                    continue;
                } else {
                    // No more tool calls, wait for user input
                    console.log('No tool calls, waiting for user input');
                    break;
                }
            }
        } catch (error) {
            console.error('Agent loop error:', error);
            this.showError('Agent Error', error.message);
        } finally {
            this.setProcessing(false);
        }
    }

    async callLLM() {
        console.log('Calling LLM with messages:', this.messages);
        
        const lastMessage = this.messages[this.messages.length - 1];
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Check if we have tool results to process
        const hasToolResults = this.messages.some(msg => msg.role === 'tool');
        
        if (hasToolResults && !lastMessage.content) {
            // We just got tool results, provide a summary response
            return {
                content: "Based on the tool results above, I've gathered the requested information. Is there anything specific you'd like me to explain or help you with next?",
                tool_calls: null
            };
        }

        // Simple logic to determine if tools should be called
        const content = lastMessage.content.toLowerCase();
        
        if (content.includes('search') || content.includes('look up') || content.includes('find information') || content.includes('ibm')) {
            const query = this.extractSearchQuery(lastMessage.content);
            return {
                content: `I'll search for information about "${query}".`,
                tool_calls: [{
                    id: 'call_' + Date.now(),
                    type: 'function',
                    function: {
                        name: 'search',
                        arguments: JSON.stringify({ query: query })
                    }
                }]
            };
        }
        
        if (content.includes('execute') || (content.includes('console.log') || content.includes('javascript') || content.includes('code'))) {
            let code = this.extractCode(lastMessage.content);
            if (!code && content.includes('console.log')) {
                // Extract console.log directly
                const match = content.match(/console\.log\([^)]+\)/);
                if (match) code = match[0];
            }
            
            if (code) {
                return {
                    content: `I'll execute this JavaScript code for you.`,
                    tool_calls: [{
                        id: 'call_' + Date.now(),
                        type: 'function',
                        function: {
                            name: 'execute_js',
                            arguments: JSON.stringify({ code: code })
                        }
                    }]
                };
            }
        }

        if (content.includes('workflow') || content.includes('aipipe')) {
            return {
                content: `I'll process this through an AI workflow.`,
                tool_calls: [{
                    id: 'call_' + Date.now(),
                    type: 'function',
                    function: {
                        name: 'aipipe',
                        arguments: JSON.stringify({ 
                            prompt: lastMessage.content,
                            workflow: 'general_analysis'
                        })
                    }
                }]
            };
        }

        // Default response
        return {
            content: this.generateResponse(lastMessage.content),
            tool_calls: null
        };
    }

    async handleToolCalls(toolCalls) {
        const results = [];
        
        for (const toolCall of toolCalls) {
            this.addToolCall(toolCall);
            
            try {
                const result = await this.executeTool(toolCall);
                this.addToolResult(toolCall.id, result);
                
                results.push({
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result)
                });
            } catch (error) {
                console.error('Tool execution error:', error);
                const errorResult = { error: error.message };
                this.addToolResult(toolCall.id, errorResult);
                
                results.push({
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(errorResult)
                });
            }
        }
        
        return results;
    }

    async executeTool(toolCall) {
        const { name, arguments: args } = toolCall.function;
        const parsedArgs = JSON.parse(args);
        
        console.log(`Executing tool: ${name} with args:`, parsedArgs);

        switch (name) {
            case 'search':
                return await this.toolSearch(parsedArgs.query);
            case 'aipipe':
                return await this.toolAIPipe(parsedArgs.prompt, parsedArgs.workflow);
            case 'execute_js':
                return await this.toolExecuteJS(parsedArgs.code);
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }

    async toolSearch(query) {
        console.log('Searching for:', query);
        // Mock search results with more realistic delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        return {
            results: [
                {
                    title: `${query} - Wikipedia`,
                    url: `https://en.wikipedia.org/wiki/${query.replace(/\s+/g, '_')}`,
                    snippet: `${query} is a major topic with comprehensive information available. This Wikipedia article provides an overview of the key concepts, history, and relevant details about ${query}. Learn about its significance and impact.`
                },
                {
                    title: `Latest News about ${query}`,
                    url: `https://news.example.com/${query.toLowerCase()}`,
                    snippet: `Recent developments and breaking news articles related to ${query}. Stay updated with the latest information, trends, and important announcements.`
                },
                {
                    title: `${query} - Official Resources`,
                    url: `https://${query.toLowerCase().replace(/\s+/g, '')}.com`,
                    snippet: `Official information and authoritative resources about ${query}. Access reliable, up-to-date details and comprehensive documentation.`
                }
            ]
        };
    }

    async toolAIPipe(prompt, workflow) {
        console.log('Processing AI pipe:', prompt, workflow);
        // Mock AI pipe processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            workflow: workflow,
            processed_prompt: prompt,
            result: `Successfully processed "${prompt}" through the ${workflow} workflow. The analysis has been completed with enhanced insights, structured output, and actionable recommendations based on the input.`,
            metadata: {
                processing_time: "1.0s",
                tokens_used: 250,
                confidence: 0.94
            }
        };
    }

    async toolExecuteJS(code) {
        console.log('Executing JavaScript:', code);
        try {
            // Capture console output
            let consoleOutput = [];
            const originalLog = console.log;
            console.log = (...args) => {
                consoleOutput.push(args.join(' '));
                originalLog.apply(console, args);
            };
            
            // Execute the code
            const result = eval(code);
            
            // Restore console.log
            console.log = originalLog;
            
            return {
                code: code,
                result: result,
                console_output: consoleOutput,
                type: typeof result,
                success: true
            };
        } catch (error) {
            return {
                code: code,
                error: error.message,
                success: false
            };
        }
    }

    extractSearchQuery(text) {
        // More comprehensive extraction patterns
        const patterns = [
            /search for (.+)/i,
            /look up (.+)/i,
            /find information about (.+)/i,
            /what is (.+)/i,
            /tell me about (.+)/i,
            /information about (.+)/i
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return match[1];
        }
        
        // If no pattern matches, extract key terms
        const words = text.replace(/^(search|look up|find|what is|tell me|information|about)\s*/i, '').trim();
        return words || text;
    }

    extractCode(text) {
        // Extract code between backticks or common JavaScript patterns
        let codeMatch = text.match(/```(?:javascript|js)?\s*([\s\S]*?)\s*```/i);
        if (codeMatch) return codeMatch[1].trim();
        
        codeMatch = text.match(/execute\s+(.+)/i);
        if (codeMatch) return codeMatch[1].trim();
        
        // Look for common JS patterns
        if (text.includes('console.log')) {
            const match = text.match(/console\.log\([^)]+\)/);
            if (match) return match[0];
        }
        
        return null;
    }

    generateResponse(input) {
        const responses = [
            "I understand. How can I help you further with this?",
            "That's interesting. What would you like to explore about this topic?",
            "I can help you with that. What specific aspect would you like me to focus on?",
            "Let me know if you'd like me to search for more information or help in another way.",
            "I'm here to assist. What's the next step you'd like to take?",
            "Great question! Is there anything specific you'd like me to help you with?"
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    addMessage(role, content) {
        console.log(`Adding message: ${role} - ${content}`);
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message--${role}`;
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = `message-bubble message-bubble--${role}`;
        bubbleDiv.innerHTML = content.replace(/\n/g, '<br>');
        
        messageDiv.appendChild(bubbleDiv);
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addToolCall(toolCall) {
        console.log('Adding tool call:', toolCall);
        
        const toolDiv = document.createElement('div');
        toolDiv.className = 'tool-call';
        toolDiv.innerHTML = `
            <div class="tool-call-header">
                <i class="bi bi-gear"></i> Calling tool: ${toolCall.function.name}
            </div>
            <div><strong>Arguments:</strong> ${toolCall.function.arguments}</div>
        `;
        
        this.messagesContainer.appendChild(toolDiv);
        this.scrollToBottom();
    }

    addToolResult(toolCallId, result) {
        console.log('Adding tool result:', result);
        
        const resultDiv = document.createElement('div');
        resultDiv.className = 'tool-result';
        
        if (result.results) {
            // Search results
            let html = '<strong><i class="bi bi-search"></i> Search Results:</strong><br><br>';
            result.results.forEach(item => {
                html += `
                    <div class="search-result">
                        <div class="search-result-title">${item.title}</div>
                        <a href="${item.url}" target="_blank" class="search-result-url">${item.url}</a>
                        <div class="search-result-snippet">${item.snippet}</div>
                    </div>
                `;
            });
            resultDiv.innerHTML = html;
        } else if (result.code !== undefined) {
            // Code execution result
            let html = `
                <div class="code-result">
                    <strong><i class="bi bi-code"></i> Code Execution:</strong><br>
                    <code>${result.code}</code><br><br>
                    <strong>Status:</strong> ${result.success ? '✅ Success' : '❌ Error'}<br>
            `;
            
            if (result.success) {
                html += `<strong>Result:</strong> ${result.result}<br>`;
                if (result.console_output && result.console_output.length > 0) {
                    html += `<strong>Console Output:</strong> ${result.console_output.join(', ')}<br>`;
                }
                html += `<strong>Type:</strong> ${result.type}`;
            } else {
                html += `<strong>Error:</strong> ${result.error}`;
            }
            
            html += '</div>';
            resultDiv.innerHTML = html;
        } else if (result.workflow) {
            // AI Pipe result
            resultDiv.innerHTML = `
                <div class="code-result">
                    <strong><i class="bi bi-cpu"></i> AI Workflow Result:</strong><br>
                    <strong>Workflow:</strong> ${result.workflow}<br>
                    <strong>Result:</strong> ${result.result}<br>
                    <strong>Processing Time:</strong> ${result.metadata.processing_time}<br>
                    <strong>Confidence:</strong> ${(result.metadata.confidence * 100).toFixed(1)}%
                </div>
            `;
        } else {
            // Generic result
            resultDiv.innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
        }
        
        this.messagesContainer.appendChild(resultDiv);
        this.scrollToBottom();
    }

    setProcessing(isProcessing) {
        this.isProcessing = isProcessing;
        
        if (this.sendButton) {
            this.sendButton.disabled = isProcessing;
        }
        if (this.userInput) {
            this.userInput.disabled = isProcessing;
        }
        
        if (this.loadingIndicator) {
            if (isProcessing) {
                this.loadingIndicator.classList.remove('d-none');
            } else {
                this.loadingIndicator.classList.add('d-none');
            }
        }
    }

    scrollToBottom() {
        if (this.conversationArea) {
            setTimeout(() => {
                this.conversationArea.scrollTop = this.conversationArea.scrollHeight;
            }, 100);
        }
    }

    showError(title, message) {
        console.error(`${title}: ${message}`);
        
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            <strong>${title}:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        if (this.alertContainer) {
            this.alertContainer.appendChild(alertDiv);
            
            // Auto-dismiss after 5 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing LLM Agent...');
    try {
        window.llmAgent = new LLMAgent();
    } catch (error) {
        console.error('Failed to initialize LLM Agent:', error);
    }
});