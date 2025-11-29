import { useState } from 'react';
import './Tabs.css';

export default function Tabs({ tabs, defaultTab = 0, onChange }) {
    const [activeTab, setActiveTab] = useState(defaultTab);

    const handleTabChange = (index) => {
        setActiveTab(index);
        if (onChange) {
            onChange(index);
        }
    };

    return (
        <div className="tabs-container">
            <div className="tabs-header">
                {tabs.map((tab, index) => (
                    <button
                        key={index}
                        className={`tab ${activeTab === index ? 'tab--active' : ''}`}
                        onClick={() => handleTabChange(index)}
                    >
                        {tab.icon && <tab.icon size={18} />}
                        <span>{tab.label}</span>
                        {tab.badge && (
                            <span className="tab-badge">{tab.badge}</span>
                        )}
                    </button>
                ))}
            </div>
            <div className="tabs-content">
                {tabs[activeTab]?.content}
            </div>
        </div>
    );
}
