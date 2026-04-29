'use client'

import { useState } from 'react'
import BottomNav from './BottomNav'
import MoreSheet from './MoreSheet'

export default function BottomNavWrapper() {
  const [moreOpen, setMoreOpen] = useState(false)
  return (
    <>
      <BottomNav onMoreOpen={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}
