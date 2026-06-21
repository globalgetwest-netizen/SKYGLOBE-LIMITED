'use client'
import { useForm } from 'react-hook-form'
import { Mail, Phone, MapPin } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface ContactForm {
  name: string
  email: string
  phone: string
  service: string
  message: string
}

const contactInfo = [
  { icon: Mail, label: 'Email', value: 'info@skyglobegroup.com' },
  { icon: Phone, label: 'Phone', value: '+1 (800) SKYGLOBE' },
  { icon: MapPin, label: 'Office', value: 'London · Lagos · Dubai' },
]

const services = ['Study Abroad', 'Work Permit', 'Visit Visa', 'EU Employment', 'Immigration Support', 'Conferences', 'Other']

export function Contact() {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactForm>()

  function onSubmit(data: ContactForm) {
    console.log(data)
    reset()
    alert('Message sent! We will get back to you within 24 hours.')
  }

  return (
    <section className="py-20 bg-white">
      <Container>
        <div className="text-center mb-12">
          <span className="text-caption font-semibold uppercase tracking-widest text-primary">Contact</span>
          <h2 className="text-h2 font-bold text-text mt-2">Get in Touch</h2>
          <p className="text-body text-gray-500 mt-3">We respond within 24 hours, every day.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact cards */}
          <div className="flex flex-col gap-5">
            {contactInfo.map((c) => (
              <div key={c.label} className="flex items-center gap-4 p-5 bg-surface border border-border rounded-card shadow-card">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <c.icon size={22} className="text-primary" />
                </div>
                <div>
                  <div className="text-caption font-semibold text-gray-500">{c.label}</div>
                  <div className="text-body font-medium text-text">{c.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Full Name"
              id="name"
              placeholder="Your full name"
              error={errors.name?.message}
              {...register('name', { required: 'Name is required' })}
            />
            <Input
              label="Email"
              id="email"
              type="email"
              placeholder="your@email.com"
              error={errors.email?.message}
              {...register('email', { required: 'Email is required' })}
            />
            <Input
              label="Phone"
              id="phone"
              type="tel"
              placeholder="+1 234 567 8900"
              {...register('phone')}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="service" className="text-caption font-semibold text-text">Service</label>
              <select
                id="service"
                {...register('service', { required: 'Please select a service' })}
                className="w-full rounded-pill border border-border bg-white px-5 py-3 text-body text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">Select a service…</option>
                {services.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="message" className="text-caption font-semibold text-text">Message</label>
              <textarea
                id="message"
                rows={4}
                placeholder="Tell us about your situation…"
                {...register('message', { required: 'Message is required' })}
                className="w-full rounded-2xl border border-border bg-white px-5 py-3 text-body text-text placeholder:text-gray-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              />
            </div>
            <Button type="submit" variant="primary" size="lg" className="mt-2">Send Message</Button>
          </form>
        </div>
      </Container>
    </section>
  )
}

export default Contact
