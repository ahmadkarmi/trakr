import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ClipboardDocumentCheckIcon, ClipboardDocumentListIcon, CameraIcon, CheckCircleIcon, ChartBarIcon, GlobeAltIcon, PlayCircleIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { getSupabase, hasSupabaseEnv } from '../utils/supabaseClient'

const Landing: React.FC = () => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const emailTo = (import.meta as any).env?.VITE_BETA_REQUEST_EMAIL || 'contact@trakr.app'
  const heroSrc = (import.meta as any).env?.VITE_LANDING_HERO_IMAGE || '/LandingPageMockUpHeroSectionTrakr.png'
  const demoVideo = (import.meta as any).env?.VITE_DEMO_VIDEO_URL as string | undefined

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!containerRef.current) return
      const r = containerRef.current.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      setMouse({ x: (e.clientX - cx) / 40, y: (e.clientY - cy) / 40 })
    }
    window.addEventListener('mousemove', h, { passive: true } as any)
    return () => window.removeEventListener('mousemove', h as any)
  }, [])

  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-animate]')) as HTMLElement[]
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('opacity-100', 'translate-y-0')
          e.target.classList.remove('opacity-0', 'translate-y-4')
        }
      })
    }, { threshold: 0.12 })
    els.forEach((el) => {
      el.classList.add('opacity-0', 'translate-y-4', 'transition', 'duration-700')
      obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  const [fullName, setFullName] = useState('')
  const [workEmail, setWorkEmail] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [teamSize, setTeamSize] = useState('1-10')
  const [useCase, setUseCase] = useState('')
  const [submitted, setSubmitted] = useState(false)
  

  const steps = [
    {
      key: 'create',
      title: 'Configure Templates',
      description: 'Build checklists with sections, weights, and critical items.',
      value: 'Set clear standards by location type. Versioned templates keep rollouts controlled and auditable.',
      img: '/Trakr-CreateSurvey.png'
    },
    {
      key: 'answer',
      title: 'Run Audits On Site',
      description: 'Tap friendly flow with multiple question types, photos, notes, and justifications.',
      value: 'Complete audits faster, even offline. Evidence is captured at the section where it belongs.',
      img: '/Trakr-AuditAnswering.png'
    },
    {
      key: 'summary',
      title: 'Score & Report',
      description: 'Instant weighted scores with section breakdowns and trends. Supports N/A.',
      value: 'See risk at a glance and focus the team. Export and share summaries to align managers on next steps.',
      img: '/Trakr-AuditSummary.png'
    },
    {
      key: 'approval',
      title: 'Approve Reviews',
      description: 'Manager sign off with typed or drawn signatures and review notes.',
      value: 'Create accountability and speed up fixes. Approvals and rejections are saved with context.',
      img: '/Trakr-AuditApproval.png'
    },
    {
      key: 'history',
      title: 'Track History',
      description: 'Timeline of submissions, rejections, approvals, and resubmissions.',
      value: 'One source of truth. Prove compliance over time and answer who, when, and why in seconds.',
      img: '/Trakr-AuditHistory.png'
    },
  ]
  const [activeStep, setActiveStep] = useState(0)
  const [backStep, setBackStep] = useState<number | null>(null)
  const [showBack, setShowBack] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [showNumber, setShowNumber] = useState(true)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])
  const stepImages = ['/Trakr-CreateSurvey.png','/Trakr-AuditAnswering.png','/Trakr-AuditSummary.png','/Trakr-AuditApproval.png','/Trakr-AuditHistory.png']
  const stickyRef = useRef<HTMLDivElement>(null)
  const activeStepRef = useRef(0)
  const howRef = useRef<HTMLDivElement>(null)
  const mobileOuterRef = useRef<HTMLDivElement>(null)
  const mobileInnerRef = useRef<HTMLDivElement>(null)
  const [isLg, setIsLg] = useState(false)
  const [tailPad, setTailPad] = useState(0)
  const frontImgRef = useRef<HTMLImageElement>(null)
  const didMountRef = useRef(false)
  useEffect(() => {
    stepImages.forEach(src => { const i = new Image(); i.src = src })
  }, [])
  useEffect(() => { activeStepRef.current = activeStep }, [activeStep])
  useEffect(() => {
    const img = frontImgRef.current
    if (img && img.complete) {
      setImgLoaded(true)
    }
  }, [])
  // Track viewport size to switch behaviors
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = () => setIsLg(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  // Desktop scroll: activate step when card midpoint crosses 50% of sticky image
  useEffect(() => {
    if (!isLg) return
    let raf: number | null = null
    const computeDesktop = () => {
      const stickyEl = stickyRef.current
      if (!stickyEl) return
      const imgRect = stickyEl.getBoundingClientRect()
      const pivotY = imgRect.top + imgRect.height * 0.5
      let idx = 0
      for (let i = 0; i < stepRefs.current.length; i++) {
        const el = stepRefs.current[i]
        if (!el) continue
        const r = el.getBoundingClientRect()
        const mid = r.top + r.height / 2
        if (mid <= pivotY) idx = i
      }
      if (idx !== activeStepRef.current) {
        setBackStep(activeStepRef.current)
        setShowBack(true)
        setImgLoaded(false)
        setActiveStep(idx)
      }
    }
    const onScroll = () => {
      if (raf !== null) return
      raf = requestAnimationFrame(() => { raf = null; computeDesktop() })
    }
    window.addEventListener('scroll', onScroll as any, { passive: true } as any)
    window.addEventListener('resize', onScroll as any, { passive: true } as any)
    computeDesktop()
    return () => {
      window.removeEventListener('scroll', onScroll as any)
      window.removeEventListener('resize', onScroll as any)
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [isLg])
  // Mobile horizontal swipe: set active step from horizontal scroll position
  useEffect(() => {
    if (isLg) return
    let raf: number | null = null
    const outer = mobileOuterRef.current
    const inner = mobileInnerRef.current
    if (!outer || !inner) return
    const computeIdx = () => {
      const scrollLeft = outer.scrollLeft
      let idx = 0
      let best = Number.POSITIVE_INFINITY
      for (let i = 0; i < steps.length; i++) {
        const child = inner.children[i] as HTMLElement
        const d = Math.abs(child.offsetLeft - scrollLeft)
        if (d < best) { best = d; idx = i }
      }
      if (idx !== activeStepRef.current) {
        setBackStep(activeStepRef.current)
        setShowBack(true)
        setImgLoaded(false)
        setActiveStep(idx)
      }
    }
    const onScroll = () => { if (raf !== null) return; raf = requestAnimationFrame(() => { raf = null; computeIdx() }) }
    outer.addEventListener('scroll', onScroll as any, { passive: true } as any)
    window.addEventListener('resize', onScroll as any, { passive: true } as any)
    computeIdx()
    return () => {
      outer.removeEventListener('scroll', onScroll as any)
      window.removeEventListener('resize', onScroll as any)
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [isLg, steps.length])

  // Mobile: adjust trailing spacer so last card can align to the left edge
  useEffect(() => {
    if (isLg) return
    const outer = mobileOuterRef.current
    const inner = mobileInnerRef.current
    if (!outer || !inner) return
    const updatePadding = () => {
      const last = inner.children[inner.children.length - 1] as HTMLElement | undefined
      const tail = last ? Math.max(0, outer.clientWidth - last.offsetWidth) : 0
      setTailPad(tail)
    }
    updatePadding()
    window.addEventListener('resize', updatePadding)
    return () => window.removeEventListener('resize', updatePadding)
  }, [isLg])

  // Animate on step change
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return }
    setImgLoaded(false)
    setShowNumber(false)
    const id = requestAnimationFrame(() => setShowNumber(true))
    return () => cancelAnimationFrame(id)
  }, [activeStep])
  useEffect(() => {
    if (imgLoaded) {
      const t = setTimeout(() => setShowBack(false), 50)
      return () => clearTimeout(t)
    }
  }, [imgLoaded])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !workEmail || !company) {
      toast.error('Please fill in your name, work email, and company')
      return
    }

    // Try Supabase submission first (if configured)
    if (hasSupabaseEnv()) {
      try {
        const supabase = getSupabase()
        const payload = {
          full_name: fullName,
          work_email: workEmail,
          company,
          role: role || null,
          team_size: teamSize,
          use_case: useCase || null,
        }
        const { error } = await supabase.from('beta_requests').insert([payload])
        if (!error) {
          toast.success('Request sent! We\'ll be in touch.')
          setSubmitted(true)
          return
        }
      } catch {}
    }

    // Fallback to mailto if Supabase is not configured or insert fails
    const subject = `Trakr Beta Access Request - ${company}`
    const body = `Name: ${fullName}%0D%0AEmail: ${workEmail}%0D%0ACompany: ${company}%0D%0ARole: ${role || '-'}%0D%0ATeam Size: ${teamSize}%0D%0AUse Case:%0D%0A${encodeURIComponent(useCase || '-')}`
    const mailto = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(subject)}&body=${body}`
    try {
      window.location.href = mailto
      toast.success('Opening your email client...')
      setSubmitted(true)
    } catch {
      navigator.clipboard.writeText(`To: ${emailTo}\nSubject: ${subject}\n\n${decodeURIComponent(body.replace(/%0D%0A/g, '\n'))}`).then(() => {
        toast.success('Details copied. Email us to request access.')
        setSubmitted(true)
      })
    }
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">T</div>
            <span className="text-lg font-semibold tracking-tight">Trakr</span>
          </div>
          <nav className="hidden sm:flex items-center gap-2">
            <a href="#about" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded">About</a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded">How Trakr Works</a>
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded">Features</a>
            <a href="#industries" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded">Industries</a>
            <a href="#beta" aria-label="Request Access to Trakr Private Beta" data-analytics="cta:header_request_access" className="text-sm text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-md font-semibold">Request Access</a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-100 via-cyan-50 to-white" aria-hidden />
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-400/30 blur-3xl" style={{ transform: `translate(${mouse.x}px, ${mouse.y}px)` }} />
        <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-cyan-400/30 blur-3xl" style={{ transform: `translate(${-mouse.x}px, ${-mouse.y}px)` }} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
            <div data-animate>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                Private Beta
                <span className="text-primary-700/70">Join the early access</span>
              </div>
              <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
                Audit and Compliance Software for Multi-Site Teams
                <span className="mt-2 block italic font-light text-3xl sm:text-4xl text-gray-800">Audit. Prove. Resolve.</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg leading-7 text-gray-600 max-w-xl">Run mobile audits, document critical issues, and track corrective actions in one place.</p>
              <div className="mt-2 text-xs text-primary-700/80">Private beta is limited. We onboard a few teams each week.</div>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="#beta"
                  aria-label="Request Access to Trakr Private Beta"
                  data-analytics="cta:hero_request_access"
                  className="inline-flex items-center justify-center rounded-md bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                >
                  Request Access
                </a>
                <a
                  href="#demo"
                  data-analytics="cta:hero_see_demo"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  <PlayCircleIcon className="w-5 h-5 text-primary-600" />
                  <span>Demo Reel</span>
                </a>
              </div>
              <div className="mt-6 flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /><span>Secure by design</span></div>
                <div className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-500" /><span>Fast and accurate</span></div>
              </div>
            </div>
            <div className="relative order-first lg:order-last" data-animate>
              <div className="rounded-2xl w-full h-[300px] sm:h-[420px] lg:h-[600px] xl:h-[680px]">
                <div className="h-full w-full">
                  <img
                    src={heroSrc}
                    srcSet={`${heroSrc} 1024w, ${heroSrc} 1536w, ${heroSrc} 2048w`}
                    alt="Trakr hero"
                    className="h-full w-full object-contain"
                    loading="eager"
                    fetchPriority="high"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-200/60 to-transparent" aria-hidden />

      {demoVideo && (
        <section id="demo" className="relative py-12 sm:py-16 bg-white border-t border-gray-100">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8" data-animate>
            <div className="relative w-full rounded-2xl overflow-hidden bg-gray-900">
              <div className="pt-[56.25%]"></div>
              <iframe
                src={demoVideo}
                title="Trakr demo"
                className="absolute inset-0 w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-b from-transparent to-black/10"></div>
        </section>
      )}

      

      

      <section id="about" className="relative py-14 sm:py-20 border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            <div className="lg:col-span-1" data-animate>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900"><span className="mr-2" aria-hidden>🧭</span>What Is Trakr?</h2>
              <p className="mt-3 text-gray-600">Trakr standardizes audits, captures section level proof, scores compliance, and turns findings into tracked actions across every location.</p>
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6" data-animate>
              <div className="group rounded-xl border border-gray-200 p-6 bg-white shadow-sm transition duration-200 hover:shadow-md hover:border-primary-200 transform-gpu hover:-translate-y-0.5"><div className="h-10 w-10 rounded-md bg-primary-600 text-white grid place-items-center ring-1 ring-primary-500/10 group-hover:ring-primary-300 transition-transform duration-200 group-hover:scale-105"><ClipboardDocumentCheckIcon className="w-5 h-5" /></div><h3 className="mt-3 font-semibold">Audit</h3><p className="mt-2 text-sm text-gray-600">Use consistent checklists by location type.</p></div>
              <div className="group rounded-xl border border-gray-200 p-6 bg-white shadow-sm transition duration-200 hover:shadow-md hover:border-primary-200 transform-gpu hover:-translate-y-0.5"><div className="h-10 w-10 rounded-md bg-primary-600 text-white grid place-items-center ring-1 ring-primary-500/10 group-hover:ring-primary-300 transition-transform duration-200 group-hover:scale-105"><CameraIcon className="w-5 h-5" /></div><h3 className="mt-3 font-semibold">Evidence</h3><p className="mt-2 text-sm text-gray-600">Attach photos and notes at the right section.</p></div>
              <div className="group rounded-xl border border-gray-200 p-6 bg-white shadow-sm transition duration-200 hover:shadow-md hover:border-primary-200 transform-gpu hover:-translate-y-0.5"><div className="h-10 w-10 rounded-md bg-primary-600 text-white grid place-items-center ring-1 ring-primary-500/10 group-hover:ring-primary-300 transition-transform duration-200 group-hover:scale-105"><CheckCircleIcon className="w-5 h-5" /></div><h3 className="mt-3 font-semibold">Actions</h3><p className="mt-2 text-sm text-gray-600">Assign owners and due dates that drive closure.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" ref={howRef} className="relative py-14 sm:py-20 bg-gradient-to-b from-blue-100/60 via-cyan-50/50 to-white border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900" data-animate><span className="mr-2" aria-hidden>⚙️</span>How Trakr Works</h2>
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="hidden lg:block order-2 lg:order-1 lg:col-span-5">
              <div className="space-y-6 pt-6 md:pt-8 pb-[55vh]">
                {steps.map((s, i) => (
                  <div
                    key={s.key}
                    data-index={i}
                    ref={el => (stepRefs.current[i] = el)}
                    className={`min-h-[72vh] md:min-h-[60vh] flex items-end`}
                  >
                    <div className={`w-full rounded-xl border p-6 transform-gpu will-change-transform motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none ${
                      activeStep === i ? 'bg-white border-primary-200 shadow-md scale-[1.01]' : 'bg-white/70 border-gray-200 scale-100'
                    }`}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">{i + 1}. {s.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${activeStep === i ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200' : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'}`}>Step {i + 1} of {steps.length}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">{s.description}</p>
                      <p className="mt-3 text-sm text-gray-700">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2 lg:col-span-7">
              <div className="sticky top-20" ref={stickyRef}>
                <div className="relative w-full">
                  <div className="absolute -top-[6px] -right-2 lg:-right-6 z-0 pointer-events-none select-none">
                    <span
                      key={`step-num-${activeStep}`}
                      className={`inline-block font-extrabold leading-none text-primary-600 text-[52vw] md:text-[30vw] lg:text-[22vw] xl:text-[18vw] transform-gpu will-change-transform will-change-opacity motion-safe:transition-all motion-safe:duration-500 ease-out ${showNumber ? 'opacity-50 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95'}`}
                      aria-hidden
                    >
                      {activeStep + 1}
                    </span>
                  </div>
                  <div className="relative w-full h-[56vh] sm:h-[64vh] lg:h-[76vh] xl:h-[82vh]">
                    {backStep !== null && (
                      <img
                        key={`back-${backStep}`}
                        src={steps[backStep].img}
                        alt=""
                        className={`absolute inset-0 z-10 w-full h-full object-contain motion-safe:transition-opacity motion-safe:duration-500 ease-out ${showBack ? 'opacity-100' : 'opacity-0'}`}
                        aria-hidden
                        decoding="async"
                        loading="eager"
                      />
                    )}
                    <img
                      key={`front-${activeStep}`}
                      ref={frontImgRef}
                      src={steps[activeStep].img}
                      alt={steps[activeStep].title}
                      onLoad={() => setImgLoaded(true)}
                      onError={() => setImgLoaded(true)}
                      className={`absolute inset-0 z-20 w-full h-full object-contain motion-safe:transition-opacity motion-safe:duration-500 ease-out ${didMountRef.current ? (imgLoaded ? 'opacity-100' : 'opacity-0') : 'opacity-100'}`}
                      decoding="async"
                      loading="eager"
                    />
                    {/* Mobile swipe indicator arrows (above scroller, do not scroll) */}
                    <div className="absolute bottom-2 right-0 sm:-right-2 lg:hidden z-30 pointer-events-none flex items-center gap-1">
                      <ChevronLeftIcon className="h-4 w-4 text-gray-500/70" aria-hidden />
                      <ChevronRightIcon className="h-4 w-4 text-gray-500/70" aria-hidden />
                    </div>
                  </div>
                  {/* Mobile horizontal cards under the image (native swipe, scroll-snap) */}
                  <div className="mt-4 relative block lg:hidden overflow-x-auto snap-x snap-mandatory no-scrollbar" ref={mobileOuterRef}>
                    <div ref={mobileInnerRef} className="flex gap-3">
                      {steps.map((s, i) => (
                        <div key={`m-${s.key}`} className={`shrink-0 w-[90%] rounded-xl border p-4 bg-white/90 ${i === activeStep ? 'border-primary-200 shadow-md' : 'border-gray-200'} motion-safe:transition-all snap-start`}>
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold text-gray-900">{i + 1}. {s.title}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${i === activeStep ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200' : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'}`}>Step {i + 1}/{steps.length}</span>
                          </div>
                          <p className="mt-2 text-xs text-gray-600">{s.description}</p>
                          <p className="mt-2 text-xs text-gray-700">{s.value}</p>
                        </div>
                      ))}
                      <div aria-hidden className="shrink-0" style={{ width: tailPad }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative py-14 sm:py-20 border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900" data-animate><span className="mr-2" aria-hidden>🛡️</span>Strengthen Compliance With Trakr</h2>
          <div className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="group rounded-xl border border-gray-200 p-6 bg-white shadow-sm transition duration-200 hover:shadow-md hover:border-primary-200 transform-gpu hover:-translate-y-0.5" data-animate>
              <div className="h-10 w-10 rounded-md bg-primary-600 text-white grid place-items-center ring-1 ring-primary-500/10 group-hover:ring-primary-300 transition-transform duration-200 group-hover:scale-105"><ClipboardDocumentListIcon className="w-5 h-5" /></div>
              <h3 className="mt-3 font-semibold">Standardized Audits and Checklists</h3>
              <p className="mt-2 text-sm text-gray-600">Versioned templates with role guidance for consistent execution.</p>
            </div>
            <div className="group rounded-xl border border-gray-200 p-6 bg-white shadow-sm transition duration-200 hover:shadow-md hover:border-primary-200 transform-gpu hover:-translate-y-0.5" data-animate>
              <div className="h-10 w-10 rounded-md bg-primary-600 text-white grid place-items-center ring-1 ring-primary-500/10 group-hover:ring-primary-300 transition-transform duration-200 group-hover:scale-105"><CameraIcon className="w-5 h-5" /></div>
              <h3 className="mt-3 font-semibold">Section Level Evidence and Photos</h3>
              <p className="mt-2 text-sm text-gray-600">Attach photos and justifications where they matter.</p>
            </div>
            <div className="group rounded-xl border border-gray-200 p-6 bg-white shadow-sm transition duration-200 hover:shadow-md hover:border-primary-200 transform-gpu hover:-translate-y-0.5" data-animate>
              <div className="h-10 w-10 rounded-md bg-primary-600 text-white grid place-items-center ring-1 ring-primary-500/10 group-hover:ring-primary-300 transition-transform duration-200 group-hover:scale-105"><ChartBarIcon className="w-5 h-5" /></div>
              <h3 className="mt-3 font-semibold">Weighted Scoring and Metrics</h3>
              <p className="mt-2 text-sm text-gray-600">Accurate section and overall scores with trend views.</p>
            </div>
            <div className="group rounded-xl border border-gray-200 p-6 bg-white shadow-sm transition duration-200 hover:shadow-md hover:border-primary-200 transform-gpu hover:-translate-y-0.5" data-animate>
              <div className="h-10 w-10 rounded-md bg-primary-600 text-white grid place-items-center ring-1 ring-primary-500/10 group-hover:ring-primary-300 transition-transform duration-200 group-hover:scale-105"><CheckCircleIcon className="w-5 h-5" /></div>
              <h3 className="mt-3 font-semibold">Corrective Actions and Follow Ups</h3>
              <p className="mt-2 text-sm text-gray-600">Owners, due dates, and approvals that unblock locations.</p>
            </div>
            <div className="group rounded-xl border border-gray-200 p-6 bg-white shadow-sm transition duration-200 hover:shadow-md hover:border-primary-200 transform-gpu hover:-translate-y-0.5" data-animate>
              <div className="h-10 w-10 rounded-md bg-primary-600 text-white grid place-items-center ring-1 ring-primary-500/10 group-hover:ring-primary-300 transition-transform duration-200 group-hover:scale-105"><GlobeAltIcon className="w-5 h-5" /></div>
              <h3 className="mt-3 font-semibold">Multi Site Rollups and Benchmarking</h3>
              <p className="mt-2 text-sm text-gray-600">Compare sites, regions, and periods at a glance.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="industries" className="relative py-14 sm:py-20 border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900" data-animate><span className="mr-2" aria-hidden>🏭</span>Who Uses Trakr?</h2>
          <p className="mt-2 text-gray-600">Built for multi site teams in regulated or brand critical operations.</p>
          <div className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-gray-200 p-6 bg-white shadow-sm transition duration-200 hover:shadow-md hover:border-primary-200 transform-gpu hover:-translate-y-0.5" data-animate>
              <h3 className="font-semibold">Retail and QSR</h3>
              <p className="mt-1 text-sm text-gray-600">Brand standards, food safety, and daily ops.</p>
              <ul className="mt-3 text-sm text-gray-600 list-disc pl-5 space-y-1">
                <li>Higher visit coverage</li>
                <li>Fewer critical findings</li>
                <li>Faster fixes</li>
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 p-6 bg-white shadow-sm transition duration-200 hover:shadow-md hover:border-primary-200 transform-gpu hover:-translate-y-0.5" data-animate>
              <h3 className="font-semibold">Facilities and Field Ops</h3>
              <p className="mt-1 text-sm text-gray-600">Safety walks, inspections, and PM programs.</p>
              <ul className="mt-3 text-sm text-gray-600 list-disc pl-5 space-y-1">
                <li>Standardized passes</li>
                <li>Photo proof for vendors</li>
                <li>Clear thresholds</li>
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 p-6 bg-white shadow-sm transition duration-200 hover:shadow-md hover:border-primary-200 transform-gpu hover:-translate-y-0.5" data-animate>
              <h3 className="font-semibold">Financial Services and Banking</h3>
              <p className="mt-1 text-sm text-gray-600">Branch audits, KYC and AML, operational risk.</p>
              <ul className="mt-3 text-sm text-gray-600 list-disc pl-5 space-y-1">
                <li>Evidence history</li>
                <li>Regulatory readiness</li>
                <li>Executive rollups</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="beta" className="relative py-16 sm:py-20 bg-gradient-to-br from-blue-600 to-cyan-500">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-white">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" data-animate><span className="mr-2" aria-hidden>✉️</span>Request Access To The Private Beta</h2>
          <p className="mt-2 text-white/90" data-animate>Tell us about your team and use case. We will reach out with next steps.</p>
          <form onSubmit={onSubmit} className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/10 backdrop-blur rounded-xl p-6 ring-1 ring-white/20" data-animate>
            <div className="sm:col-span-1">
              <label className="block text-sm mb-2">Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-md px-3 py-2 text-gray-900 bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/60" placeholder="Alex Johnson" />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm mb-2">Work email</label>
              <input type="email" value={workEmail} onChange={(e) => setWorkEmail(e.target.value)} className="w-full rounded-md px-3 py-2 text-gray-900 bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/60" placeholder="alex@company.com" />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm mb-2">Company</label>
              <input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full rounded-md px-3 py-2 text-gray-900 bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/60" placeholder="Acme Inc." />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm mb-2">Role</label>
              <input value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-md px-3 py-2 text-gray-900 bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/60" placeholder="Head of Operations" />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm mb-2">Team size</label>
              <select value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className="w-full rounded-md px-3 py-2 text-gray-900 bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/60">
                <option>1-10</option>
                <option>11-50</option>
                <option>51-200</option>
                <option>201-1000</option>
                <option>1000+</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm mb-2">How would you use Trakr?</label>
              <textarea value={useCase} onChange={(e) => setUseCase(e.target.value)} rows={4} className="w-full rounded-md px-3 py-2 text-gray-900 bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/60" placeholder="Briefly describe your primary workflows and goals" />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between gap-3 flex-wrap">
              <button type="submit" className="inline-flex items-center justify-center rounded-md bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50">Send request</button>
              <span className="text-xs text-white/80">No spam. We reply within 1 to 2 business days.</span>
              {submitted && (
                <span role="status" aria-live="polite" className="text-sm text-white/90">Thanks. If your email client did not open, email us at <a className="underline" href={`mailto:${emailTo}`}>{emailTo}</a>.</span>
              )}
            </div>
          </form>
        </div>
      </section>

      <section id="contact" className="relative py-12 sm:py-16 bg-white border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-animate>
            <div className="rounded-xl border border-gray-200 p-6 bg-white shadow-sm transition duration-200 hover:shadow-md hover:border-primary-200 transform-gpu hover:-translate-y-0.5">
              <h3 className="font-semibold">Contact</h3>
              <p className="mt-2 text-sm text-gray-600">Email us at</p>
              <a className="mt-1 inline-block text-blue-700 hover:underline" href={`mailto:${emailTo}`}>{emailTo}</a>
            </div>
            <div className="rounded-xl border border-gray-200 p-6 bg-white shadow-sm transition duration-200 hover:shadow-md hover:border-primary-200 transform-gpu hover:-translate-y-0.5">
              <h3 className="font-semibold">Availability</h3>
              <p className="mt-2 text-sm text-gray-600">Private beta with rolling invites each week.</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-6 bg-white shadow-sm transition duration-200 hover:shadow-md hover:border-primary-200 transform-gpu hover:-translate-y-0.5">
              <h3 className="font-semibold">Follow</h3>
              <p className="mt-2 text-sm text-gray-600">Product updates are coming soon.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white/80 backdrop-blur border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">T</div>
            <span className="font-semibold text-gray-900">Trakr</span>
            <span className="hidden sm:inline text-sm text-gray-500">© {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <nav className="flex items-center gap-2">
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded">How Trakr Works</a>
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded">Features</a>
            <a href="#industries" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded">Industries</a>
            <a href="#beta" className="text-sm text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-md font-semibold">Request Access</a>
            <a href="/login" className="text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md font-medium">Login</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}

export default Landing
