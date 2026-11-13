import { useEffect, useState } from 'react';
import { ShieldCheck, CircleCheck, CircleX, Hourglass } from 'lucide-react';
import Kpi from '../components/ui/Kpi';
import PeriodPicker from '../components/ui/PeriodPicker';
import CompanySelect from '../components/ui/CompanySelect';
import ProportionBars from '../components/ui/ProportionBars';
import StackedBarChart, { ChartLegend } from '../components/ui/StackedBarChart';
import CheckOutcomes from './insights/CheckOutcomes';
import TurnaroundSection from './insights/TurnaroundSection';
import ServiceHealthSection from './insights/ServiceHealthSection';
import { useAuth } from '../contexts/AuthContext';
import statsService from '../services/statsService';
import { errorMessage } from '../services/api';
import { isSuperAdmin } from '../utils/roles';
import { TYPE_LABEL } from '../utils/verification';
import { VOLUME_SERIES, changeBetween, countryName, formatCount, formatPercent, pointsBetween, shortDate, withOther } from '../utils/insights';
import './insights/insights.css';

const TYPE_COLORS = ['var(--brand-green)', 'var(--brand-bright)', 'var(--amber-ink)', 'var(--rule)'];

export default function Analytics() {
    const { user } = useAuth();
    const superAdmin = isSuperAdmin(user);
    const [days, setDays] = useState(30);
    const [companyId, setCompanyId] = useState('');
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        setError('');
        statsService.verifications({ companyId, days })
            .then(setStats)
            .catch((e) => setError(errorMessage(e, 'Could not load analytics.')));
    }, [companyId, days]);

    // Opened from the overview's system status link
    useEffect(() => {
        if (stats && window.location.hash === '#health') document.getElementById('health')?.scrollIntoView({ behavior: 'smooth' });
    }, [stats]);

    const current = stats?.current;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Analytics</h1>
                    <p>How verifications are trending over the last {days} days.</p>
                </div>
                <div className="head-actions">
                    {superAdmin && <CompanySelect value={companyId} onChange={setCompanyId} />}
                    <PeriodPicker value={days} onChange={setDays} />
                </div>
            </div>

            {error ? <div className="card"><div className="empty-state">{error}</div></div> : !stats ? (
                <div className="card"><div className="loading-state">Loading analytics…</div></div>
            ) : (
                <>
                    <div className="kpi-grid">
                        <Kpi label="Verifications" icon={ShieldCheck} value={formatCount(current.total)}
                             change={changeBetween(current.total, stats.previous.total)} caption={`vs previous ${days} days`} />
                        <Kpi label="Approved" icon={CircleCheck} value={formatCount(current.approved)}
                             change={changeBetween(current.approved, stats.previous.approved)} caption={`vs previous ${days} days`} />
                        <Kpi label="Rejected" icon={CircleX} value={formatCount(current.rejected)} good="down"
                             change={changeBetween(current.rejected, stats.previous.rejected)} caption={`vs previous ${days} days`} />
                        <Kpi label="Pass rate" icon={Hourglass} value={formatPercent(current.passRate)}
                             change={pointsBetween(current.passRate, stats.previous.passRate)} caption="of decided verifications" />
                    </div>

                    <div className="card">
                        <div className="card-head ov-chart-head">
                            <div><h3>Verification trends</h3><div className="card-caption">Submitted per day, by where they are now</div></div>
                            <ChartLegend series={VOLUME_SERIES} />
                        </div>
                        {current.total === 0 ? <div className="empty-state">No verifications in this period.</div> : (
                            <StackedBarChart data={withOther(stats.daily)} series={VOLUME_SERIES} labelKey="date" formatLabel={shortDate} height={240} />
                        )}
                    </div>

                    <div className="ins-grid-2">
                        <div className="card">
                            <div className="card-head"><div><h3>By type</h3><div className="card-caption">{formatCount(current.total)} verifications</div></div></div>
                            {stats.byType.length === 0 ? <div className="empty-state">Nothing yet.</div> : (
                                <ProportionBars rows={stats.byType.map((t, i) => ({
                                    label: TYPE_LABEL[t.label] ? `${TYPE_LABEL[t.label]} · ${t.label}` : t.label,
                                    display: `${formatCount(t.count)} · ${formatPercent((100 * t.count) / current.total, 0)}`,
                                    pct: (100 * t.count) / current.total,
                                    color: TYPE_COLORS[i % TYPE_COLORS.length],
                                }))} />
                            )}
                        </div>

                        <div className="card">
                            <div className="card-head"><div><h3>By country</h3><div className="card-caption">Country of residence, else nationality · top 8</div></div></div>
                            {stats.byCountry.length === 0 ? <div className="empty-state">Nothing yet.</div> : (
                                <table className="mini-table">
                                    <thead><tr><th>Country</th><th className="num">Total</th><th className="num">Pass rate</th><th /></tr></thead>
                                    <tbody>
                                        {stats.byCountry.map((c) => {
                                            const decided = c.approved + c.rejected;
                                            return (
                                                <tr key={c.country}>
                                                    <td>{countryName(c.country)}</td>
                                                    <td className="num">{formatCount(c.total)}</td>
                                                    <td className="num">{decided ? formatPercent((100 * c.approved) / decided, 0) : '—'}</td>
                                                    <td style={{ width: '34%', paddingLeft: 16 }}>
                                                        <div className="split-bar" title={`${c.approved} approved · ${c.rejected} rejected`}>
                                                            <span style={{ flexGrow: c.approved, background: 'var(--brand-green)' }} />
                                                            <span style={{ flexGrow: c.rejected, background: 'var(--danger-dot)' }} />
                                                            <span style={{ flexGrow: c.total - decided, background: 'var(--rule)' }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    <CheckOutcomes checks={stats.checks} />

                    {superAdmin && <TurnaroundSection companyId={companyId} days={days} />}
                    {superAdmin && <ServiceHealthSection />}
                </>
            )}
        </div>
    );
}
