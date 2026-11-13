import { useEffect, useState } from 'react';
import companyService from '../../services/companyService';

// Super admins pick which company a page shows. allLabel: the empty choice ("All companies"); omit to require one.
export default function CompanySelect({ value, onChange, allLabel = 'All companies', placeholder = 'Choose a company' }) {
    const [companies, setCompanies] = useState([]);

    useEffect(() => {
        companyService.list({ size: 100 }).then((page) => setCompanies(page.content || [])).catch(() => setCompanies([]));
    }, []);

    return (
        <select className="input filter-select" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Company">
            <option value="">{allLabel || placeholder}</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.tradingName || c.legalName}</option>)}
        </select>
    );
}
