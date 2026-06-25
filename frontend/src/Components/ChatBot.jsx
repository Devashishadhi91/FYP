import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, AlertCircle, Loader } from 'lucide-react';
import axiosInstance from '../lib/axios';

const ChatBot = ({ hideHeader = false }) => {
  // State management for chat history, user input, loading status, and errors
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Refs for auto-scrolling to the latest message and keeping focus on the input box
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scrolls when new messages are added to the chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Sends the entire conversation history to backend proxy
  const callGroqAPI = async (conversationHistory) => {
    try {
      setError('');

      const response = await axiosInstance.post('/chatbot', {
        messages: conversationHistory
      });

      // Extract the AI's response text from the payload
      return response.data.choices[0].message.content;
    } catch (err) {
      if (err.response) {
        throw new Error(err.response.data?.message || `API Error: ${err.response.status}`);
      }
      throw new Error('Failed to connect to the server');
    }
  };

  // Handles the user hitting the "Send" button or pressing Enter
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Append the new user message to the local chat state
    const userMessage = { role: 'user', content: inputValue };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // Send the updated history to the AI and wait for its reply
      const assistantReply = await callGroqAPI(updatedMessages);

      // Append the AI's reply to the chat
      setMessages([...updatedMessages, { role: 'assistant', content: assistantReply }]);
    } catch (err) {
      setError(err.message || 'Failed to get response. Please try again.');
      // Revert the message state so the user doesn't lose context on failure
      setMessages(messages);
    } finally {
      setIsLoading(false);
      // Ensure the user can keep typing immediately after a response
      inputRef.current?.focus();
    }
  };

  // Clears the current chat session if the user confirms
  const handleClearChat = () => {
    if (messages.length > 0 && window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
      setError('');
      inputRef.current?.focus();
    }
  };


  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      {!hideHeader && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg p-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">💬</span>
              </div>
              Inventory Assistant
            </h1>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to your AI assistant</h2>
              <p className="text-gray-600">
                Start a conversation below. Your messages and history are kept in memory.
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl px-4 py-3 rounded-lg shadow-sm ${msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                }`}
            >
              <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="mb-4 flex justify-start">
            <div className="bg-white text-gray-800 px-4 py-3 rounded-lg rounded-bl-none border border-gray-200 flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 flex justify-center">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 max-w-2xl">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-2 mb-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </form>

          {/* Action Buttons */}
          <div className="flex justify-between items-center text-sm">
            <p className="text-gray-600">
              {messages.length > 0 && `${messages.length} messages in conversation`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleClearChat}
                disabled={messages.length === 0}
                className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs font-medium"
              >
                <Trash2 className="w-3 h-3" />
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
