import React from 'react';

const Pagination = ({ currentPage, totalPages, handlePrevPage, handleNextPage }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-end mt-4 mb-8 space-x-2 mr-4">
      <button 
        onClick={handlePrevPage} 
        disabled={currentPage === 1}
        className={`px-4 py-2 font-medium rounded transition-colors ${
          currentPage === 1 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-gray-100 text-gray-800 hover:bg-gray-200 cursor-pointer'
        }`}
      >
        &laquo; Previous
      </button>
      <button 
        onClick={handleNextPage} 
        disabled={currentPage === totalPages}
        className={`px-4 py-2 font-medium rounded transition-colors ${
          currentPage === totalPages 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-[#0FA968] text-white hover:bg-[#0c8753] cursor-pointer'
        }`}
      >
        Next &raquo;
      </button>
    </div>
  );
};

export default Pagination;
