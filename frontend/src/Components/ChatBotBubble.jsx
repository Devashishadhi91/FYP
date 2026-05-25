import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import ChatBot from './ChatBot';

const ChatBotBubble = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 
        This is the floating action button (FAB) that sits in the bottom right corner of the screen.
        Clicking it toggles the chat window open and closed. 
      */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 z-40 flex items-center justify-center ${isOpen
          ? 'bg-red-500 hover:bg-red-600'
          : 'bg-blue-600 hover:bg-blue-700'
          }`}
        title="Open ChatBot"
      >
        {isOpen ? (
          <X className="w-7 h-7 text-white" />
        ) : (
          <MessageCircle className="w-7 h-7 text-white animate-bounce" />
        )}
      </button>

      {/* 
        This is the actual chat window modal that pops up when the button above is clicked.
        It sits just above the floating button.
      */}
      {isOpen && (
        <>
          {/* A subtle invisible backdrop that closes the chat if the user clicks anywhere outside of it */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />

          {/* The main container for the chat interface */}
          <div className="fixed bottom-28 right-6 w-96 h-[600px] z-40 rounded-2xl overflow-hidden shadow-2xl bg-white flex flex-col">
            {/* The custom header for the chat bubble */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg">Inventory Assistant</h2>
                <p className="text-blue-100 text-xs">Powered by Groq</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-blue-500 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* We reuse the main ChatBot component here, but hide its default header so it fits perfectly in the bubble */}
            <div className="flex-1 overflow-hidden">
              <ChatBot hideHeader={true} />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ChatBotBubble;
