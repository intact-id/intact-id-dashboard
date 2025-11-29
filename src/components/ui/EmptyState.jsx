import './EmptyState.css';

export default function EmptyState({
    icon: Icon,
    title,
    description,
    action
}) {
    return (
        <div className="empty-state">
            {Icon && (
                <div className="empty-state-icon">
                    <Icon size={48} />
                </div>
            )}
            <h3 className="empty-state-title">{title}</h3>
            {description && (
                <p className="empty-state-description">{description}</p>
            )}
            {action && (
                <div className="empty-state-action">
                    {action}
                </div>
            )}
        </div>
    );
}
