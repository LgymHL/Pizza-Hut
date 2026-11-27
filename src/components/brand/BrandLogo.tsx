import { useState } from 'react'
import { Pizza } from 'lucide-react'

/**
 * Logo da Pizza Hut.
 * Coloque o arquivo oficial em `public/pizza-hut-logo.png`.
 * Enquanto ele não existir, aparece um selo vermelho com ícone de pizza.
 */
export default function BrandLogo({ className = 'h-10 w-auto' }: { className?: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-hut-red text-white">
        <Pizza size={23} strokeWidth={1.7} />
      </div>
    )
  }

  return (
    <img
      src={`${import.meta.env.BASE_URL}pizza-hut-logo.png`}
      alt="Pizza Hut"
      className={`${className} shrink-0 object-contain`}
      onError={() => setFailed(true)}
    />
  )
}
