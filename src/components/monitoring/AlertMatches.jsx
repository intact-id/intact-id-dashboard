// The watchlist entries an alert is about, with the topics they carry (new ones highlighted)
export default function AlertMatches({ matches }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {matches.map((m) => (
                <div key={m.entityId}>
                    <span className="name-primary">{m.caption}</span>
                    <span className="name-secondary"> · score {Number(m.score).toFixed(2)} · {(m.datasets || []).join(', ')}</span>
                    <div className="name-secondary">
                        {(m.topics || []).map((t) => (
                            <span key={t} className="mono" style={{ marginRight: 6, fontWeight: (m.newTopics || []).includes(t) ? 700 : 400 }}>
                                {t}{(m.newTopics || []).includes(t) ? ' (new)' : ''}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
