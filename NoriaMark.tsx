import { Container } from '@/components/layout/Container'

const stats = [
  { value: '5,000+', label: 'Cases Handled' },
  { value: '47', label: 'Countries Covered' },
  { value: '98%', label: 'Success Rate' },
  { value: '10+', label: 'Years Experience' },
]

export function Stats() {
  return (
    <section className="py-10 bg-surface border-y border-border">
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-border">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center px-6 py-2">
              <div className="text-h2 font-extrabold text-primary">{stat.value}</div>
              <div className="text-caption text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

export default Stats
