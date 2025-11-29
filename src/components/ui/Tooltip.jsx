import { useState } from 'react';
import './Tooltip.css';

export default function Tooltip({
    children,
    content,
    position = 'top'
}) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className="tooltip-wrapper"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && content && (
                <div className={`tooltip tooltip--${position}`}>
                    {content}
                </div>
            )}
        </div>
    );
}
