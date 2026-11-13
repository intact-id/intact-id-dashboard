import {
    IdCard, ListChecks, ScanFace, Calendar, Landmark, House, ShieldAlert, Building2, Gauge, Puzzle,
} from 'lucide-react';

// Catalog services carry an icon hint in ui.icon; map the ones the catalog uses today.
const SERVICE_ICONS = {
    'id-card': IdCard,
    'list-check': ListChecks,
    'face-scan': ScanFace,
    faces: ScanFace,
    calendar: Calendar,
    landmark: Landmark,
    home: House,
    'shield-search': ShieldAlert,
    building: Building2,
    gauge: Gauge,
};

// Icon names the catalog editor offers, in the order shown.
export const SERVICE_ICON_NAMES = Object.keys(SERVICE_ICONS);

export const serviceIcon = (service) => SERVICE_ICONS[service?.ui?.icon] || Puzzle;

export const CATEGORY_LABELS = {
    VERIFICATION: 'Identity',
    DOCUMENT: 'Documents',
    REGISTRY: 'Registries',
    SCREENING: 'Screening',
    RISK: 'Risk',
};
