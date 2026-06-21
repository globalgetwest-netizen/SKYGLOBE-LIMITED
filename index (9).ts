import type { Metadata } from 'next'
import Container from '@/components/layout/Container'
import Services from '@/components/sections/Services'
import CTA from '@/components/sections/CTA'
import {
  GraduationCap, Plane, Briefcase, Users, Globe, CalendarDays, Check
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Services | SkyGlobe Group',
  description: 'Explore SkyGlobe Group\'s comprehensive global mobility services.',
}

const serviceDetails = [
  {
    id: 'study',
    icon: GraduationCap,
    title: 'Study Abroad',
    description: 'We partner with over 300 universities and colleges across Europe, North America, Asia, and Australia. Our advisors match your academic profile with the right institution, handle your application, and process your student visa end-to-end.',
    points: ['University shortlisting & application', 'Student visa processing', 'Scholarship identification', 'Pre-departure briefing & SIM card', 'Airport reception in destination'],
  },
  {
    id: 'visit',
    icon: Plane,
    title: 'Visit Visas',
    description: 'Tourist, business, and family visit visas processed with precision. Our 98% approval rate speaks for itself. We prepare every document to embassy standards and submit on your behalf.',
    points: ['Tourist & business visit visas', 'Family reunion travel', 'Medical visit visas', 'Document preparation & submission', 'Embassy appointment booking'],
  },
  {
    id: 'work',
    icon: Briefcase,
    title: 'Work Permits',
    description: 'Skilled professionals ready to work abroad can rely on our work permit service. We assess your eligibility, identify the right permit category, and manage the full application lifecycle.',
    points: ['Eligibility assessment', 'Permit category identification', 'Employer letter coordination', 'Full application management', 'Permit renewal support'],
  },
  {
    id: 'immigration',
    icon: Globe,
    title: 'Immigration Support',
    description: 'Long-term immigration solutions including permanent residency applications, citizenship by naturalisation, and family reunification across 47 countries.',
    points: ['Permanent residency applications', 'Citizenship & naturalisation', 'Family reunification', 'Refugee & asylum guidance', 'Appeal representation'],
  },
  {
    id: 'conferences',
    icon: CalendarDays,
    title: 'Conference & Event Visas',
    description: 'Delegations and professional travellers rely on us for swift, accurate conference visa processing. We handle group applications with dedicated liaison at embassies.',
    points: ['Group visa applications', 'Embassy liaison services', 'Invitation letter processing', 'Itinerary documentation', 'Last-minute emergency processing'],
  },
]

export default function ServicesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[#F8F9FA] py-20 border-b border-[#DADCE0]">
        <Container>
          <div className="max-w-2xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#1A3A8F]/10 text-[#1A3A8F] text-sm font-semibold mb-6">
              Our Services
            </span>
            <h1 className="text-[48px] leading-[56px] font-extrabold text-[#202124] mb-5">
              Everything You Need to Move Globally
            </h1>
            <p className="text-[16px] leading-[28px] text-[#5F6368]">
              From a single tourist visa to a complete EU employment relocation — SkyGlobe
              handles it all with precision and care.
            </p>
          </div>
        </Container>
      </section>

      {/* Overview cards */}
      <Services />

      {/* Detailed sections */}
      {serviceDetails.map(({ id, icon: Icon, title, description, points }, i) => (
        <section
          key={id}
          id={id}
          className={`py-20 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F8F9FA]'}`}
        >
          <Container>
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className={i % 2 !== 0 ? 'lg:order-2' : ''}>
                <div className="w-16 h-16 rounded-2xl bg-[#1A3A8F]/10 flex items-center justify-center mb-6">
                  <Icon size={30} className="text-[#1A3A8F]" />
                </div>
                <h2 className="text-[28px] leading-[36px] font-extrabold text-[#202124] mb-4">
                  {title}
                </h2>
                <p className="text-[16px] leading-[28px] text-[#5F6368] mb-6">{description}</p>
                <ul className="space-y-3">
                  {points.map((p) => (
                    <li key={p} className="flex items-center gap-2.5">
                      <Check size={16} className="text-[#1A3A8F] flex-shrink-0" />
                      <span className="text-sm text-[#202124]">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`bg-[#1A3A8F]/5 rounded-[24px] h-64 flex items-center justify-center ${i % 2 !== 0 ? 'lg:order-1' : ''}`}>
                <Icon size={80} className="text-[#1A3A8F] opacity-20" />
              </div>
            </div>
          </Container>
        </section>
      ))}

      <CTA />
    </>
  )
}
