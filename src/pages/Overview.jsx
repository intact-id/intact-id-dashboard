import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, ShieldCheck, CircleCheck, Hourglass, Timer, CircleX } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Kpi from '../components/ui/Kpi';
import PeriodPicker from '../components/ui/PeriodPicker';
import CompanySelect from '../components/ui/CompanySelect';
import StackedBarChart, { ChartLegend } from '../components/ui/StackedBarChart';
import SystemStatusCard from './insights/SystemStatusCard';
import CheckOutcomes from './insights/CheckOutcomes';
import { useAuth } from '../contexts/AuthContext';
import statsService from '../services/statsService';
import verificationService from '../services/verificationService';
import { errorMessage } from '../services/api';
import { isSuperAdmin } from '../utils/roles';
import { formatDateTime, initialsOf } from '../utils/format';
import { TYPE_LABEL, applicantName, decisionOf, statusOf } from '../utils/verification';
import { VOLUME_SERIES, changeBetween, formatCount, formatPercent, formatSeconds, pointsBetween, shortDate, withOther } from '../utils/insights';
import './insights/insights.css';

// Every submitted verification is in exactly one of these when the stats are read.
const OUTCOMES = [
    ['approved', 'Approved', 'var(--brand-green)'],
    ['rejected', 'Rejected', 'var(--danger-dot)'],
    ['inReview', 'In review', 'var(--amber-ink)'],
    ['inProgress', 'Processing or held', 'var(--info)'],
    ['failed', 'Failed to run', 'var(--ink-3)'],
];

