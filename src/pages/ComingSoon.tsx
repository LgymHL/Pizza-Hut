
type ComingSoonProps = {
  title: string
  description: string
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="space-y-6 p-5">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          {description}
        </p>
      </div>

      <section className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-xl border border-gray-200 bg-hut-card p-8 text-center">
        <h3 className="text-base font-semibold text-gray-900">
          Módulo em desenvolvimento
        </h3>

        <p className="mt-2 text-sm text-gray-500">
          Esta área será implementada nas próximas etapas do projeto.
        </p>
      </section>
    </div>
  )
}
