import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import EmptyState from './EmptyState';
import Skeleton from './Skeleton';
import './DataTable.css';

export default function DataTable({
    columns = [],
    data = [],
    loading = false,
    emptyState,
    pageSize = 10,
    pagination = true,
    sortable = true,
    onRowClick
}) {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);

    // Sorting
    const sortedData = [...data].sort((a, b) => {
        if (!sortConfig.key) return 0;

        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination
    const totalPages = Math.ceil(sortedData.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = pagination
        ? sortedData.slice(startIndex, startIndex + pageSize)
        : sortedData;

    const handleSort = (key) => {
        if (!sortable) return;

        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    if (loading) {
        return (
            <div className="data-table-container">
                <div className="data-table-skeleton">
                    <Skeleton height="40px" count={1} />
                    <Skeleton height="60px" count={pageSize} />
                </div>
            </div>
        );
    }

    if (data.length === 0 && emptyState) {
        return emptyState;
    }

    return (
        <div className="data-table-container">
            <div className="data-table-wrapper">
                <table className="data-table">
                    <thead className="data-table-head">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`data-table-header ${sortable && column.sortable !== false ? 'data-table-header--sortable' : ''}`}
                                    onClick={() => column.sortable !== false && handleSort(column.key)}
                                    style={{ width: column.width }}
                                >
                                    <div className="data-table-header-content">
                                        <span>{column.label}</span>
                                        {sortable && column.sortable !== false && sortConfig.key === column.key && (
                                            sortConfig.direction === 'asc'
                                                ? <ChevronUp size={16} />
                                                : <ChevronDown size={16} />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="data-table-body">
                        {paginatedData.map((row, rowIndex) => (
                            <tr
                                key={row.id || rowIndex}
                                className={`data-table-row ${onRowClick ? 'data-table-row--clickable' : ''}`}
                                onClick={() => onRowClick && onRowClick(row)}
                            >
                                {columns.map((column) => (
                                    <td key={column.key} className="data-table-cell">
                                        {column.render
                                            ? column.render(row[column.key], row)
                                            : row[column.key]
                                        }
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {pagination && totalPages > 1 && (
                <div className="data-table-pagination">
                    <div className="pagination-info">
                        Showing {startIndex + 1}-{Math.min(startIndex + pageSize, data.length)} of {data.length}
                    </div>
                    <div className="pagination-controls">
                        <button
                            className="pagination-btn"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="pagination-current">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            className="pagination-btn"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
