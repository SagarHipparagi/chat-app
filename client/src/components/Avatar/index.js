import React from 'react'

const COLORS = [
    ['#6366f1', '#818cf8'], // indigo
    ['#ec4899', '#f472b6'], // pink
    ['#14b8a6', '#2dd4bf'], // teal
    ['#f59e0b', '#fbbf24'], // amber
    ['#8b5cf6', '#a78bfa'], // violet
    ['#ef4444', '#f87171'], // red
    ['#10b981', '#34d399'], // emerald
    ['#3b82f6', '#60a5fa'], // blue
    ['#f97316', '#fb923c'], // orange
    ['#06b6d4', '#22d3ee'], // cyan
]

const getColorFromName = (name = '') => {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return COLORS[Math.abs(hash) % COLORS.length]
}

const getInitials = (name = '') => {
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?'
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const Avatar = ({
    name = '',
    size = 60,
    className = '',
}) => {
    const [bg, text] = getColorFromName(name)
    const initials = getInitials(name)
    const fontSize = Math.round(size * 0.38)

    return (
        <div
            className={`rounded-full flex items-center justify-center font-bold select-none flex-shrink-0 border-2 ${className}`}
            style={{
                width: size,
                height: size,
                background: `linear-gradient(135deg, ${bg}, ${text})`,
                fontSize,
                color: '#fff',
                borderColor: text,
                boxShadow: `0 2px 8px ${bg}55`
            }}
            title={name}
        >
            {initials}
        </div>
    )
}

export default Avatar