function greeting() {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Overview() {
    const { user } = useAuth();
    const superAdmin = isSuperAdmin(user);
    const [days, setDays] = useState(30);
    const [companyId, setCompanyId] = useState('');
    const [stats, setStats] = useState(null);
    const [turnaround, setTurnaround] = useState(null);
    const [recent, setRecent] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        setError('');
        statsService.verifications({ companyId, days })
            .then(setStats)
            .catch((e) => setError(errorMessage(e, 'Could not load the overview.')));
        if (superAdmin) statsService.turnaround({ companyId, days }).then(setTurnaround).catch(() => setTurnaround(null));
    }, [companyId, days, superAdmin]);

    useEffect(() => {
        verificationService.list({ companyId, page: 0, size: 6 })
            .then((page) => setRecent(page.content || []))
            .catch(() => setRecent([]));
    }, [companyId]);

    const firstName = user?.firstName || user?.username || '';
    const current = stats?.current;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>{greeting()}{firstName ? `, ${firstName}` : ''}</h1>
                    <p>Activity over the last {days} days.</p>
                </div>
                <div className="head-actions">
                    {superAdmin && <CompanySelect value={companyId} onChange={setCompanyId} />}
                    <PeriodPicker value={days} onChange={setDays} />
                </div>
            </div>

            {error ? <div className="card"><div className="empty-state">{error}</div></div> : !stats ? (
                <div className="card"><div className="loading-state">Loading overview…</div></div>
            ) : (
                <>
                    <div className="kpi-grid">
                        <Kpi label="Verifications" icon={ShieldCheck} value={formatCount(current.total)}
                             change={changeBetween(current.total, stats.previous.total)} caption={`vs previous ${days} days`} />
                        <Kpi label="Pass rate" icon={CircleCheck} value={formatPercent(current.passRate)}
                             change={pointsBetween(current.passRate, stats.previous.passRate)}
                             caption={`${formatCount(current.approved)} of ${formatCount(current.approved + current.rejected)} decided`} />
                        <Kpi label="Awaiting review" icon={Hourglass} value={formatCount(current.inReview)}>
                            <Link to="/dashboard/kyc-reviews" className="kpi-link">Open review queue <ArrowRight size={13} /></Link>
                        </Kpi>
                        {superAdmin ? (
                            <Kpi label="Median turnaround" icon={Timer} value={formatSeconds(turnaround?.medianSeconds)}
                                 caption={turnaround ? `p90 ${formatSeconds(turnaround.p90Seconds)} · ${formatCount(turnaround.finished)} finished` : 'Submission to decision'} />
                        ) : (
                            <Kpi label="Rejected" icon={CircleX} value={formatCount(current.rejected)} good="down"
                                 change={changeBetween(current.rejected, stats.previous.rejected)} caption={`vs previous ${days} days`} />
                        )}
                    </div>

                    <div className="ov-grid">
                        <div className="card">
                            <div className="card-head ov-chart-head">
                                <div>
                                    <h3>Verification volume</h3>
                                    <div className="card-caption">Submitted per day, by where they are now</div>
                                </div>
                                <ChartLegend series={VOLUME_SERIES} />
                            </div>
                            {current.total === 0 ? (
                                <div className="empty-state">No verifications in this period.</div>
                            ) : (
                                <StackedBarChart data={withOther(stats.daily)} series={VOLUME_SERIES} labelKey="date" formatLabel={shortDate} height={250} />
                            )}
                        </div>

                        <div className="ov-side">
                            {superAdmin && <SystemStatusCard />}
                            <div className="card">
                                <div className="card-head"><div><h3>Outcomes</h3><div className="card-caption">{formatCount(current.total)} verifications</div></div></div>
                                <div className="outcome-bar">
                                    {OUTCOMES.map(([key, , color]) => current[key] > 0 && (
                                        <span key={key} style={{ flexGrow: current[key], background: color }} />
                                    ))}
                                </div>
                                <div className="outcome-list">
                                    {OUTCOMES.map(([key, label, color]) => (
                                        <div key={key} className="outcome-row">
                                            <i style={{ background: color }} />
                                            <span>{label}</span>
                                            <strong>{formatCount(current[key])}</strong>
                                            <em>{current.total ? formatPercent((100 * current[key]) / current.total, 0) : '—'}</em>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="ov-grid">
                        <div className="table-card">
                            <div className="card-head">
                                <h3>Recent verifications</h3>
                                <Link to="/dashboard/verifications" className="btn btn--ghost btn--sm">View all <ArrowRight size={14} /></Link>
                            </div>
                            <div className="table-scroll"><table className="data-table">
                                <thead><tr><th>Applicant</th><th>Status</th><th>Type</th>{superAdmin && <th>Company</th>}<th>Submitted</th><th /></tr></thead>
                                <tbody>
                                    {!recent ? (
                                        <tr><td colSpan={6}><div className="loading-state">Loading…</div></td></tr>
                                    ) : recent.length === 0 ? (
                                        <tr><td colSpan={6}><div className="empty-state">No verifications yet.</div></td></tr>
                                    ) : recent.map((v) => {
                                        const name = applicantName(v);
                                        const shown = v.overallDecision ? decisionOf(v.overallDecision) : statusOf(v.status);
                                        const link = `/dashboard/verifications/${v.verificationId}`;
                                        return (
                                            <tr key={v.verificationId}>
                                                <td>
                                                    <Link to={link} className="name-cell">
                                                        <span className="avatar avatar--light">{initialsOf(name)}</span>
                                                        <div>
                                                            <div className="name-primary">{name}</div>
                                                            <div className="name-secondary">{v.customerData?.email || v.externalReference || v.verificationId}</div>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td><Badge kind={shown.badge}>{shown.label}</Badge></td>
                                                <td>{TYPE_LABEL[v.verificationType] || v.verificationType || '—'}</td>
                                                {superAdmin && <td>{v.companyName || '—'}</td>}
                                                <td>{formatDateTime(v.createdAt)}</td>
                                                <td><Link to={link} className="row-open-link" aria-label={`Open ${name}`}><ChevronRight size={16} /></Link></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table></div>
                        </div>

                        <CheckOutcomes checks={stats.checks} />
                    </div>
                </>
            )}
        </div>
    );
}
