import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CompanySelect from '../components/ui/CompanySelect';
import OwnerCheckSettings from '../components/kyb/OwnerCheckSettings';
import { isSuperAdmin } from '../utils/roles';

// Who is checked behind a business, and how. Super admins edit the platform default, or a company's own rules.
export default function KybSettings() {
    const { user } = useAuth();
    const superAdmin = isSuperAdmin(user);
    const [companyId, setCompanyId] = useState('');
    const scope = superAdmin ? companyId || undefined : user.companyId;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>KYB settings</h1>
                    <p>Which directors and owners are checked when a business is verified, and how. A workflow’s “Directors and owners” step can set its own rules on top of these.</p>
                </div>
                {superAdmin && (
                    <div className="head-actions">
                        <CompanySelect value={companyId} onChange={setCompanyId} allLabel="Platform default" />
                    </div>
                )}
            </div>
            <OwnerCheckSettings key={scope || 'platform'} companyId={scope} />
        </div>
    );
}
