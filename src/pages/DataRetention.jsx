import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CompanySelect from '../components/ui/CompanySelect';
import RetentionSettings from '../components/privacy/RetentionSettings';
import { isSuperAdmin } from '../utils/roles';

// How long applicants' data is kept, and every erasure. Super admins edit the platform rule, or a company's own.
export default function DataRetention() {
    const { user } = useAuth();
    const superAdmin = isSuperAdmin(user);
    const [companyId, setCompanyId] = useState('');
    const scope = superAdmin ? companyId || undefined : user.companyId;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Data retention</h1>
                    <p>How long applicants’ documents and personal details are kept after their verification finishes, and a record of everything erased.</p>
                </div>
                {superAdmin && (
                    <div className="head-actions">
                        <CompanySelect value={companyId} onChange={setCompanyId} allLabel="Platform rule" />
                    </div>
                )}
            </div>
            <div className="note note--warn" style={{ marginBottom: 16 }}>
                <div className="note-head"><ShieldAlert size={16} /><span>Erased data can’t be recovered</span></div>
                <p>Under the Data Protection Act, keep personal data only as long as you need it. Set the periods your contracts and regulator require. To erase one applicant now, open their verification and choose Erase personal data.</p>
            </div>
            <RetentionSettings key={scope || 'platform'} companyId={scope} />
        </div>
    );
}
