import { useAppStore } from '../../state/useAppStore'
import './view-controls.css'

export function DensityToggle() {
  const cardDensity = useAppStore((s) => s.cardDensity)
  const setCardDensity = useAppStore((s) => s.setCardDensity)

  return (
    <div className="density-toggle">
      <button
        type="button"
        className={cardDensity === 'normal' ? 'active' : ''}
        onClick={() => setCardDensity('normal')}
      >
        Normal
      </button>
      <button
        type="button"
        className={cardDensity === 'compact' ? 'active' : ''}
        onClick={() => setCardDensity('compact')}
      >
        Compact
      </button>
    </div>
  )
}
