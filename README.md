# JavaScript LLM Agent

A minimal browser-based LLM agent that implements tool calling and multi-step reasoning loops. Built for maximum hackability and easy extension.

## Features

- **Conversational AI Interface**: Clean browser-based chat interface with real-time message display
- **OpenAI-Style Tool Calling**: Full compatibility with function calling APIs
- **Multi-Model Support**: Works with OpenAI GPT models, Anthropic Claude, and other providers
- **Built-in Tools**:
  - Google Search API integration for web search
  - AI Pipe proxy API for flexible AI workflows
  - JavaScript code execution in the browser
- **Agent Loop**: Implements continuous reasoning until task completion
- **Error Handling**: Graceful error display with Bootstrap alerts

## Quick Start

1. Clone or download the project files
2. Open `index.html` in your web browser
3. Select your preferred LLM model from the dropdown
4. Start chatting! The agent will automatically use tools as needed

## Architecture

The agent implements this core reasoning loop in JavaScript:
if (response.tool_calls) {
    const results = await executeTools(response.tool_calls);
    messages.push(...results);
} else {
    messages.push(await getUserInput());
}
