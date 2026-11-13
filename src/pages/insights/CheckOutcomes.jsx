import { formatCount, formatPercent } from '../../utils/insights';
import { stepLabel } from '../../utils/verification';

// How each kind of check came out: passed, sent to review, or failed (including checks that could not run).
export default function CheckOutcomes({ checks }) {
    return (
        <div className="card">
            <div className="card-head"><div><h3>Checks</h3><div className="card-caption">Share of each check that passed</div></div></div>
            {checks.length === 0 ? <div className="empty-state">No checks have run in this period.</div> : (
                <div className="check-list">
                    {checks.map((c) => (
                        <div key={c.step} className="check-row">
                            <div className="check-row-head">
                                <span>{stepLabel(c.step)}</span>
                                <strong>{formatPercent(c.total ? (100 * c.passed) / c.total : 0, 0)}</strong>
                            </div>
                            <div className="check-bar">
                                <span style={{ flexGrow: c.passed, background: 'var(--brand-green)' }} />
                                <span style={{ flexGrow: c.review, background: 'var(--amber-ink)' }} />
                                <span style={{ flexGrow: c.failed, background: 'var(--danger-dot)' }} />
                            </div>
                            <div className="check-row-foot">{formatCount(c.total)} run · {formatCount(c.review)} to review · {formatCount(c.failed)} failed</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
